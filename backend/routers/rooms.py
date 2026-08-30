import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Room, User
from schemas import RoomCreate, RoomResponse
from auth import get_current_user

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
