from fastapi import FastAPI, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from database import init_db
from routers import auth, rooms
from websockets import websocket_handler
from errors import validation_error_handler, http_error_handler, generic_error_handler

app = FastAPI(title="Chat App API", version="1.0.0")

app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(StarletteHTTPException, http_error_handler)
app.add_exception_handler(Exception, generic_error_handler)


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


@app.websocket("/ws/chat/{slug}")
async def ws_chat(websocket: WebSocket, slug: str, username: str = Query(...)):
    await websocket_handler(websocket, slug, username)
