<script>
    import { api } from "../lib/api.js";
    import { toast } from "../lib/toast.js";

    let { user = $bindable(), onNavigate } = $props();

    let isRegister = $state(false);
    let loading = $state(false);

    let username = $state("");
    let email = $state("");
    let password = $state("");

    async function handleSubmit() {
        loading = true;
        try {
            if (isRegister) {
                const data = await api.post("/auth/register", { username, email, password });
                user = data.user;
                toast.success("Konto oprettet!");
            } else {
                const data = await api.post("/auth/login", { email, password });
                user = data.user;
                toast.success(`Velkommen tilbage, ${data.user.username}!`);
            }
            onNavigate(user.family_id ? "tree" : "family");
        } catch (err) {
            toast.error(err.message);
        } finally {
            loading = false;
        }
    }
</script>

<div class="auth-container">
    <div class="auth-box">
        <h1>🌳 FamilyTree</h1>
        <h2>{isRegister ? "Opret konto" : "Log ind"}</h2>

        <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            {#if isRegister}
                <label>
                    Brugernavn
                    <input type="text" bind:value={username} required />
                </label>
            {/if}

            <label>
                Email
                <input type="email" bind:value={email} required />
            </label>

            <label>
                Adgangskode
                <input type="password" bind:value={password} required />
            </label>

            <button type="submit" disabled={loading}>
                {loading ? "Vent..." : isRegister ? "Opret konto" : "Log ind"}
            </button>
        </form>

        <p class="toggle">
            {isRegister ? "Har du allerede en konto?" : "Har du ikke en konto?"}
            <button onclick={() => { isRegister = !isRegister; }}>
                {isRegister ? "Log ind" : "Opret konto"}
            </button>
        </p>
    </div>
</div>

<style>
    .auth-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f5f0eb;
    }

    .auth-box {
        background: white;
        padding: 2.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-width: 400px;
    }

    h1 {
        font-size: 1.8rem;
        margin: 0 0 0.25rem;
        text-align: center;
        color: #2d4a22;
    }

    h2 {
        font-size: 1.1rem;
        font-weight: 400;
        text-align: center;
        color: #666;
        margin: 0 0 1.5rem;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.9rem;
        color: #444;
        font-weight: 500;
    }

    input {
        padding: 0.6rem 0.8rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
        outline: none;
        transition: border-color 0.2s;
    }

    input:focus {
        border-color: #2d4a22;
    }

    button[type="submit"] {
        margin-top: 0.5rem;
        padding: 0.75rem;
        background: #2d4a22;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
        transition: background 0.2s;
    }

    button[type="submit"]:hover:not(:disabled) {
        background: #3d6330;
    }

    button[type="submit"]:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .toggle {
        text-align: center;
        margin-top: 1.25rem;
        font-size: 0.9rem;
        color: #666;
    }

    .toggle button {
        background: none;
        border: none;
        color: #2d4a22;
        cursor: pointer;
        font-weight: 600;
        padding: 0;
        margin-left: 0.25rem;
        text-decoration: underline;
    }
</style>
