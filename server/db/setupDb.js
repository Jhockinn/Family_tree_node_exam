import db from "./connection.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupDb() {
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
    db.exec(schema);
}
