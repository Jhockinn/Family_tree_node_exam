import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, "db", "familytree.db"));
db.pragma("foreign_keys = ON");

console.log("🌱 Sletter eksisterende data...");
db.exec(`
    DELETE FROM events;
    DELETE FROM relationships;
    DELETE FROM persons;
    DELETE FROM users;
    DELETE FROM families;
`);

console.log("🏡 Opretter familie...");
const family = db
    .prepare("INSERT INTO families (name, invite_code) VALUES (?, ?)")
    .run("Familie Hansen", "DEMO1234");

const familyId = family.lastInsertRowid;

console.log("👤 Opretter brugere...");
const password = await bcrypt.hash("demo1234", 12);

const user1 = db
    .prepare("INSERT INTO users (username, email, password, family_id, role) VALUES (?, ?, ?, ?, ?)")
    .run("tobias", "tobias@demo.dk", password, familyId, "admin");

db.prepare("INSERT INTO users (username, email, password, family_id, role) VALUES (?, ?, ?, ?, ?)")
    .run("gæst", "gaest@demo.dk", password, familyId, "member");

console.log("🌳 Opretter personer...");

const insertPerson = db.prepare(
    "INSERT INTO persons (family_id, name, birth_date, death_date, bio) VALUES (?, ?, ?, ?, ?)"
);

// Generation 1 — bedsteforældre
const olfar = insertPerson.run(familyId, "Ole Hansen",      "1935-06-12", "2010-03-04", "Smed i Odense. Elskede at fiske og fortælle historier om gamle dage.").lastInsertRowid;
const olmar = insertPerson.run(familyId, "Mette Hansen",    "1938-09-22", "2015-11-18", "Hjemmegående og dygtig kok. Bagte verdens bedste æblekage.").lastInsertRowid;
const morfar = insertPerson.run(familyId, "Jens Larsen",    "1932-03-08", "2005-07-14", "Landmand fra Jutland. Drev en lille gård i 40 år.").lastInsertRowid;
const mormor = insertPerson.run(familyId, "Karen Larsen",   "1936-12-01", null,         "Pensioneret lærer. Læser stadig en bog om dagen.").lastInsertRowid;

// Generation 2 — forældre
const far  = insertPerson.run(familyId, "Henrik Hansen",    "1962-04-17", null, "Ingeniør hos Novo Nordisk. Passioneret cyklist.").lastInsertRowid;
const mor  = insertPerson.run(familyId, "Lise Hansen",      "1965-08-30", null, "Pædagog i 30 år. Elsker havearbejde og keramik.").lastInsertRowid;
const onkel = insertPerson.run(familyId, "Peter Hansen",    "1964-01-25", null, "Bror til Henrik. Bor i Aarhus og arbejder som læge.").lastInsertRowid;
const tante = insertPerson.run(familyId, "Sofie Møller",    "1966-07-11", null, "Gift med Peter. Arkitekt med eget tegnestue.").lastInsertRowid;

// Generation 3 — stammen og søskende
const tobias  = insertPerson.run(familyId, "Tobias Hansen",  "1998-02-14", null, "IT-studerende på KEA. Glad for spiludvikling og kaffe.").lastInsertRowid;
const soester = insertPerson.run(familyId, "Emma Hansen",    "2001-05-03", null, "Studerer medicin i København.").lastInsertRowid;
const kusine  = insertPerson.run(familyId, "Nora Hansen",    "1995-10-19", null, "Datter af Peter og Sofie. Designer hos Bang & Olufsen.").lastInsertRowid;

// Generation 4 — børn (til demo)
const barn1 = insertPerson.run(familyId, "Lucas Hansen",    "2025-03-01", null, "Tobias' søn. Fremtidens familieoverhovede.").lastInsertRowid;

console.log("🔗 Opretter relationer...");

const insertRel = db.prepare(
    "INSERT INTO relationships (person_id, related_person_id, type) VALUES (?, ?, ?)"
);

// Farmor/farfar er forældre til Far og Onkel
insertRel.run(olfar,  far,    "parent");
insertRel.run(olfar,  onkel,  "parent");
insertRel.run(olmar,  far,    "parent");
insertRel.run(olmar,  onkel,  "parent");

// Morfar/mormor er forældre til Mor
insertRel.run(morfar, mor, "parent");
insertRel.run(mormor, mor, "parent");

// Far og Mor er forældre til Tobias og Emma
insertRel.run(far, tobias,  "parent");
insertRel.run(far, soester, "parent");
insertRel.run(mor, tobias,  "parent");
insertRel.run(mor, soester, "parent");

// Peter og Sofie er forældre til Nora
insertRel.run(onkel, kusine, "parent");
insertRel.run(tante, kusine, "parent");

// Ægtefæller
insertRel.run(olfar,  olmar,  "spouse");
insertRel.run(morfar, mormor, "spouse");
insertRel.run(far,    mor,    "spouse");
insertRel.run(onkel,  tante,  "spouse");

// Søskende
insertRel.run(tobias,  soester, "sibling");
insertRel.run(far,     onkel,   "sibling");

// Tobias er forælder til Lucas
insertRel.run(tobias, barn1, "parent");

console.log("📅 Opretter kalenderevents...");

const insertEvent = db.prepare(
    "INSERT INTO events (family_id, title, date, description, person_id) VALUES (?, ?, ?, ?, ?)"
);

// Fødselsdage fra personer
insertEvent.run(familyId, "🎂 Ole Hansens fødselsdag",    "1935-06-12", null, olfar);
insertEvent.run(familyId, "🕯️ Ole Hansens dødsdag",       "2010-03-04", null, olfar);
insertEvent.run(familyId, "🎂 Mette Hansens fødselsdag",  "1938-09-22", null, olmar);
insertEvent.run(familyId, "🕯️ Mette Hansens dødsdag",     "2015-11-18", null, olmar);
insertEvent.run(familyId, "🎂 Jens Larsens fødselsdag",   "1932-03-08", null, morfar);
insertEvent.run(familyId, "🕯️ Jens Larsens dødsdag",      "2005-07-14", null, morfar);
insertEvent.run(familyId, "🎂 Karen Larsens fødselsdag",  "1936-12-01", null, mormor);
insertEvent.run(familyId, "🎂 Henrik Hansens fødselsdag", "1962-04-17", null, far);
insertEvent.run(familyId, "🎂 Lise Hansens fødselsdag",   "1965-08-30", null, mor);
insertEvent.run(familyId, "🎂 Peter Hansens fødselsdag",  "1964-01-25", null, onkel);
insertEvent.run(familyId, "🎂 Sofie Møllers fødselsdag",  "1966-07-11", null, tante);
insertEvent.run(familyId, "🎂 Tobias Hansens fødselsdag", "1998-02-14", null, tobias);
insertEvent.run(familyId, "🎂 Emma Hansens fødselsdag",   "2001-05-03", null, soester);
insertEvent.run(familyId, "🎂 Nora Hansens fødselsdag",   "1995-10-19", null, kusine);
insertEvent.run(familyId, "🎂 Lucas Hansens fødselsdag",  "2025-03-01", null, barn1);

// Ekstra familieevents
insertEvent.run(familyId, "🎊 Familien Hansens sommertræf", "2026-07-15", "Årligt sommertræf hos Henrik og Lise i Odense.", null);
insertEvent.run(familyId, "💍 Henrik og Lises bryllupsdag",  "1990-06-08", "Sølvbryllup fejres i 2015.", far);
insertEvent.run(familyId, "🎓 Tobias dimission fra KEA",     "2026-06-20", "Kandidatafslutning efter praktik.", tobias);

console.log("\n✅ Dummy data indsat!\n");
console.log("📋 Login oplysninger:");
console.log("   Email:      tobias@demo.dk");
console.log("   Adgangskode: demo1234\n");
console.log("   Invite kode til familie: DEMO1234\n");
console.log("🌳 Familiestruktur:");
console.log("   Ole & Mette Hansen (bedsteforældre)");
console.log("   Jens & Karen Larsen (bedsteforældre)");
console.log("   Henrik & Lise Hansen (forældre) — Peter & Sofie Hansen (onkel/tante)");
console.log("   Tobias, Emma (søskende) — Nora (kusine)");
console.log("   Lucas (Tobias' søn)");
