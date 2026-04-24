export function registerSocketHandlers(io) {
    io.on("connection", (socket) => {

        socket.on("join-family", (familyId) => {
            socket.join(`family-${familyId}`);
        });

        socket.on("tree:add-person", (data) => {
            io.to(`family-${data.familyId}`).emit("tree:person-added", data);
        });

        socket.on("tree:update-person", (data) => {
            io.to(`family-${data.familyId}`).emit("tree:person-updated", data);
        });

        socket.on("tree:delete-person", (data) => {
            io.to(`family-${data.familyId}`).emit("tree:person-deleted", data);
        });

        socket.on("tree:add-relation", (data) => {
            io.to(`family-${data.familyId}`).emit("tree:relation-added", data);
        });

        socket.on("calendar:add-event", (data) => {
            io.to(`family-${data.familyId}`).emit("calendar:event-added", data);
        });

        socket.on("calendar:delete-event", (data) => {
            io.to(`family-${data.familyId}`).emit("calendar:event-deleted", data);
        });
    });
}
