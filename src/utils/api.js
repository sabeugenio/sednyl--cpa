import { supabase } from './supabase.js';

export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

async function apiFetch(endpoint, options = {}) {
  const headers = { ...options.headers };
  
  const { data } = await supabase.auth.getSession();
  if (data?.session?.access_token) {
    headers['Authorization'] = `Bearer ${data.session.access_token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });
  
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `API error: ${res.status}`);
  }

  return res.json();
}

export async function fetchEntries() {
  return apiFetch(`/entries`);
}

export async function fetchEntryByDate(date) {
  return apiFetch(`/entries/${date}`);
}

export async function saveEntry(entry) {
  return apiFetch(`/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
}

export async function updateSession(date, sessionData) {
  return apiFetch(`/entries/${date}/session`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData),
  });
}

export async function fetchTasks() {
  return apiFetch(`/tasks`);
}

export async function saveTasks(tasks) {
  return apiFetch(`/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks }),
  });
}

export async function exportData() {
  return apiFetch(`/export`);
}

export async function fetchSettings() {
  return apiFetch(`/settings`);
}

export async function saveSetting(key, value) {
  return apiFetch(`/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
}

export async function importData(data) {
  return apiFetch(`/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// Playlists API
export async function fetchPlaylists() {
  return apiFetch(`/playlists`);
}

export async function savePlaylist(playlist) {
  return apiFetch(`/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(playlist),
  });
}

export async function deletePlaylist(id) {
  return apiFetch(`/playlists/${id}`, {
    method: 'DELETE',
  });
}

export async function setActivePlaylist(id) {
  return apiFetch(`/playlists/${id}/active`, {
    method: 'PUT',
  });
}

// Bible Verse API
export async function fetchBibleVerse() {
  return apiFetch(`/verse`);
}

// Study Topics API
export async function fetchTopics(done) {
  const query = done !== undefined ? `?done=${done}` : '';
  return apiFetch(`/topics${query}`);
}

export async function addTopic(content) {
  return apiFetch(`/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

export async function updateTopic(id, data) {
  return apiFetch(`/topics/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteTopic(id) {
  return apiFetch(`/topics/${id}`, {
    method: 'DELETE',
  });
}
