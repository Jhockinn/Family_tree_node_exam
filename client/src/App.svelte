<script>
    import { onMount } from "svelte";
    import { api } from "./lib/api.js";

    import Login from "./pages/Login.svelte";
    import Family from "./pages/Family.svelte";
    import Tree from "./pages/Tree.svelte";
    import Calendar from "./pages/Calendar.svelte";
    import Toasts from "./components/Toasts.svelte";

    let user = $state(null);
    let page = $state("login");
    let loading = $state(true);

    onMount(async () => {
        try {
            const data = await api.get("/auth/me");
            user = data.user;
            page = user.family_id ? "tree" : "family";
        } catch {
            page = "login";
        } finally {
            loading = false;
        }
    });

    async function logout() {
        await api.post("/auth/logout");
        user = null;
        page = "login";
    }

    function navigate(to) {
        page = to;
    }
</script>

<Toasts />

{#if loading}
    <div class="splash">Indlæser...</div>
{:else if page === "login"}
    <Login bind:user onNavigate={navigate} />
{:else if page === "family"}
    <Family bind:user onNavigate={navigate} />
{:else}
    <div class="app-layout">
        <nav class="navbar">
            <span class="nav-logo">🌳 FamilyTree</span>
            <div class="nav-links">
                <button class:active={page === "tree"} onclick={() => navigate("tree")}>Familietræ</button>
                <button class:active={page === "calendar"} onclick={() => navigate("calendar")}>Kalender</button>
            </div>
            <div class="nav-user">
                <span>{user.username}</span>
                <button class="logout-btn" onclick={logout}>Log ud</button>
            </div>
        </nav>

        <main>
            {#if page === "tree"}
                <Tree {user} />
            {:else if page === "calendar"}
                <Calendar {user} />
            {/if}
        </main>
    </div>
{/if}

<style>
    .splash {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #888;
        font-size: 1.1rem;
    }

    .app-layout {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: #f5f0eb;
    }

    .navbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1.5rem;
        height: 56px;
        background: #2d4a22;
        color: white;
        gap: 1rem;
    }

    .nav-logo {
        font-weight: 700;
        font-size: 1.1rem;
        white-space: nowrap;
    }

    .nav-links {
        display: flex;
        gap: 0.25rem;
    }

    .nav-links button {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.75);
        cursor: pointer;
        padding: 0.4rem 0.9rem;
        border-radius: 6px;
        font-size: 0.95rem;
        transition: background 0.2s, color 0.2s;
    }

    .nav-links button:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }

    .nav-links button.active {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        font-weight: 600;
    }

    .nav-user {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.85);
        white-space: nowrap;
    }

    .logout-btn {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        cursor: pointer;
        padding: 0.3rem 0.75rem;
        border-radius: 6px;
        font-size: 0.85rem;
        transition: background 0.2s;
    }

    .logout-btn:hover {
        background: rgba(255, 255, 255, 0.25);
    }

    main {
        flex: 1;
    }
</style>
