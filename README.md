# Chat App

A real-time chat application with WebSocket support, built with FastAPI (backend) and Next.js (frontend).

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, SQLAlchemy, SQLite |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Auth | JWT (python-jose), bcrypt |
| Real-time | Native WebSocket |

## Features

- User registration and login with JWT authentication
- Create, browse, and delete chat rooms
- Real-time messaging via WebSockets
- Online user presence tracking with join/leave notifications
- Paginated message history
- Dark/light mode with system preference detection
- Auto-reconnect on WebSocket disconnect (exponential backoff)
- Responsive design with mobile-friendly layout
- Toast notifications for user feedback
- Smooth animations with reduced-motion accessibility support

## Project Structure

```
chat-app/
├── backend/
│   ├── main.py              # App entry point, CORS, routes
│   ├── auth.py              # JWT tokens, bcrypt, OAuth2
│   ├── database.py          # SQLAlchemy engine, session
│   ├── models.py            # User, Room, Message models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── ws_manager.py        # WebSocket handler, broadcast
│   ├── errors.py            # Centralized exception handlers
│   ├── routers/
│   │   ├── auth.py          # Register, login, me endpoints
│   │   └── rooms.py         # Room CRUD + messages + online
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root layout with providers
│   │   │   ├── page.tsx            # Home page (room list)
│   │   │   ├── globals.css         # Tailwind + animations
│   │   │   ├── login/page.tsx      # Login page
│   │   │   ├── register/page.tsx   # Registration page
│   │   │   └── chat/[slug]/page.tsx # Chat room page
│   │   ├── components/
│   │   │   └── theme-toggle.tsx    # Dark/light toggle
│   │   └── lib/
│   │       ├── api.ts              # API client
│   │       ├── auth-context.tsx     # Auth state
│   │       ├── theme-context.tsx    # Theme state
│   │       └── toast-context.tsx    # Toast notifications
│   └── package.json
└── README.md
```

## Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The SQLite database (`chat.db`) is created automatically on first run.

API docs available at http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Access the app at http://localhost:3000

### Environment Variables

**Backend** (`backend/.env`):

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `change-this-to-a-real-secret-in-production` | JWT signing secret |
| `DATABASE_URL` | `sqlite:///./chat.db` | Database connection string |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins (comma-separated) |

**Frontend** (`frontend/.env.local`):

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend REST API URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` | Backend WebSocket URL |

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | No | Health check |
| `POST` | `/api/auth/register` | No | Create account |
| `POST` | `/api/auth/login` | No | Login, returns JWT |
| `GET` | `/api/auth/me` | Yes | Get current user |
| `GET` | `/api/rooms/` | No | List all rooms |
| `POST` | `/api/rooms/` | Yes | Create a room |
| `GET` | `/api/rooms/{slug}` | No | Get room details |
| `DELETE` | `/api/rooms/{slug}` | Yes | Delete a room |
| `GET` | `/api/rooms/{slug}/messages` | No | Get paginated messages |
| `GET` | `/api/rooms/{slug}/online` | No | Get online users |
| `WS` | `/ws/chat/{slug}?token=` | Yes | Real-time chat |

## WebSocket Events

**Server -> Client:**

```json
{"type": "connected", "message": "Welcome!", "online_users": ["user1"]}
{"type": "chat_message", "username": "user1", "message": "Hello!", "timestamp": "..."}
{"type": "user_joined", "username": "user2", "online_users": ["user1", "user2"]}
{"type": "user_left", "username": "user1", "online_users": ["user2"]}
```

**Client -> Server:**

```json
{"message": "your message here"}
```
