import Router from "express";
import db from "../db/connection.js";
import { isAuthenticated } from "../middleware/auth.js";
import crypto from "crypto";

const router = Router();

// Hjælpefunktion: opret eller opdater et kalender event for en person
function upsertPersonEvent(familyId, personId, date, title) {
    if (!date) return;

    const existing = db
        .prepare("SELECT id FROM events WHERE family_id = ? AND person_id = ? AND title = ?")
        .get(familyId, personId, title);

    if (existing) {
        db.prepare("UPDATE events SET date = ? WHERE id = ?").run(date, existing.id);
    } else {
        db.prepare(
            "INSERT INTO events (family_id, title, date, person_id) VALUES (?, ?, ?, ?)"
        ).run(familyId, title, date, personId);
    }
}

// Hjælpefunktion: slet kalender event for en person
function deletePersonEvent(familyId, personId, title) {
    db.prepare(
        "DELETE FROM events WHERE family_id = ? AND person_id = ? AND title = ?"
    ).run(familyId, personId, title);
}

// POST /api/family/create
router.post("/create", isAuthenticated, (req, res) => {
    const { name } = req.body;
    const userId = req.session.user.id;

    if (!name) {
        return res.status(400).json({ message: "Familienavn er påkrævet." });
    }

    try {
        const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();

        const familyResult = db
            .prepare("INSERT INTO families (name, invite_code) VALUES (?, ?)")
            .run(name, inviteCode);

        const familyId = familyResult.lastInsertRowid;

        db.prepare("UPDATE users SET family_id = ?, role = 'admin' WHERE id = ?").run(familyId, userId);

        req.session.user.family_id = familyId;
        req.session.user.role = "admin";

        return res.status(201).json({ message: "Familie oprettet.", familyId, inviteCode });
    } catch (error) {
        return res.status(500).json({ message: "Der skete en fejl." });
    }
});

// POST /api/family/join
router.post("/join", isAuthenticated, (req, res) => {
    const { inviteCode } = req.body;
    const userId = req.session.user.id;

    if (!inviteCode) {
        return res.status(400).json({ message: "Invite kode er påkrævet." });
    }

    try {
        const family = db
            .prepare("SELECT * FROM families WHERE invite_code = ?")
            .get(inviteCode.toUpperCase());

        if (!family) {
            return res.status(404).json({ message: "Ugyldig invite kode." });
        }

        db.prepare("UPDATE users SET family_id = ?, role = 'member' WHERE id = ?").run(family.id, userId);

        req.session.user.family_id = family.id;
        req.session.user.role = "member";

        return res.json({ message: "Du er nu en del af familien.", familyId: family.id });
    } catch (error) {
        return res.status(500).json({ message: "Der skete en fejl." });
    }
});

// GET /api/family/persons
router.get("/persons", isAuthenticated, (req, res) => {
    const familyId = req.session.user.family_id;

    if (!familyId) {
        return res.status(400).json({ message: "Du er ikke i en familie." });
    }

    try {
        const persons = db
            .prepare("SELECT * FROM persons WHERE family_id = ?")
            .all(familyId);

        const relationships = db
            .prepare(`SELECT r.* FROM relationships r
                      JOIN persons p ON r.person_id = p.id
                      WHERE p.family_id = ?`)
            .all(familyId);

        return res.json({ persons, relationships });
    } catch (error) {
        return res.status(500).json({ message: "Der skete en fejl." });
    }
});

// POST /api/family/persons
router.post("/persons", isAuthenticated, (req, res) => {
    const { name, birth_date, death_date, bio } = req.body;
    const familyId = req.session.user.family_id;

    if (!familyId) {
        return res.status(400).json({ message: "Du er ikke i en familie." });
    }

    if (!name) {
        return res.status(400).json({ message: "Navn er påkrævet." });
    }

    try {
        const result = db
            .prepare("INSERT INTO persons (family_id, name, birth_date, death_date, bio) VALUES (?, ?, ?, ?, ?)")
            .run(familyId, name, birth_date || null, death_date || null, bio || null);

        const personId = result.lastInsertRowid;

        // Opret automatisk kalenderevents for fødselsdato og dødsdato
        if (birth_date) {
            upsertPersonEvent(familyId, personId, birth_date, `🎂 ${name}s fødselsdag`);
        }
        if (death_date) {
            upsertPersonEvent(familyId, personId, death_date, `🕯️ ${name}s dødsdag`);
        }

        const person = { id: personId, family_id: familyId, name, birth_date, death_date, bio };
        return res.status(201).json({ message: "Person tilføjet.", person });
    } catch (error) {
        return res.status(500).json({ message: "Der skete en fejl." });
    }
});

// PUT /api/family/persons/:id
router.put("/persons/:id", isAuthenticated, (req, res) => {
    const { name, birth_date, death_date, bio } = req.body;
    const familyId = req.session.user.family_id;
    const personId = Number(req.params.id);

    try {
        // Hent eksisterende person til at håndtere navneændringer
        const existing = db
            .prepare("SELECT * FROM persons WHERE id = ? AND family_id = ?")
            .get(personId, familyId);

        if (!existing) {
            return res.status(404).json({ message: "Person ikke fundet." });
        }

        db.prepare(
            "UPDATE persons SET name = ?, birth_date = ?, death_date = ?, bio = ? WHERE id = ? AND family_id = ?"
        ).run(name, birth_date || null, death_date || null, bio || null, personId, familyId);

        // Opdater fødselsdato event
        if (birth_date) {
            // Slet gammelt event hvis navnet er ændret
            if (existing.name !== name) {
                deletePersonEvent(familyId, personId, `🎂 ${existing.name}s fødselsdag`);
            }
            upsertPersonEvent(familyId, personId, birth_date, `🎂 ${name}s fødselsdag`);
        } else {
            deletePersonEvent(familyId, personId, `🎂 ${existing.name}s fødselsdag`);
        }

        // Opdater dødsdato event
        if (death_date) {
            if (existing.name !== name) {
                deletePersonEvent(familyId, personId, `🕯️ ${existing.name}s dødsdag`);
            }
            upsertPersonEvent(familyId, personId, death_date, `🕯️ ${name}s dødsdag`);
        } else {
            deletePersonEvent(familyId, personId, `🕯️ ${existing.name}s dødsdag`);
        }

        return res.json({ message: "Person opdateret." });
    } catch (error) {
        return res.status(500).json({ message: "Der skete en fejl." });
    }
});

// DELETE /api/family/persons/:id
router.delete("/persons/:id", isAuthenticated, (req, res) => {
    const familyId = req.session.user.family_id;

    try {
        db.prepare("DELETE FROM relationships WHERE person_id = ? OR related_person_id = ?")
            .run(req.params.id, req.params.id);

        // Kalenderevents med person_id slettes automatisk via CASCADE ikke sat op,
        // så vi sletter dem manuelt her
        db.prepare("DELETE FROM events WHERE person_id = ? AND family_id = ?")
            .run(req.params.id, familyId);

        db.prepare("DELETE FROM persons WHERE id = ? AND family_id = ?")
            .run(req.params.id, familyId);

        return res.json({ message: "Person slettet." });
    } catch (error) {
        return res.status(500).json({ message: "Der skete en fejl." });
    }
});

// POST /api/family/relationships
router.post("/relationships", isAuthenticated, (req, res) => {
    const { person_id, related_person_id, type } = req.body;

    if (!person_id || !related_person_id || !type) {
        return res.status(400).json({ message: "Alle felter er påkrævet." });
    }

    try {
        const result = db
            .prepare("INSERT INTO relationships (person_id, related_person_id, type) VALUES (?, ?, ?)")
            .run(person_id, related_person_id, type);

        return res.status(201).json({ message: "Relation tilføjet.", id: result.lastInsertRowid });
    } catch (error) {
        return res.status(500).json({ message: "Der skete en fejl." });
    }
});

export default router;
