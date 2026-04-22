import db from "../db/connection.js";

function upsertPersonEvent(familyId, personId, date, title) {
    if (!date) return;
    const existing = db
        .prepare("SELECT id FROM events WHERE family_id = ? AND person_id = ? AND title = ?")
        .get(familyId, personId, title);
    if (existing) {
        db.prepare("UPDATE events SET date = ? WHERE id = ?").run(date, existing.id);
    } else {
        db.prepare("INSERT INTO events (family_id, title, date, person_id) VALUES (?, ?, ?, ?)")
            .run(familyId, title, date, personId);
    }
}

function deletePersonEvent(familyId, personId, title) {
    db.prepare("DELETE FROM events WHERE family_id = ? AND person_id = ? AND title = ?")
        .run(familyId, personId, title);
}

export function registerSocketHandlers(io) {
    io.on("connection", (socket) => {
        const user = socket.request.session?.user;

        socket.on("join-family", (familyId) => {
            socket.join(`family-${familyId}`);
        });

        socket.on("tree:add-person", (data) => {
            if (!user) return;
            const { name, birth_date, death_date, bio } = data;
            const familyId = user.family_id;

            try {
                const result = db
                    .prepare("INSERT INTO persons (family_id, name, birth_date, death_date, bio) VALUES (?, ?, ?, ?, ?)")
                    .run(familyId, name, birth_date || null, death_date || null, bio || null);

                const personId = result.lastInsertRowid;

                if (birth_date) upsertPersonEvent(familyId, personId, birth_date, `🎂 ${name}s fødselsdag`);
                if (death_date) upsertPersonEvent(familyId, personId, death_date, `🕯️ ${name}s dødsdag`);

                const person = { id: personId, family_id: familyId, name, birth_date, death_date, bio };
                io.to(`family-${familyId}`).emit("tree:person-added", { person });
            } catch {
                socket.emit("tree:error", { message: "Kunne ikke tilføje person." });
            }
        });

        socket.on("tree:update-person", (data) => {
            if (!user) return;
            const { id, name, birth_date, death_date, bio } = data;
            const familyId = user.family_id;

            try {
                const existing = db
                    .prepare("SELECT * FROM persons WHERE id = ? AND family_id = ?")
                    .get(id, familyId);

                if (!existing) return socket.emit("tree:error", { message: "Person ikke fundet." });

                db.prepare("UPDATE persons SET name = ?, birth_date = ?, death_date = ?, bio = ? WHERE id = ? AND family_id = ?")
                    .run(name, birth_date || null, death_date || null, bio || null, id, familyId);

                if (birth_date) {
                    if (existing.name !== name) deletePersonEvent(familyId, id, `🎂 ${existing.name}s fødselsdag`);
                    upsertPersonEvent(familyId, id, birth_date, `🎂 ${name}s fødselsdag`);
                } else {
                    deletePersonEvent(familyId, id, `🎂 ${existing.name}s fødselsdag`);
                }

                if (death_date) {
                    if (existing.name !== name) deletePersonEvent(familyId, id, `🕯️ ${existing.name}s dødsdag`);
                    upsertPersonEvent(familyId, id, death_date, `🕯️ ${name}s dødsdag`);
                } else {
                    deletePersonEvent(familyId, id, `🕯️ ${existing.name}s dødsdag`);
                }

                const person = { id, family_id: familyId, name, birth_date, death_date, bio };
                io.to(`family-${familyId}`).emit("tree:person-updated", { person });
            } catch {
                socket.emit("tree:error", { message: "Kunne ikke opdatere person." });
            }
        });

        socket.on("tree:delete-person", (data) => {
            if (!user) return;
            const { personId } = data;
            const familyId = user.family_id;

            try {
                db.prepare("DELETE FROM relationships WHERE person_id = ? OR related_person_id = ?")
                    .run(personId, personId);
                db.prepare("DELETE FROM events WHERE person_id = ? AND family_id = ?")
                    .run(personId, familyId);
                db.prepare("DELETE FROM persons WHERE id = ? AND family_id = ?")
                    .run(personId, familyId);

                io.to(`family-${familyId}`).emit("tree:person-deleted", { personId });
            } catch {
                socket.emit("tree:error", { message: "Kunne ikke slette person." });
            }
        });

        socket.on("tree:add-relation", (data) => {
            if (!user) return;
            const { person_id, related_person_id, type } = data;
            const familyId = user.family_id;

            try {
                const result = db
                    .prepare("INSERT INTO relationships (person_id, related_person_id, type) VALUES (?, ?, ?)")
                    .run(person_id, related_person_id, type);

                io.to(`family-${familyId}`).emit("tree:relation-added", {
                    relationship: { id: result.lastInsertRowid, person_id, related_person_id, type },
                });
            } catch {
                socket.emit("tree:error", { message: "Kunne ikke tilføje relation." });
            }
        });

        socket.on("calendar:add-event", (data) => {
            if (!user) return;
            const { title, date, description, person_id } = data;
            const familyId = user.family_id;

            try {
                const result = db
                    .prepare("INSERT INTO events (family_id, title, date, description, person_id) VALUES (?, ?, ?, ?, ?)")
                    .run(familyId, title, date, description || null, person_id || null);

                const event = { id: result.lastInsertRowid, family_id: familyId, title, date, description, person_id };
                io.to(`family-${familyId}`).emit("calendar:event-added", { event });
            } catch {
                socket.emit("tree:error", { message: "Kunne ikke tilføje event." });
            }
        });

        socket.on("calendar:delete-event", (data) => {
            if (!user) return;
            const { eventId } = data;
            const familyId = user.family_id;

            try {
                db.prepare("DELETE FROM events WHERE id = ? AND family_id = ?")
                    .run(eventId, familyId);

                io.to(`family-${familyId}`).emit("calendar:event-deleted", { eventId });
            } catch {
                socket.emit("tree:error", { message: "Kunne ikke slette event." });
            }
        });
    });
}
