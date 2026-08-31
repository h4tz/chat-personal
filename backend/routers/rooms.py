import os
import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from database import get_db
from models import Room, Message, User
from schemas import RoomCreate, RoomResponse, MessageResponse, FileUploadResponse
from auth import get_current_user
from ws_manager import get_online_users

router = APIRouter()

FILE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "files")
ALLOWED_FILE_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "text/plain",
    "application/zip", "application/x-zip-compressed",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text


@router.get("/", response_model=list[RoomResponse])
def list_rooms(db: Session = Depends(get_db)):
    return db.query(Room).order_by(Room.created_at.desc()).all()


@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    room_data: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slug = slugify(room_data.name)
    if not slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room name must contain at least one letter or number",
        )
    if db.query(Room).filter(Room.slug == slug).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room with this name already exists",
        )

    room = Room(name=room_data.name, slug=slug)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.get("/{slug}", response_model=RoomResponse)
def get_room(slug: str, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.slug == slug).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )
    return room


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = db.query(Room).filter(Room.slug == slug).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )
    db.query(Message).filter(Message.room_id == room.id).delete()
    db.delete(room)
    db.commit()


@router.get("/{slug}/messages", response_model=list[MessageResponse])
def get_messages(
    slug: str,
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    room = db.query(Room).filter(Room.slug == slug).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )

    messages = (
        db.query(Message)
        .options(joinedload(Message.user))
        .filter(Message.room_id == room.id)
        .order_by(Message.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        MessageResponse(
            id=msg.id,
            content=msg.content,
            file_url=msg.file_url,
            file_type=msg.file_type,
            timestamp=msg.timestamp,
            username=msg.user.username,
            avatar_url=msg.user.avatar_url,
        )
        for msg in reversed(messages)
    ]


class OnlineUsersResponse(BaseModel):
    room_slug: str
    online_users: list[str]
    count: int


@router.get("/{slug}/online", response_model=OnlineUsersResponse)
def room_online_users(slug: str, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.slug == slug).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )
    users = get_online_users(slug)
    return OnlineUsersResponse(room_slug=slug, online_users=users, count=len(users))


@router.post("/{slug}/upload", response_model=FileUploadResponse)
async def upload_file(
    slug: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = db.query(Room).filter(Room.slug == slug).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )

    if file.content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large (max 10MB)",
        )

    ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin"
    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(FILE_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    file_type = "image" if file.content_type.startswith("image/") else "file"
    file_url = f"/uploads/files/{filename}"

    msg = Message(
        content=file.filename or "Shared a file",
        file_url=file_url,
        file_type=file_type,
        room_id=room.id,
        user_id=current_user.id,
    )
    db.add(msg)
    db.commit()

    from ws_manager import broadcast
    await broadcast(slug, {
        "type": "chat_message",
        "username": current_user.username,
        "message": msg.content,
        "file_url": file_url,
        "file_type": file_type,
        "timestamp": msg.timestamp.isoformat(),
    })

    return FileUploadResponse(file_url=file_url, file_type=file_type, filename=file.filename or "file")
