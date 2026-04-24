import express from "express";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import { setupDb } from "./db/setupDb.js";
import { registerSocketHandlers } from "./sockets/socketHandlers.js";
import authRouter from "./routers/authRouter.js";
import familyRouter from "./routers/familyRouter.js";
import calendarRouter from "./routers/calendarRouter.js";

dotenv.config();
setupDb();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "http://localhost:5173", credentials: true },
});

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
});

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);

app.use("/api/auth", authRouter);
app.use("/api/family", familyRouter);
app.use("/api/calendar", calendarRouter);

registerSocketHandlers(io);

httpServer.listen(process.env.PORT, () => {
    console.log(`Server kører på port ${process.env.PORT}`);
});
