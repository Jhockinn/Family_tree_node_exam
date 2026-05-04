<script>
    import { onMount, onDestroy } from "svelte";
    import { api } from "../lib/api.js";
    import socket from "../lib/socket.js";
    import { toast } from "../lib/toast.js";

    let { user } = $props();

    let events = $state([]);
    let persons = $state([]);
    let loading = $state(true);
    let showAddEvent = $state(false);

    let form = $state({ title: "", date: "", description: "", person_id: "" });

    let today = new Date();
    let viewYear = $state(today.getFullYear());
    let viewMonth = $state(today.getMonth());

    const monthNames = [
        "Januar", "Februar", "Marts", "April", "Maj", "Juni",
        "Juli", "August", "September", "Oktober", "November", "December",
    ];

    const dayNames = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

    onMount(async () => {
        await loadData();

        socket.emit("join-family", user.family_id);

        socket.on("calendar:event-added", (data) => {
            if (!events.find((e) => e.id === data.event.id)) {
                events = [...events, data.event];
                toast.info(`Ny begivenhed: ${data.event.title}`);
            }
        });

        socket.on("calendar:event-deleted", (data) => {
            events = events.filter((e) => e.id !== data.eventId);
        });
    });

    onDestroy(() => {
        socket.off("calendar:event-added");
        socket.off("calendar:event-deleted");
    });

    async function loadData() {
        try {
            const [calData, famData] = await Promise.all([
                api.get("/calendar"),
                api.get("/family/persons"),
            ]);
            events = calData.events;
            persons = famData.persons;
        } catch (err) {
            toast.error(err.message);
        } finally {
            loading = false;
        }
    }

    async function addEvent() {
        try {
            const data = await api.post("/calendar", {
                ...form,
                person_id: form.person_id || null,
            });
            events = [...events, data.event];
            socket.emit("calendar:add-event", { familyId: user.family_id, event: data.event });
            toast.success(`${data.event.title} tilføjet!`);
            closeModal();
        } catch (err) {
            toast.error(err.message);
        }
    }

    async function deleteEvent(id) {
        if (!confirm("Er du sikker på at du vil slette denne begivenhed?")) return;
        try {
            await api.delete(`/calendar/${id}`);
            events = events.filter((e) => e.id !== id);
            socket.emit("calendar:delete-event", { familyId: user.family_id, eventId: id });
            toast.success("Begivenhed slettet.");
        } catch (err) {
            toast.error(err.message);
        }
    }

    function closeModal() {
        showAddEvent = false;
        form = { title: "", date: "", description: "", person_id: "" };
    }

    function prevMonth() {
        if (viewMonth === 0) { viewMonth = 11; viewYear--; }
        else { viewMonth--; }
    }

    function nextMonth() {
        if (viewMonth === 11) { viewMonth = 0; viewYear++; }
        else { viewMonth++; }
    }

    function buildCalendarDays(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        let startDow = firstDay.getDay();
        startDow = startDow === 0 ? 6 : startDow - 1;
        const days = [];
        for (let i = 0; i < startDow; i++) days.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
        return days;
    }

    function eventsForDay(day) {
        if (!day) return [];
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return events.filter((e) => e.date?.startsWith(dateStr));
    }

    function isToday(day) {
        return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
    }

    function getPersonName(personId) {
        const p = persons.find((p) => p.id === personId);
        return p ? p.name : null;
    }

    let upcomingEvents = $derived(
        [...events]
            .filter((e) => new Date(e.date) >= new Date(today.toDateString()))
            .sort((a, b) => +new Date(a.date) - +new Date(b.date))
            .slice(0, 5)
    );

    let calendarDays = $derived(buildCalendarDays(viewYear, viewMonth));
</script>

<div class="calendar-page">
    <div class="toolbar">
        <h2>📅 Familiekalender</h2>
        <button class="btn-primary" onclick={() => showAddEvent = true}>+ Tilføj begivenhed</button>
    </div>

    {#if loading}
        <p class="loading">Indlæser kalender...</p>
    {:else}
        <div class="calendar-layout">
            <div class="calendar-grid-wrapper">
                <div class="month-nav">
                    <button onclick={prevMonth}>←</button>
                    <h3>{monthNames[viewMonth]} {viewYear}</h3>
                    <button onclick={nextMonth}>→</button>
                </div>
                <div class="calendar-grid">
                    {#each dayNames as name}
                        <div class="day-header">{name}</div>
                    {/each}
                    {#each calendarDays as day}
                        <div class="day-cell" class:today={isToday(day)} class:empty={!day}>
                            {#if day}
                                <span class="day-number">{day}</span>
                                {#each eventsForDay(day) as event}
                                    <div class="day-event" title={event.title}>{event.title}</div>
                                {/each}
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>

            <div class="sidebar">
                <h3>Kommende begivenheder</h3>
                {#if upcomingEvents.length === 0}
                    <p class="no-events">Ingen kommende begivenheder</p>
                {:else}
                    <ul class="event-list">
                        {#each upcomingEvents as event}
                            <li class="event-item">
                                <div class="event-date">{event.date}</div>
                                <div class="event-body">
                                    <strong>{event.title}</strong>
                                    {#if event.description}<small>{event.description}</small>{/if}
                                    {#if event.person_id}<small class="linked-person">👤 {getPersonName(event.person_id)}</small>{/if}
                                </div>
                                <button class="delete-btn" onclick={() => deleteEvent(event.id)} title="Slet">🗑️</button>
                            </li>
                        {/each}
                    </ul>
                {/if}

                <h3 style="margin-top: 1.5rem">Alle begivenheder</h3>
                {#if events.length === 0}
                    <p class="no-events">Ingen begivenheder endnu</p>
                {:else}
                    <ul class="event-list">
                        {#each [...events].sort((a, b) => +new Date(a.date) - +new Date(b.date)) as event}
                            <li class="event-item">
                                <div class="event-date">{event.date}</div>
                                <div class="event-body">
                                    <strong>{event.title}</strong>
                                    {#if event.person_id}<small class="linked-person">👤 {getPersonName(event.person_id)}</small>{/if}
                                </div>
                                <button class="delete-btn" onclick={() => deleteEvent(event.id)} title="Slet">🗑️</button>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>
        </div>
    {/if}
</div>

{#if showAddEvent}
    <div
    class="modal-overlay"
    onclick={closeModal}
    onkeydown={(e) => e.key === "Escape" && closeModal()}
    role="presentation"
>
    <div
        class="modal"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="dialog"
        tabindex="0"
    >
            <h3>Tilføj begivenhed</h3>
            <form onsubmit={(e) => { e.preventDefault(); addEvent(); }}>
                <label>Titel <input type="text" bind:value={form.title} required /></label>
                <label>Dato <input type="date" bind:value={form.date} required /></label>
                <label>Beskrivelse <textarea bind:value={form.description} rows="3"></textarea></label>
                <label>
                    Tilknyt til person (valgfrit)
                    <select bind:value={form.person_id}>
                        <option value="">Ingen</option>
                        {#each persons as p}<option value={p.id}>{p.name}</option>{/each}
                    </select>
                </label>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick={closeModal}>Annuller</button>
                    <button type="submit" class="btn-primary">Tilføj</button>
                </div>
            </form>
        </div>
    </div>
{/if}

<style>
    .calendar-page { padding: 1.5rem; max-width: 1100px; margin: 0 auto; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem; }
    .toolbar h2 { margin: 0; color: #2d4a22; font-size: 1.4rem; }
    .calendar-layout { display: grid; grid-template-columns: 1fr 280px; gap: 1.5rem; align-items: start; }
    @media (max-width: 700px) { .calendar-layout { grid-template-columns: 1fr; } }
    .month-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
    .month-nav h3 { margin: 0; color: #2d4a22; font-size: 1.1rem; }
    .month-nav button { background: none; border: 2px solid #2d4a22; color: #2d4a22; border-radius: 6px; padding: 0.3rem 0.7rem; cursor: pointer; font-size: 1rem; transition: background 0.2s; }
    .month-nav button:hover { background: #f5f9f3; }
    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
    .day-header { text-align: center; font-size: 0.8rem; font-weight: 600; color: #888; padding: 0.4rem 0; }
    .day-cell { min-height: 80px; background: white; border: 1px solid #eee; border-radius: 6px; padding: 0.35rem; display: flex; flex-direction: column; gap: 2px; }
    .day-cell.empty { background: #fafafa; border-color: transparent; }
    .day-cell.today { border-color: #2d4a22; background: #f5f9f3; }
    .day-number { font-size: 0.8rem; font-weight: 600; color: #444; }
    .day-cell.today .day-number { color: #2d4a22; }
    .day-event { background: #2d4a22; color: white; font-size: 0.7rem; padding: 0.15rem 0.35rem; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sidebar { background: white; border-radius: 10px; padding: 1.25rem; border: 1px solid #eee; }
    .sidebar h3 { margin: 0 0 0.75rem; color: #2d4a22; font-size: 1rem; }
    .event-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .event-item { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.6rem; background: #f9f9f9; border-radius: 8px; border-left: 3px solid #2d4a22; }
    .event-date { font-size: 0.75rem; color: #888; white-space: nowrap; padding-top: 2px; }
    .event-body { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .event-body strong { font-size: 0.9rem; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .event-body small { font-size: 0.78rem; color: #888; }
    .linked-person { color: #2d4a22 !important; font-weight: 500; }
    .delete-btn { background: none; border: none; cursor: pointer; font-size: 0.9rem; opacity: 0.5; padding: 0; flex-shrink: 0; transition: opacity 0.2s; }
    .delete-btn:hover { opacity: 1; }
    .no-events { color: #aaa; font-size: 0.9rem; font-style: italic; }
    .loading { text-align: center; color: #888; padding: 2rem; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: white; padding: 2rem; border-radius: 12px; width: 100%; max-width: 420px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); }
    .modal h3 { margin: 0 0 1.25rem; color: #2d4a22; }
    .modal form { display: flex; flex-direction: column; gap: 0.85rem; }
    .modal label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.9rem; color: #444; font-weight: 500; }
    .modal input, .modal select, .modal textarea { padding: 0.6rem 0.8rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.95rem; outline: none; font-family: inherit; transition: border-color 0.2s; }
    .modal input:focus, .modal select:focus, .modal textarea:focus { border-color: #2d4a22; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
    .btn-primary { padding: 0.6rem 1.2rem; background: #2d4a22; color: white; border: none; border-radius: 6px; font-size: 0.95rem; cursor: pointer; transition: background 0.2s; }
    .btn-primary:hover { background: #3d6330; }
    .btn-secondary { padding: 0.6rem 1.2rem; background: white; color: #2d4a22; border: 2px solid #2d4a22; border-radius: 6px; font-size: 0.95rem; cursor: pointer; transition: background 0.2s; }
    .btn-secondary:hover { background: #f5f9f3; }
</style>
