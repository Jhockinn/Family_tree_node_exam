CREATE TABLE IF NOT EXISTS families (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    family_id INTEGER,
    role TEXT DEFAULT 'member',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id)
);

CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    birth_date TEXT,
    death_date TEXT,
    bio TEXT,
    image_url TEXT,
    FOREIGN KEY (family_id) REFERENCES families(id)
);

CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    related_person_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY (person_id) REFERENCES persons(id),
    FOREIGN KEY (related_person_id) REFERENCES persons(id)
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    person_id INTEGER,
    FOREIGN KEY (family_id) REFERENCES families(id),
    FOREIGN KEY (person_id) REFERENCES persons(id)
);
