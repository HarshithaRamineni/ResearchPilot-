from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import os

from app.database import get_db
from app.models import Workspace, Paper, PaperChunk
from app.schemas import WorkspaceCreate, WorkspaceResponse, PaperResponse
from app.services.pdf_service import extract_text_from_pdf, split_text_into_chunks
from app.services.llm_service import get_embedding
from app.config import get_settings

router = APIRouter(prefix="/api/papers", tags=["Papers & Workspaces"])
settings = get_settings()

@router.post("/workspaces", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(workspace_in: WorkspaceCreate, db: AsyncSession = Depends(get_db)):
    """Creates a new workspace folder for grouping research papers."""
    workspace = Workspace(name=workspace_in.name, description=workspace_in.description)
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    return workspace

@router.get("/workspaces", response_model=List[WorkspaceResponse])
async def list_workspaces(db: AsyncSession = Depends(get_db)):
    """Lists all workspace project folders."""
    result = await db.execute(select(Workspace).order_by(Workspace.created_at.desc()))
    return result.scalars().all()

@router.post("/upload", response_model=PaperResponse, status_code=status.HTTP_201_CREATED)
async def upload_paper(
    workspace_id: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Uploads a PDF paper, extracts text, generates vector embeddings, and saves to Supabase."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # 1. Verify workspace exists
    ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    if not ws_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workspace not found.")

    # 2. Read file bytes and save locally
    file_bytes = await file.read()
    saved_file_path = os.path.join(settings.upload_dir, file.filename)
    with open(saved_file_path, "wb") as f:
        f.write(file_bytes)

    # 3. Create Paper record in DB
    paper = Paper(
        workspace_id=workspace_id,
        title=file.filename.replace(".pdf", ""),
        file_path=saved_file_path,
        status="processing"
    )
    db.add(paper)
    await db.commit()
    await db.refresh(paper)

    # 4. Extract text & split into chunks
    raw_text = extract_text_from_pdf(file_bytes)
    chunks = split_text_into_chunks(raw_text)

    # 5. Generate embeddings and save chunks to Supabase pgvector
    for idx, chunk_text in enumerate(chunks):
        embedding_vector = await get_embedding(chunk_text)
        chunk_record = PaperChunk(
            paper_id=paper.id,
            chunk_index=idx,
            content=chunk_text,
            embedding=embedding_vector
        )
        db.add(chunk_record)

    # 6. Mark paper as completed
    paper.status = "completed"
    await db.commit()
    await db.refresh(paper)

    return paper