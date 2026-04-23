# 🌳 FamilyTree

En fullstack webapplikation hvor familiemedlemmer kan bygge og dele et fælles familietræ i real-time.

## Funktioner

- **Familietræ** — tilføj personer med navn, fødselsdato, dødsdato og biografi. Definer relationer som forælder, barn, ægtefælle og søskende. Klik på en person for at se dem som stammen i et visuelt SVG-træ med rødder og grene.
- **Kalender** — fødselsdage og dødsdage tilføjes automatisk til kalenderen når du opretter en person. Tilføj egne familiebegivenheder og link dem til personer.
- **Real-time** — alle ændringer i træet og kalenderen synkroniseres live til alle familiemedlemmer via Socket.IO. Serveren gemmer i databasen og broadcaster til hele familien.
- **Familie-invitationer** — opret en familie og del invite koden med familiemedlemmer så de kan joine.
- **Auth** — register, login og logout med bcrypt-hashede passwords og sessions.

---

## Installation

### 1. Klon eller download projektet

```bash
cd "E:\KEA\semester 4\Family_tree_node_exam"
```

### 2. Installer server dependencies

```bash
cd server
npm install
```

### 3. Installer client dependencies

```bash
cd ..\client
npm install
```

---

## Konfiguration

Åbn `server/.env` og udfyld:

```env
SESSION_SECRET=vælg_en_lang_hemmelig_streng
PORT=8080
```

---

## Start projektet

Åbn **to terminaler**:

**Terminal 1 — Server:**
```bash
cd "E:\KEA\semester 4\Family_tree_node_exam\server"
npm run dev
```

**Terminal 2 — Client:**
```bash
cd "E:\KEA\semester 4\Family_tree_node_exam\client"
npm run dev
```

Åbn browseren på **http://localhost:5173**

---