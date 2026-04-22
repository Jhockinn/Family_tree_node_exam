// Simpel fetch wrapper der altid sender cookies med
const BASE = "/api";

async function request(method, path, body) {
    const options = {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(BASE + path, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Noget gik galt.");
    return data;
}

export const api = {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
    delete: (path) => request("DELETE", path),
};
