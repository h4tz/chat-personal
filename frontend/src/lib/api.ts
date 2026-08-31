const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || error.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return null as unknown as T;
  return res.json();
}

export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
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
  file_url: string | null;
  file_type: string | null;
  timestamp: string;
  username: string;
  avatar_url: string | null;
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

  updateProfile: (data: { username?: string; bio?: string }, token: string) =>
    apiFetch<User>("/api/auth/profile", { method: "PUT", body: JSON.stringify(data), token }),

  uploadAvatar: (file: File, token: string) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<User>("/api/auth/avatar", { method: "POST", body: formData, token });
  },
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

  uploadFile: (slug: string, file: File, token: string) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<{ file_url: string; file_type: string; filename: string }>(
      `/api/rooms/${encodeURIComponent(slug)}/upload`,
      { method: "POST", body: formData, token }
    );
  },
};

export function getWsUrl(slug: string, token: string): string {
  const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  return `${wsBase}/ws/chat/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}`;
}

export function getAvatarUrl(url: string | null): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
}
