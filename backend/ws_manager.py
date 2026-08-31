import json
import logging
from fastapi import WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from database import SessionLocal
from models import Message, Room, User
from auth import SECRET_KEY, ALGORITHM

logger = logging.getLogger(__name__)

rooms_connections: dict[str, list[dict]] = {}


def _verify_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            return None
        return int(sub)
    except (JWTError, ValueError):
        return None


async def broadcast(room_slug: str, message: dict, exclude_ws=None):
    if room_slug not in rooms_connections:
        return
    dead = []
    for conn in rooms_connections[room_slug]:
        if conn["websocket"] is exclude_ws:
            continue
        try:
            await conn["websocket"].send_json(message)
        except Exception:
            dead.append(conn)
    for d in dead:
        rooms_connections[room_slug].remove(d)


async def websocket_handler(websocket: WebSocket, slug: str, token: str):
    await websocket.accept()

    db = SessionLocal()
    username = None
    try:
        user_id = _verify_token(token)
        if user_id is None:
            await websocket.send_json({"error": "Invalid or expired token"})
            await websocket.close()
            return

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.send_json({"error": "User not found"})
            await websocket.close()
            return

        username = user.username
        avatar_url = user.avatar_url

        room = db.query(Room).filter(Room.slug == slug).first()
        if not room:
            await websocket.send_json({"error": "Room not found"})
            await websocket.close()
            return

        if slug not in rooms_connections:
            rooms_connections[slug] = []

        rooms_connections[slug].append({
            "websocket": websocket,
            "username": username,
        })

        await broadcast(slug, {
            "type": "user_joined",
            "username": username,
            "online_users": get_online_users(slug),
        })

        await websocket.send_json({
            "type": "connected",
            "message": f"Welcome to {room.name}!",
            "online_users": get_online_users(slug),
        })

        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
                continue

            if not isinstance(payload, dict):
                await websocket.send_json({"error": "Invalid message format"})
                continue

            content = payload.get("message", "").strip()
            if not content:
                continue

            if len(content) > 5000:
                await websocket.send_json({"error": "Message too long (max 5000 chars)"})
                continue

            msg = Message(content=content, room_id=room.id, user_id=user.id)
            db.add(msg)
            db.commit()

            await broadcast(slug, {
                "type": "chat_message",
                "username": username,
                "message": content,
                "timestamp": msg.timestamp.isoformat(),
                "avatar_url": avatar_url,
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.exception("WebSocket error")
        try:
            await websocket.send_json({"error": "Internal server error"})
        except Exception:
            pass
    finally:
        if slug in rooms_connections:
            rooms_connections[slug] = [
                c for c in rooms_connections[slug] if c["websocket"] != websocket
            ]
            if not rooms_connections[slug]:
                del rooms_connections[slug]

        if username:
            await broadcast(slug, {
                "type": "user_left",
                "username": username,
                "online_users": get_online_users(slug),
            })
        db.close()


def get_online_users(room_slug: str) -> list[str]:
    if room_slug not in rooms_connections:
        return []
    return list(set(c["username"] for c in rooms_connections[room_slug]))
