# Chat App - Project Tracker

## Architecture

```
chat-app/
├── backend/          # FastAPI + Python
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── auth.py
│   ├── websockets.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   └── rooms.py
│   └── requirements.txt
├── frontend/         # Next.js + React + TypeScript
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── package.json
└── tracker.md
```

## Tech Stack

| Layer    | Tech                                              |
|----------|---------------------------------------------------|
| Backend  | FastAPI, SQLAlchemy, SQLite, Pydantic, bcrypt, python-jose |
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS |
| Real-time| FastAPI WebSockets (native)                      |
| Auth     | JWT (access tokens)                               |

## Features

- [ ] User Authentication (Register/Login with JWT)
- [ ] Real-time Chat (WebSocket-based messaging)
- [ ] Chat Rooms (Create and browse rooms)
- [ ] Online Users (See who's in a room)
- [ ] Message History (Load previous messages on join)
- [ ] Modern UI (Dark mode, responsive, animations)
- [ ] Error Handling (Validation, toasts, reconnection)

## Progress

### Batch 1 (Steps 1-5) ✅ DONE
- [x] Step 1: Create tracker.md
- [x] Step 2: Scaffold FastAPI project (backend/, main.py, requirements.txt)
- [x] Step 3: Database setup (SQLAlchemy, models: User, Room, Message)
- [x] Step 4: Auth system (JWT, register/login/me endpoints, bcrypt)
- [x] Step 5: Room CRUD endpoints (list, create, get, delete)

### Files Created/Edited (Batch 1)
- tracker.md - project tracker
- backend/requirements.txt - Python dependencies
- backend/main.py - FastAPI app entry point
- backend/database.py - SQLAlchemy engine + session
- backend/models.py - User, Room, Message models
- backend/schemas.py - Pydantic request/response schemas
- backend/auth.py - JWT + password hashing utilities
- backend/routers/auth.py - /api/auth endpoints
- backend/routers/rooms.py - /api/rooms endpoints
- .gitignore - ignore venv, cache, db, node_modules

### Batch 2 (Steps 6-10) ✅ DONE
- [x] Step 6: Message history endpoint (GET /api/rooms/{slug}/messages, paginated)
- [x] Step 7: WebSocket handler (connect, join, send, receive, broadcast)
- [x] Step 8: Online users tracking (WebSocket events + REST endpoint)
- [x] Step 9: Error handling & validation (Pydantic validators, error handlers)
- [x] Step 10: Scaffold Next.js frontend (TypeScript, Tailwind, App Router)

### Files Created/Edited (Batch 2)
- backend/websockets.py - WebSocket handler + online users tracking
- backend/main.py - added WebSocket route + error handlers
- backend/routers/rooms.py - added message history + online users endpoints
- backend/schemas.py - added field validation (min/max lengths)
- backend/errors.py - centralized error handlers
- frontend/ - Next.js project (create-next-app)
- frontend/src/lib/api.ts - API client (auth, rooms, messages, WebSocket URL)

### Batch 3 (Steps 11-15)
- [ ] Step 11: Auth pages (login/register)
- [ ] Step 12: Room list page
- [ ] Step 13: Chat room page (WebSocket)
- [ ] Step 14: Message history UI
- [ ] Step 15: Online users UI

### Batch 4 (Steps 16-20)
- [ ] Step 16: Modern UI (dark mode, animations)
- [ ] Step 17: Error handling UI (toasts, validation)
- [ ] Step 18: Integration testing
- [ ] Step 19: Cleanup & optimization
- [ ] Step 20: Documentation & final review

## Notes

- Backend runs on port 8000 (uvicorn)
- Frontend runs on port 3000
- WebSocket endpoint: ws://localhost:8000/ws/chat/{slug}/
- Database: SQLite (chat.db)
