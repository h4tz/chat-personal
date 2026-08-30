# Chat App - Project Tracker

## Architecture

```
chat-app/
├── backend/              # FastAPI + Python
│   ├── main.py           # App entry, CORS, routes, WS endpoint
│   ├── models.py         # SQLAlchemy: User, Room, Message
│   ├── schemas.py        # Pydantic request/response models
│   ├── database.py       # SQLAlchemy engine + session
│   ├── auth.py           # JWT tokens + bcrypt hashing
│   ├── ws_manager.py     # WebSocket handler + online users
│   ├── errors.py         # Centralized error handlers
│   ├── routers/
│   │   ├── auth.py       # POST /register, /login, GET /me
│   │   └── rooms.py      # CRUD + messages + online endpoints
│   └── requirements.txt
├── frontend/             # Next.js + React + TypeScript
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Root layout (Theme+Auth+Toast providers)
│   │   │   ├── page.tsx             # Room list + create room
│   │   │   ├── globals.css          # Tailwind + animations
│   │   │   ├── login/page.tsx       # Login form
│   │   │   ├── register/page.tsx    # Register form
│   │   │   └── chat/[slug]/page.tsx # Chat room (WS + history + online)
│   │   ├── components/
│   │   │   └── theme-toggle.tsx     # Dark/light mode toggle
│   │   └── lib/
│   │       ├── api.ts               # API client
│   │       ├── auth-context.tsx      # JWT auth state
│   │       ├── theme-context.tsx     # Dark mode state
│   │       └── toast-context.tsx     # Toast notifications
│   └── package.json
├── .gitignore
└── tracker.md
```

## Tech Stack

| Layer    | Tech                                                    |
|----------|---------------------------------------------------------|
| Backend  | FastAPI, SQLAlchemy, SQLite, Pydantic, bcrypt, python-jose |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS |
| Real-time| FastAPI WebSockets (native)                            |
| Auth     | JWT (access tokens, 60min expiry)                       |

## Features

- [x] User Authentication (Register/Login with JWT)
- [x] Real-time Chat (WebSocket-based messaging)
- [x] Chat Rooms (Create and browse rooms)
- [x] Online Users (See who's in a room)
- [x] Message History (Load previous messages on join)
- [x] Modern UI (Dark mode, responsive, animations)
- [x] Error Handling (Validation, toasts, reconnection)

## Progress

### Batch 1 (Steps 1-5) ✅ DONE
- [x] Step 1: Create tracker.md
- [x] Step 2: Scaffold FastAPI project (backend/, main.py, requirements.txt)
- [x] Step 3: Database setup (SQLAlchemy, models: User, Room, Message)
- [x] Step 4: Auth system (JWT, register/login/me endpoints, bcrypt)
- [x] Step 5: Room CRUD endpoints (list, create, get, delete)

### Batch 2 (Steps 6-10) ✅ DONE
- [x] Step 6: Message history endpoint (GET /api/rooms/{slug}/messages, paginated)
- [x] Step 7: WebSocket handler (connect, join, send, receive, broadcast)
- [x] Step 8: Online users tracking (WebSocket events + REST endpoint)
- [x] Step 9: Error handling & validation (Pydantic validators, error handlers)
- [x] Step 10: Scaffold Next.js frontend (TypeScript, Tailwind, App Router)

### Batch 3 (Steps 11-15) ✅ DONE
- [x] Step 11: Auth pages (login/register with JWT context)
- [x] Step 12: Room list page (create/browse rooms)
- [x] Step 13: Chat room page (WebSocket connect/send/receive)
- [x] Step 14: Message history UI (load 100 msgs on join)
- [x] Step 15: Online users UI (sidebar with live presence)

### Batch 4 (Steps 16-20) ✅ DONE
- [x] Step 16: Modern UI (dark mode toggle, fade/slide animations, scrollbar styling)
- [x] Step 17: Error handling UI (toast notifications, success/error/info variants)
- [x] Step 18: Integration testing (all 7 API endpoints verified)
- [x] Step 19: Cleanup & optimization (renamed ws_manager, fixed JWT sub, pinned bcrypt)
- [x] Step 20: Documentation & final review

## API Endpoints

| Method | Endpoint                        | Auth | Description           |
|--------|--------------------------------|------|-----------------------|
| GET    | `/`                            | No   | API health check      |
| POST   | `/api/auth/register`           | No   | Create account        |
| POST   | `/api/auth/login`              | No   | Login, get JWT        |
| GET    | `/api/auth/me`                 | Yes  | Current user info     |
| GET    | `/api/rooms/`                  | No   | List all rooms        |
| POST   | `/api/rooms/`                  | Yes  | Create a room         |
| GET    | `/api/rooms/{slug}`            | No   | Get room details      |
| DELETE | `/api/rooms/{slug}`            | Yes  | Delete a room         |
| GET    | `/api/rooms/{slug}/messages`   | No   | Get message history   |
| GET    | `/api/rooms/{slug}/online`     | No   | Get online users      |
| WS     | `/ws/chat/{slug}?username=`    | No   | WebSocket chat        |

## How to Run

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## WebSocket Protocol

Connect: `ws://localhost:8000/ws/chat/{slug}?username={name}`

Events received:
- `{"type":"connected","message":"...","online_users":[...]}`
- `{"type":"chat_message","username":"...","message":"...","timestamp":"..."}`
- `{"type":"user_joined","username":"...","online_users":[...]}`
- `{"type":"user_left","username":"...","online_users":[...]}`

Events sent:
- `{"message":"your message here"}`
