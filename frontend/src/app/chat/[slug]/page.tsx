"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { rooms, getWsUrl, getAvatarUrl, Message, Room } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/lib/toast-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ChatRoomPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, token } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!slug) return;

    Promise.all([
      rooms.get(slug).catch(() => null),
      rooms.messages(slug, 100).catch(() => []),
    ])
      .then(([roomData, msgs]) => {
        setRoom(roomData);
        setMessages(msgs);
        setLoading(false);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!slug || !token) return;

    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let attempt = 0;
    let unmounted = false;

    const connect = () => {
      const wsUrl = getWsUrl(slug, token);
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        attempt = 0;
      };

      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        if (!data || typeof data !== "object") return;

        switch (data.type) {
          case "connected":
            setOnlineUsers(data.online_users || []);
            break;
          case "chat_message":
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now(),
                content: data.message,
                file_url: data.file_url || null,
                file_type: data.file_type || null,
                username: data.username,
                timestamp: data.timestamp || new Date().toISOString(),
                avatar_url: data.avatar_url || null,
              },
            ]);
            break;
          case "user_joined":
          case "user_left":
            setOnlineUsers(data.online_users || []);
            break;
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!unmounted) {
          const delay = Math.min(1000 * 2 ** attempt, 30000);
          attempt++;
          reconnectTimeout = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      wsRef.current = null;
    };
  }, [slug, token]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
      return;

    wsRef.current.send(JSON.stringify({ message: input.trim() }));
    setInput("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !slug || !token) return;

    if (file.size > 10 * 1024 * 1024) {
      toast("File too large (max 10MB)", "error");
      return;
    }

    setUploading(true);
    try {
      await rooms.uploadFile(slug, file, token);
      toast("File shared", "success");
    } catch (err: any) {
      toast(err.message || "Failed to upload file", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar - Online Users */}
      <aside className="hidden w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 md:flex md:flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-500">
            &larr; Back to rooms
          </Link>
          <h2 className="mt-2 font-semibold text-gray-900 dark:text-white">
            {room?.name || slug}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {onlineUsers.length} online
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Online
          </h3>
          <ul className="space-y-2">
            {onlineUsers.map((u) => (
              <li key={u} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 animate-fade-in">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse-dot" />
                <span>{u}</span>
                {u === user?.username && (
                  <span className="text-xs text-gray-400">(you)</span>
                )}
              </li>
            ))}
            {onlineUsers.length === 0 && (
              <li className="text-sm text-gray-400">No one online</li>
            )}
          </ul>
        </div>
      </aside>

      {/* Main Chat */}
      <div className="flex flex-1 flex-col">
        {/* Chat Header */}
        <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 md:hidden">
              &larr;
            </Link>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white">
                {room?.name || slug}
              </h1>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {connected ? "Connected" : "Disconnected"}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 md:hidden">
                  &middot; {onlineUsers.length} online
                </span>
              </div>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-400 dark:text-gray-500">
                No messages yet. Say hello!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.username === user?.username;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {msg.username}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className={`msg-bubble max-w-xs rounded-lg px-4 py-2.5 text-sm animate-fade-in ${
                      isMe
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-none"
                    }`}
                  >
                    {msg.content && !msg.file_url && msg.content}

                    {msg.file_type === "image" && msg.file_url && (
                      <div className="mt-1">
                        <a href={`${API_URL}${msg.file_url}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={`${API_URL}${msg.file_url}`}
                            alt={msg.content}
                            className="max-h-64 rounded-md object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            loading="lazy"
                          />
                        </a>
                        {msg.content && msg.content !== "Shared a file" && (
                          <p className="mt-1 text-xs opacity-75">{msg.content}</p>
                        )}
                      </div>
                    )}

                    {msg.file_type === "file" && msg.file_url && (
                      <div className="mt-1">
                        <a
                          href={`${API_URL}${msg.file_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors ${
                            isMe
                              ? "bg-blue-500 hover:bg-blue-400"
                              : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                          <span className="truncate max-w-[150px]">{msg.content}</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={sendMessage}
          className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
        >
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.zip"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!connected || uploading}
              className="shrink-0 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Share file"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                uploading
                  ? "Uploading..."
                  : connected
                  ? "Type a message..."
                  : "Connecting..."
              }
              disabled={!connected || uploading}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={!connected || !input.trim() || uploading}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
