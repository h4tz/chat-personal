from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import auth, rooms

app = FastAPI(title="Chat App API", version="1.0.0")


@app.on_event("startup")
def on_startup():
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["rooms"])


@app.get("/")
def root():
    return {"message": "Chat App API is running"}
