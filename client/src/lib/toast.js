import { writable } from "svelte/store";

const toasts = writable([]);

let id = 0;

function addToast(message, type = "info", duration = 3000) {
    const toast = { id: id++, message, type };
    toasts.update((all) => [...all, toast]);
    setTimeout(() => removeToast(toast.id), duration);
}

function removeToast(toastId) {
    toasts.update((all) => all.filter((t) => t.id !== toastId));
}

export const toast = {
    subscribe: toasts.subscribe,
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error"),
    info: (msg) => addToast(msg, "info"),
    remove: removeToast,
};
