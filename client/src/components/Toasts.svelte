<script>
    import { toast } from "../lib/toast.js";
    import { fly } from "svelte/transition";
</script>

<div class="toast-container">
    {#each $toast as t (t.id)}
        <div
            class="toast toast-{t.type}"
            transition:fly={{ y: 20, duration: 250 }}
        >
            <span class="toast-icon">
                {#if t.type === "success"}✅
                {:else if t.type === "error"}❌
                {:else}ℹ️{/if}
            </span>
            <span class="toast-message">{t.message}</span>
            <button class="toast-close" onclick={() => toast.remove(t.id)}>×</button>
        </div>
    {/each}
</div>

<style>
    .toast-container {
        position: fixed;
        bottom: 1.5rem;
        right: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        z-index: 999;
        pointer-events: none;
    }

    .toast {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        font-size: 0.9rem;
        min-width: 220px;
        max-width: 360px;
        pointer-events: all;
        color: white;
    }

    .toast-success { background: #2d4a22; }
    .toast-error   { background: #c0392b; }
    .toast-info    { background: #2e5c7a; }

    .toast-icon { flex-shrink: 0; font-size: 1rem; }

    .toast-message { flex: 1; line-height: 1.4; }

    .toast-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.75);
        cursor: pointer;
        font-size: 1.2rem;
        padding: 0;
        line-height: 1;
        flex-shrink: 0;
        transition: color 0.2s;
    }

    .toast-close:hover { color: white; }
</style>
