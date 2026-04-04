const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function fetchEntries() {
  const res = await fetch(`${API_URL}/entries`);
  return res.json();
}

export async function fetchEntryByDate(date) {
  const res = await fetch(`${API_URL}/entries/${date}`);
  return res.json();
}

export async function saveEntry(entry) {
  const res = await fetch(`${API_URL}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  return res.json();
}

export async function updateSession(date, sessionData) {
  const res = await fetch(`${API_URL}/entries/${date}/session`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData),
  });
  return res.json();
}

export async function fetchTasks() {
  const res = await fetch(`${API_URL}/tasks`);
  return res.json();
}

export async function saveTasks(tasks) {
  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks }),
  });
  return res.json();
}

export async function exportData() {
  const res = await fetch(`${API_URL}/export`);
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_URL}/settings`);
  return res.json();
}

export async function saveSetting(key, value) {
  const res = await fetch(`${API_URL}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  return res.json();
}

export async function importData(data) {
  const res = await fetch(`${API_URL}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Playlists API
export async function fetchPlaylists() {
  const res = await fetch(`${API_URL}/playlists`);
  return res.json();
}

export async function savePlaylist(playlist) {
  const res = await fetch(`${API_URL}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(playlist),
  });
  return res.json();
}

export async function deletePlaylist(id) {
  const res = await fetch(`${API_URL}/playlists/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function setActivePlaylist(id) {
  const res = await fetch(`${API_URL}/playlists/${id}/active`, {
    method: 'PUT',
  });
  return res.json();
}

// Bible Verse API
export async function fetchBibleVerse() {
  const res = await fetch(`${API_URL}/verse`);
  return res.json();
}
