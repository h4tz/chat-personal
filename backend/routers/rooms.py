import re
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Room, Message, User
from schemas import RoomCreate, RoomResponse, MessageResponse
from auth import get_current_user
from ws_manager import get_online_users

router = APIRouter()


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
            timestamp=msg.timestamp,
            username=msg.user.username,
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
