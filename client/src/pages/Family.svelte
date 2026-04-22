<script>
    import { api } from "../lib/api.js";
    import { toast } from "../lib/toast.js";

    let { user = $bindable(), onNavigate } = $props();

    let mode = $state("choose");
    let loading = $state(false);

    let familyName = $state("");
    let inviteCode = $state("");
    let createdInviteCode = $state("");

    async function createFamily() {
        loading = true;
        try {
            const data = await api.post("/family/create", { name: familyName });
            user.family_id = data.familyId;
            user.role = "admin";
            createdInviteCode = data.inviteCode;
            mode = "created";
        } catch (err) {
            toast.error(err.message);
        } finally {
            loading = false;
        }
    }

    async function joinFamily() {
        loading = true;
        try {
            const data = await api.post("/family/join", { inviteCode });
            user.family_id = data.familyId;
            user.role = "member";
            toast.success("Du er nu en del af familien!");
            onNavigate("tree");
        } catch (err) {
            toast.error(err.message);
        } finally {
            loading = false;
        }
    }

    function copyCode() {
        navigator.clipboard.writeText(createdInviteCode);
        toast.success("Kode kopieret!");
    }
</script>

<div class="family-container">
    <div class="family-box">
        <h1>🌳 FamilyTree</h1>
        <p class="welcome">Velkommen, {user.username}! Opret en ny familie eller join en eksisterende.</p>

        {#if mode === "choose"}
            <div class="choices">
                <button class="choice-btn" onclick={() => mode = "create"}>
                    <span class="icon">🏡</span>
                    <strong>Opret familie</strong>
                    <small>Start et nyt familietræ</small>
                </button>
                <button class="choice-btn" onclick={() => mode = "join"}>
                    <span class="icon">🔑</span>
                    <strong>Join familie</strong>
                    <small>Tilslut dig med en invite kode</small>
                </button>
            </div>

        {:else if mode === "create"}
            <form onsubmit={(e) => { e.preventDefault(); createFamily(); }}>
                <label>
                    Familienavn
                    <input type="text" bind:value={familyName} placeholder="f.eks. Familie Hansen" required />
                </label>
                <button type="submit" disabled={loading}>
                    {loading ? "Opretter..." : "Opret familie"}
                </button>
            </form>
            <button class="back" onclick={() => mode = "choose"}>← Tilbage</button>

        {:else if mode === "created"}
            <div class="invite-box">
                <p>🎉 Familien er oprettet! Del denne kode med familiemedlemmer:</p>
                <div class="invite-code">{createdInviteCode}</div>
                <button class="btn-secondary" onclick={copyCode}>Kopier kode</button>
                <button class="btn-primary" onclick={() => onNavigate("tree")}>Gå til familietræet →</button>
            </div>

        {:else if mode === "join"}
            <form onsubmit={(e) => { e.preventDefault(); joinFamily(); }}>
                <label>
                    Invite kode
                    <input type="text" bind:value={inviteCode} placeholder="f.eks. A1B2C3D4" required />
                </label>
                <button type="submit" disabled={loading}>
                    {loading ? "Tilslutter..." : "Join familie"}
                </button>
            </form>
            <button class="back" onclick={() => mode = "choose"}>← Tilbage</button>
        {/if}
    </div>
</div>

<style>
    .family-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f5f0eb;
    }

    .family-box {
        background: white;
        padding: 2.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-width: 420px;
    }

    h1 {
        font-size: 1.8rem;
        margin: 0 0 0.5rem;
        text-align: center;
        color: #2d4a22;
    }

    .welcome {
        text-align: center;
        color: #666;
        font-size: 0.95rem;
        margin-bottom: 1.5rem;
    }

    .choices {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .choice-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        padding: 1.25rem;
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        background: white;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
    }

    .choice-btn:hover {
        border-color: #2d4a22;
        background: #f5f9f3;
    }

    .choice-btn .icon { font-size: 1.8rem; }
    .choice-btn strong { font-size: 1rem; color: #2d4a22; }
    .choice-btn small { font-size: 0.85rem; color: #888; }

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

    input:focus { border-color: #2d4a22; }

    button[type="submit"] {
        padding: 0.75rem;
        background: #2d4a22;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
        transition: background 0.2s;
    }

    button[type="submit"]:hover:not(:disabled) { background: #3d6330; }
    button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }

    .back {
        margin-top: 0.75rem;
        background: none;
        border: none;
        color: #666;
        cursor: pointer;
        font-size: 0.9rem;
        padding: 0;
        display: block;
        width: 100%;
        text-align: center;
    }

    .back:hover { color: #2d4a22; }

    .invite-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        text-align: center;
    }

    .invite-box p { color: #444; font-size: 0.95rem; }

    .invite-code {
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        color: #2d4a22;
        background: #f5f9f3;
        border: 2px dashed #2d4a22;
        padding: 0.75rem 1.5rem;
        border-radius: 10px;
    }

    .btn-primary {
        width: 100%;
        padding: 0.75rem;
        background: #2d4a22;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
        transition: background 0.2s;
    }

    .btn-primary:hover { background: #3d6330; }

    .btn-secondary {
        width: 100%;
        padding: 0.75rem;
        background: white;
        color: #2d4a22;
        border: 2px solid #2d4a22;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
        transition: background 0.2s;
    }

    .btn-secondary:hover { background: #f5f9f3; }
</style>
