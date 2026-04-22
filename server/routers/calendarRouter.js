import Router from "express";
import db from "../db/connection.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = Router();

// GET /api/calendar
router.get("/", isAuthenticated, (req, res) => {
    const familyId = req.session.user.family_id;

    if (!familyId) {
        return res.status(400).json({ message: "Du er ikke i en familie." });
    }

    try {
        const events = db
            .prepare("SELECT * FROM events WHERE family_id = ? ORDER BY date ASC")
            .all(familyId);

        return res.json({ events });
    } catch (error) {
        return res.status(500).json({ message: "Der skete en fejl." });
    }
});

// POST /api/calendar
router.post("/", isAuthenticated, (req, res) => {
    const { title, date, description, person_id } = req.body;
    const familyId = req.session.user.family_id;

    if (!title || !date) {
        return res.status(400).json({ message: "Titel og dato er påkrævet." });
    }

    try {
        const result = db
            .prepare("INSERT INTO events (family_id, title, date, description, person_id) VALUES (?, ?, ?, ?, ?)")
            .run(familyId, title, date, description || null, person_id || null);

        const event = { id: result.lastInsertRowid, family_id: familyId, title, date, description, person_id };
        return res.status(201).json({ message: "Event oprettet.", event });
    } catch (error) {
        return res.status(500).json({ message: "Der skete en fejl." });
    }
});

// DELETE /api/calendar/:id
router.delete("/:id", isAuthenticated, (req, res) => {
    const familyId = req.session.user.family_id;

    try {
        db.prepare("DELETE FROM events WHERE id = ? AND family_id = ?")
            .run(req.params.id, familyId);

        return res.json({ message: "Event slettet." });
    } catch (error) {
        return res.status(500).json({ message: "Der skete en fejl." });
    }
});

export default router;
