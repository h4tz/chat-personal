const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || error.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface Room {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface Message {
  id: number;
  content: string;
  timestamp: string;
  username: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export const auth = {
  register: (data: { username: string; email: string; password: string }) =>
    apiFetch<User>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiFetch<Token>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),

  me: (token: string) =>
    apiFetch<User>("/api/auth/me", { token }),
};

export const rooms = {
  list: () => apiFetch<Room[]>("/api/rooms/"),

  get: (slug: string) => apiFetch<Room>(`/api/rooms/${encodeURIComponent(slug)}`),

  create: (name: string, token: string) =>
    apiFetch<Room>("/api/rooms/", { method: "POST", body: JSON.stringify({ name }), token }),

  messages: (slug: string, limit = 50, offset = 0) =>
    apiFetch<Message[]>(`/api/rooms/${encodeURIComponent(slug)}/messages?limit=${limit}&offset=${offset}`),

  online: (slug: string) =>
    apiFetch<{ room_slug: string; online_users: string[]; count: number }>(
      `/api/rooms/${encodeURIComponent(slug)}/online`
    ),
};

export function getWsUrl(slug: string, token: string): string {
  const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  return `${wsBase}/ws/chat/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}`;
}
