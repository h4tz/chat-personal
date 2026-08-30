from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class RoomCreate(BaseModel):
    name: str


class RoomResponse(BaseModel):
    id: int
    name: str
    slug: str
    created_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    content: str
    timestamp: datetime
    username: str

    class Config:
        from_attributes = True
