import json
from fastapi import WebSocket, WebSocketDisconnect
from database import SessionLocal
from models import Message, Room, User

rooms_connections: dict[str, list[dict]] = {}


async def broadcast(room_slug: str, message: dict, exclude_sid: str = None):
    if room_slug not in rooms_connections:
        return
    dead = []
    for conn in rooms_connections[room_slug]:
        if conn["sid"] == exclude_sid:
            continue
        try:
            await conn["websocket"].send_json(message)
        except Exception:
            dead.append(conn)
    for d in dead:
        rooms_connections[room_slug].remove(d)


async def websocket_handler(websocket: WebSocket, slug: str, username: str):
    await websocket.accept()

    db = SessionLocal()
    try:
        room = db.query(Room).filter(Room.slug == slug).first()
        if not room:
            await websocket.send_json({"error": "Room not found"})
            await websocket.close()
            return

        user = db.query(User).filter(User.username == username).first()
        if not user:
            await websocket.send_json({"error": "User not found"})
            await websocket.close()
            return

        if slug not in rooms_connections:
            rooms_connections[slug] = []

        sid = f"{websocket.client.host}:{websocket.client.port}"
        rooms_connections[slug].append({
            "sid": sid,
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
            payload = json.loads(data)
            content = payload.get("message", "").strip()

            if not content:
                continue

            msg = Message(content=content, room_id=room.id, user_id=user.id)
            db.add(msg)
            db.commit()

            await broadcast(slug, {
                "type": "chat_message",
                "username": username,
                "message": content,
                "timestamp": msg.timestamp.isoformat(),
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass
    finally:
        if slug in rooms_connections:
            rooms_connections[slug] = [
                c for c in rooms_connections[slug] if c["websocket"] != websocket
            ]
            if not rooms_connections[slug]:
                del rooms_connections[slug]

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
