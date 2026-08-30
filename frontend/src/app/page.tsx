"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rooms, Room } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/lib/toast-context";

export default function HomePage() {
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { user, logout, token } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    rooms
      .list()
      .then(setRoomList)
      .catch(() => toast("Failed to load rooms", "error"))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      router.push("/login");
      return;
    }
    setCreating(true);
    try {
      const room = await rooms.create(newRoomName, token);
      setRoomList((prev) => [room, ...prev]);
      setNewRoomName("");
      toast(`Room "${room.name}" created`, "success");
    } catch (err: any) {
      toast(err.message || "Failed to create room", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast("Logged out", "info");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Chat App</h1>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {user.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
              >
                Sign in
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Create Room */}
        {user && (
          <form onSubmit={handleCreate} className="mb-8 flex gap-3">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="New room name..."
              required
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating..." : "Create Room"}
            </button>
          </form>
        )}

        {/* Room List */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Rooms
          </h2>
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Loading rooms...
            </div>
          ) : roomList.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No rooms yet. Create one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {roomList.map((room, i) => (
                <Link
                  key={room.id}
                  href={`/chat/${room.slug}`}
                  className="block rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-blue-500 hover:shadow-md transition-all animate-fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {room.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        /{room.slug}
                      </p>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 text-sm">
                      Join &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
