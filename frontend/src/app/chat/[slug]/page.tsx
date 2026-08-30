"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { rooms, getWsUrl, Message, Room } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function ChatRoomPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, token } = useAuth();
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load room info + message history
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

  // Auto scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    if (!slug || !user) return;

    const wsUrl = getWsUrl(slug, user.username);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

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
              username: data.username,
              timestamp: data.timestamp || new Date().toISOString(),
            },
          ]);
          break;
        case "user_joined":
        case "user_left":
          setOnlineUsers(data.online_users || []);
          break;
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [slug, user]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
      return;

    wsRef.current.send(JSON.stringify({ message: input.trim() }));
    setInput("");
  };

  // Redirect if not logged in
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
              <li key={u} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {u}
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
            messages.map((msg, i) => {
              const isMe = msg.username === user?.username;
              return (
                <div
                  key={msg.id + "-" + i}
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
                    className={`max-w-xs rounded-lg px-4 py-2.5 text-sm ${
                      isMe
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-none"
                    }`}
                  >
                    {msg.content}
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
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={connected ? "Type a message..." : "Connecting..."}
              disabled={!connected}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={!connected || !input.trim()}
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
