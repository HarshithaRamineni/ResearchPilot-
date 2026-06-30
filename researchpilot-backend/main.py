import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import papers, chat

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    settings = get_settings()
    os.makedirs(settings.upload_dir, exist_ok=True)
    print("✅ ResearchPilot FastAPI backend started successfully!")
    yield
    print("👋 ResearchPilot backend shutting down...")

app = FastAPI(
    title="ResearchPilot API",
    description="Production-Grade Cloud-Native RAG Hub",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(papers.router)
app.include_router(chat.router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "ResearchPilot Backend"}

