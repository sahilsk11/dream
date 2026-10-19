async function request(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body && typeof opts.body !== "string" && !(opts.body instanceof FormData)) {
    headers["content-type"] = "application/json";
    opts = { ...opts, body: JSON.stringify(opts.body) };
  }
  const res = await fetch(path, { credentials: "include", ...opts, headers });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  me: () => request("/api/me"),
  login: (passcode) => request("/api/login", { method: "POST", body: { passcode } }),
  logout: () => request("/api/logout", { method: "POST", body: {} }),
  seed: () => request("/api/setup/seed", { method: "POST", body: {} }),
  sleep: (date) => request(`/api/sleep?date=${encodeURIComponent(date)}`),
  addSleep: (body) => request("/api/sleep", { method: "POST", body }),
  patchSleep: (id, body) => request(`/api/sleep/${id}`, { method: "PATCH", body }),
  deleteSleep: (id) => request(`/api/sleep/${id}`, { method: "DELETE" }),
  confirmSleep: (id) => request(`/api/sleep/${id}/confirm`, { method: "POST", body: {} }),
  splitSleep: (id, at) => request(`/api/sleep/${id}/split`, { method: "POST", body: { at } }),
  mergeSleep: (a, b) => request("/api/sleep/merge", { method: "POST", body: { a, b } }),
  food: (date) => request(`/api/food?date=${encodeURIComponent(date)}`),
  recents: () => request("/api/food/recents"),
  favorites: () => request("/api/food/favorites"),
  searchFood: (q) => request(`/api/food/search?q=${encodeURIComponent(q)}`),
  barcode: (code) => request(`/api/food/barcode/${encodeURIComponent(code)}`),
  parseFood: (text) => request("/api/food/parse", { method: "POST", body: { text } }),
  addFood: (body) => request("/api/food", { method: "POST", body }),
  patchFood: (id, body) => request(`/api/food/${id}`, { method: "PATCH", body }),
  deleteFood: (id) => request(`/api/food/${id}`, { method: "DELETE" }),
  addFavorite: (body) => request("/api/food/favorites", { method: "POST", body }),
  deleteFavorite: (id) => request(`/api/food/favorites/${id}`, { method: "DELETE" }),
  weight: () => request("/api/weight"),
  addWeight: (body) => request("/api/weight", { method: "POST", body }),
  patchWeight: (id, body) => request(`/api/weight/${id}`, { method: "PATCH", body }),
  deleteWeight: (id) => request(`/api/weight/${id}`, { method: "DELETE" }),
};
