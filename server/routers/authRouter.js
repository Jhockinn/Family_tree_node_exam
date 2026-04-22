import Router from "express";
import bcrypt from "bcrypt";
import db from "../db/connection.js";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "Alle felter skal udfyldes." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);

        const result = db
            .prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)")
            .run(username, email, hashedPassword);

        req.session.user = {
            id: result.lastInsertRowid,
            username,
            email,
            role: "member",
            family_id: null,
        };

        return res.status(201).json({ message: "Bruger oprettet.", user: req.session.user });
    } catch (error) {
        if (error.message.includes("UNIQUE")) {
            return res.status(409).json({ message: "Brugernavn eller email er allerede i brug." });
        }
        return res.status(500).json({ message: "Der skete en fejl." });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email og adgangskode er påkrævet." });
    }

    try {
        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

        if (!user) {
            return res.status(401).json({ message: "Forkert email eller adgangskode." });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ message: "Forkert email eller adgangskode." });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            family_id: user.family_id,
        };

        return res.json({ message: "Logget ind.", user: req.session.user });
    } catch (error) {
        return res.status(500).json({ message: "Der skete en fejl." });
    }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: "Kunne ikke logge ud." });
        res.clearCookie("connect.sid");
        return res.json({ message: "Logget ud." });
    });
});

// GET /api/auth/me
router.get("/me", (req, res) => {
    if (req.session.user) {
        return res.json({ user: req.session.user });
    }
    return res.status(401).json({ message: "Ikke logget ind." });
});

export default router;
