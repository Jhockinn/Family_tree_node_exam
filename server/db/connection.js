import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, "familytree.db"));

// Slår foreign keys til (er slået fra som standard i SQLite)
db.pragma("foreign_keys = ON");

export default db;
