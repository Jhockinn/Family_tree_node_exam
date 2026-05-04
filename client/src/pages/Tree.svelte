<script>
    import { onMount, onDestroy } from "svelte";
    import { api } from "../lib/api.js";
    import socket from "../lib/socket.js";
    import FamilyTreeView from "../components/FamilyTreeView.svelte";
    import { toast } from "../lib/toast.js";

    let { user } = $props();

    let persons = $state([]);
    let relationships = $state([]);
    let loading = $state(true);

    let view = $state("list");
    let selectedPerson = $state(null);

    let showAddPerson = $state(false);
    let showEditPerson = $state(false);
    let showAddRelation = $state(false);

    let form = $state({ name: "", birth_date: "", death_date: "", bio: "" });
    let relation = $state({ person_id: "", related_person_id: "", type: "parent" });

    const relationLabels = {
        parent: "Forælder",
        child: "Barn",
        spouse: "Ægtefælle",
        sibling: "Søskende",
    };

    onMount(async () => {
        await loadTree();

        socket.emit("join-family", user.family_id);

        socket.on("tree:person-added", (data) => {
            if (!persons.find((p) => p.id === data.person.id)) {
                persons = [...persons, data.person];
                toast.info(`${data.person.name} blev tilføjet af et andet familiemedlem`);
            }
        });

        socket.on("tree:person-updated", (data) => {
            persons = persons.map((p) => (p.id === data.person.id ? data.person : p));
            if (selectedPerson?.id === data.person.id) selectedPerson = data.person;
        });

        socket.on("tree:person-deleted", (data) => {
            persons = persons.filter((p) => p.id !== data.personId);
            relationships = relationships.filter(
                (r) => r.person_id !== data.personId && r.related_person_id !== data.personId
            );
            if (selectedPerson?.id === data.personId) {
                selectedPerson = null;
                view = "list";
            }
        });

        socket.on("tree:relation-added", (data) => {
            if (!relationships.find((r) => r.id === data.relationship.id)) {
                relationships = [...relationships, data.relationship];
            }
        });
    });

    onDestroy(() => {
        socket.off("tree:person-added");
        socket.off("tree:person-updated");
        socket.off("tree:person-deleted");
        socket.off("tree:relation-added");
    });

    async function loadTree() {
        try {
            const data = await api.get("/family/persons");
            persons = data.persons;
            relationships = data.relationships;
        } catch (err) {
            toast.error(err.message);
        } finally {
            loading = false;
        }
    }

    async function addPerson() {
        try {
            const data = await api.post("/family/persons", form);
            persons = [...persons, data.person];
            socket.emit("tree:add-person", { familyId: user.family_id, person: data.person });
            toast.success(`${data.person.name} blev tilføjet!`);
            closeModals();
        } catch (err) {
            toast.error(err.message);
        }
    }

    async function updatePerson() {
        try {
            await api.put(`/family/persons/${selectedPerson.id}`, form);
            const updated = { ...selectedPerson, ...form };
            persons = persons.map((p) => (p.id === selectedPerson.id ? updated : p));
            selectedPerson = updated;
            socket.emit("tree:update-person", { familyId: user.family_id, person: updated });
            toast.success("Person opdateret!");
            closeModals();
        } catch (err) {
            toast.error(err.message);
        }
    }

    async function deletePerson(id) {
        if (!confirm("Er du sikker på at du vil slette denne person?")) return;
        try {
            await api.delete(`/family/persons/${id}`);
            const deleted = persons.find((p) => p.id === id);
            persons = persons.filter((p) => p.id !== id);
            relationships = relationships.filter(
                (r) => r.person_id !== id && r.related_person_id !== id
            );
            socket.emit("tree:delete-person", { familyId: user.family_id, personId: id });
            toast.success(`${deleted?.name} blev slettet`);
            if (selectedPerson?.id === id) {
                selectedPerson = null;
                view = "list";
            }
        } catch (err) {
            toast.error(err.message);
        }
    }

    async function addRelation() {
        try {
            const data = await api.post("/family/relationships", relation);
            const newRel = { id: data.id, ...relation };
            relationships = [...relationships, newRel];
            socket.emit("tree:add-relation", { familyId: user.family_id, relationship: newRel });
            toast.success("Relation tilføjet!");
            closeModals();
        } catch (err) {
            toast.error(err.message);
        }
    }

    function openEdit(person) {
        selectedPerson = person;
        form = {
            name: person.name,
            birth_date: person.birth_date ?? "",
            death_date: person.death_date ?? "",
            bio: person.bio ?? "",
        };
        showEditPerson = true;
    }

    function openAdd() {
        form = { name: "", birth_date: "", death_date: "", bio: "" };
        showAddPerson = true;
    }

    function closeModals() {
        showAddPerson = false;
        showEditPerson = false;
        showAddRelation = false;
    }

    function selectPerson(person) {
        selectedPerson = person;
        view = "tree";
    }

    function getRelations(personId) {
        return relationships
            .filter((r) => r.person_id === personId || r.related_person_id === personId)
            .map((r) => {
                const otherId = r.person_id === personId ? r.related_person_id : r.person_id;
                const other = persons.find((p) => p.id === otherId);
                return { ...r, otherPerson: other, label: relationLabels[r.type] };
            })
            .filter((r) => r.otherPerson);
    }
</script>

<div class="tree-page">
    <div class="toolbar">
        <div class="toolbar-left">
            <h2>🌳 Familietræ</h2>
            {#if view === "tree" && selectedPerson}
                <div class="view-tabs">
                    <button onclick={() => view = "list"}>← Alle personer</button>
                </div>
            {/if}
        </div>
        <div class="toolbar-actions">
            <button class="btn-primary" onclick={openAdd}>+ Tilføj person</button>
            <button class="btn-secondary" onclick={() => showAddRelation = true}>+ Tilføj relation</button>
        </div>
    </div>

    {#if loading}
        <p class="loading">Indlæser træ...</p>

    {:else if view === "tree" && selectedPerson}
        <div class="tree-container">
            <div class="tree-header">
                <div class="tree-header-info">
                    <h3>{selectedPerson.name}</h3>
                    {#if selectedPerson.bio}
                        <p class="bio-text">{selectedPerson.bio}</p>
                    {/if}
                </div>
                <div class="tree-header-actions">
                    <button class="btn-secondary btn-sm" onclick={() => openEdit(selectedPerson)}>✏️ Rediger</button>
                    <button class="btn-danger btn-sm" onclick={() => deletePerson(selectedPerson.id)}>🗑️ Slet</button>
                </div>
            </div>
            <FamilyTreeView person={selectedPerson} {persons} {relationships} />
        </div>

    {:else}
        {#if persons.length === 0}
            <div class="empty">
                <p>Ingen personer i træet endnu.</p>
                <button class="btn-primary" onclick={openAdd}>Tilføj den første person</button>
            </div>
        {:else}
            <p class="hint">Klik på en person for at se dem i træet 🌳</p>
            <div class="persons-grid">
                {#each persons as person}
                    <div
                        class="person-card"
                        onclick={() => selectPerson(person)}
                        role="button"
                        tabindex="0"
                        onkeydown={(e) => e.key === "Enter" && selectPerson(person)}
                    >
                        <div class="person-avatar">{person.name.charAt(0).toUpperCase()}</div>
                        <div class="person-info">
                            <strong>{person.name}</strong>
                            {#if person.birth_date}<small>Født: {person.birth_date}</small>{/if}
                            {#if person.death_date}<small>Død: {person.death_date}</small>{/if}
                            <small class="relation-count">{getRelations(person.id).length} relation(er)</small>
                        </div>
                        <div class="person-card-actions">
                            <button onclick={(e) => { e.stopPropagation(); openEdit(person); }} title="Rediger">✏️</button>
                            <button onclick={(e) => { e.stopPropagation(); deletePerson(person.id); }} title="Slet">🗑️</button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
</div>

{#if showAddPerson}
    <div
        class="modal-overlay"
        onclick={closeModals}
        onkeydown={(e) => e.key === "Escape" && closeModals()}
        role="presentation"
    >
        <div
            class="modal"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
            role="dialog"
            tabindex="0"
        >
            <h3>Tilføj person</h3>
            <form onsubmit={(e) => { e.preventDefault(); addPerson(); }}>
                <label>Navn <input type="text" bind:value={form.name} required /></label>
                <label>Fødselsdato <input type="date" bind:value={form.birth_date} /></label>
                <label>Dødsdato <input type="date" bind:value={form.death_date} /></label>
                <label>Biografi <textarea bind:value={form.bio} rows="3"></textarea></label>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick={closeModals}>Annuller</button>
                    <button type="submit" class="btn-primary">Tilføj</button>
                </div>
            </form>
        </div>
    </div>
{/if}

{#if showEditPerson}
    <div
        class="modal-overlay"
        onclick={closeModals}
        onkeydown={(e) => e.key === "Escape" && closeModals()}
        role="presentation"
    >
        <div
            class="modal"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
            role="dialog"
            tabindex="0"
        >
            <h3>Rediger person</h3>
            <form onsubmit={(e) => { e.preventDefault(); updatePerson(); }}>
                <label>Navn <input type="text" bind:value={form.name} required /></label>
                <label>Fødselsdato <input type="date" bind:value={form.birth_date} /></label>
                <label>Dødsdato <input type="date" bind:value={form.death_date} /></label>
                <label>Biografi <textarea bind:value={form.bio} rows="3"></textarea></label>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick={closeModals}>Annuller</button>
                    <button type="submit" class="btn-primary">Gem</button>
                </div>
            </form>
        </div>
    </div>
{/if}

{#if showAddRelation}
    <div
        class="modal-overlay"
        onclick={closeModals}
        onkeydown={(e) => e.key === "Escape" && closeModals()}
        role="presentation"
    >
        <div
            class="modal"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
            role="dialog"
            tabindex="0"
        >
            <h3>Tilføj relation</h3>
            <form onsubmit={(e) => { e.preventDefault(); addRelation(); }}>
                <label>
                    Person
                    <select bind:value={relation.person_id} required>
                        <option value="">Vælg person</option>
                        {#each persons as p}<option value={p.id}>{p.name}</option>{/each}
                    </select>
                </label>
                <label>
                    Relationstype
                    <select bind:value={relation.type}>
                        {#each Object.entries(relationLabels) as [value, label]}
                            <option {value}>{label}</option>
                        {/each}
                    </select>
                </label>
                <label>
                    Relateret til
                    <select bind:value={relation.related_person_id} required>
                        <option value="">Vælg person</option>
                        {#each persons.filter(p => p.id != relation.person_id) as p}
                            <option value={p.id}>{p.name}</option>
                        {/each}
                    </select>
                </label>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick={closeModals}>Annuller</button>
                    <button type="submit" class="btn-primary">Tilføj</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<style>
    .tree-page { padding: 1.5rem; max-width: 960px; margin: 0 auto; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem; }
    .toolbar-left { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .toolbar h2 { margin: 0; color: #2d4a22; font-size: 1.4rem; }
    .toolbar-actions { display: flex; gap: 0.5rem; }
    .view-tabs button { background: none; border: none; color: #2d4a22; cursor: pointer; font-size: 0.9rem; font-weight: 500; padding: 0.3rem 0.6rem; border-radius: 6px; transition: background 0.2s; }
    .view-tabs button:hover { background: rgba(45, 74, 34, 0.1); }
    .hint { font-size: 0.85rem; color: #888; margin-bottom: 0.75rem; font-style: italic; }
    .persons-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.75rem; }
    .person-card { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: white; border: 2px solid #e8e8e8; border-radius: 10px; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s, transform 0.1s; }
    .person-card:hover { border-color: #2d4a22; box-shadow: 0 2px 10px rgba(45, 74, 34, 0.12); transform: translateY(-1px); }
    .person-avatar { width: 44px; height: 44px; border-radius: 50%; background: #2d4a22; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; flex-shrink: 0; }
    .person-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .person-info strong { color: #222; }
    .person-info small { color: #888; font-size: 0.8rem; }
    .relation-count { color: #2d4a22 !important; font-weight: 500; }
    .person-card-actions { display: flex; gap: 0.25rem; flex-shrink: 0; }
    .person-card-actions button { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.25rem; border-radius: 4px; opacity: 0.5; transition: opacity 0.2s; }
    .person-card-actions button:hover { opacity: 1; }
    .tree-container { background: white; border-radius: 12px; border: 2px solid #e8e8e8; overflow: hidden; }
    .tree-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; background: #f5f9f3; border-bottom: 2px solid #e0eddc; flex-wrap: wrap; gap: 0.75rem; }
    .tree-header h3 { margin: 0; color: #2d4a22; font-size: 1.2rem; }
    .bio-text { font-size: 0.85rem; color: #666; margin-top: 0.2rem; }
    .tree-header-actions { display: flex; gap: 0.5rem; }
    .empty { text-align: center; padding: 3rem; color: #888; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
    .loading { text-align: center; color: #888; padding: 2rem; }
    .btn-primary { padding: 0.6rem 1.2rem; background: #2d4a22; color: white; border: none; border-radius: 6px; font-size: 0.95rem; cursor: pointer; transition: background 0.2s; }
    .btn-primary:hover { background: #3d6330; }
    .btn-secondary { padding: 0.6rem 1.2rem; background: white; color: #2d4a22; border: 2px solid #2d4a22; border-radius: 6px; font-size: 0.95rem; cursor: pointer; transition: background 0.2s; }
    .btn-secondary:hover { background: #f5f9f3; }
    .btn-danger { padding: 0.6rem 1.2rem; background: white; color: #c0392b; border: 2px solid #c0392b; border-radius: 6px; font-size: 0.95rem; cursor: pointer; transition: background 0.2s; }
    .btn-danger:hover { background: #fdecea; }
    .btn-sm { padding: 0.35rem 0.8rem; font-size: 0.85rem; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: white; padding: 2rem; border-radius: 12px; width: 100%; max-width: 420px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); }
    .modal h3 { margin: 0 0 1.25rem; color: #2d4a22; }
    .modal form { display: flex; flex-direction: column; gap: 0.85rem; }
    .modal label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.9rem; color: #444; font-weight: 500; }
    .modal input, .modal select, .modal textarea { padding: 0.6rem 0.8rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.95rem; outline: none; font-family: inherit; transition: border-color 0.2s; }
    .modal input:focus, .modal select:focus, .modal textarea:focus { border-color: #2d4a22; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
</style>
