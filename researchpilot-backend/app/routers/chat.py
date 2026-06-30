from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models import Workspace, Paper, PaperChunk, Conversation, Message
from app.schemas import ChatRequest, ChatResponse
from app.services.llm_service import get_embedding, generate_chat_completion

router = APIRouter(prefix="/api/chat", tags=["RAG Chat"])

@router.post("", response_model=ChatResponse)
async def chat_with_workspace(chat_in: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Handles semantic vector search RAG and generates answers using Cerebras LLM."""
    
    # 1. Verify workspace exists
    ws_result = await db.execute(select(Workspace).where(Workspace.id == chat_in.workspace_id))
    if not ws_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workspace not found.")

    # 2. Get or create conversation thread
    conversation_id = chat_in.conversation_id
    if not conversation_id:
        conv = Conversation(workspace_id=chat_in.workspace_id, title=chat_in.message[:30] + "...")
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        conversation_id = conv.id

    # 3. Generate embedding vector for the user's question
    query_vector = await get_embedding(chat_in.message)

    # 4. Perform pgvector Cosine Similarity Search to find top 5 matching text chunks across workspace papers
    stmt = (
        select(PaperChunk, Paper.title)
        .join(Paper, PaperChunk.paper_id == Paper.id)
        .where(Paper.workspace_id == chat_in.workspace_id)
        .order_by(PaperChunk.embedding.cosine_distance(query_vector))
        .limit(5)
    )
    search_result = await db.execute(stmt)
    matched_rows = search_result.all()

    # Build context string and source paper titles
    context_chunks = []
    sources = set()
    for chunk, paper_title in matched_rows:
        context_chunks.append(f"[Source: {paper_title}]\n{chunk.content}")
        sources.add(paper_title)

    combined_context = "\n\n---\n\n".join(context_chunks)

    # 5. Build prompt for Cerebras LLM
    system_prompt = (
        "You are ResearchPilot, an expert AI research assistant. "
        "Answer the user's question using ONLY the provided research paper context below. "
        "If the answer cannot be found in the context, clearly state that based on the papers provided.\n\n"
        f"CONTEXT FROM PAPERS:\n{combined_context}"
    )

    messages_payload = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": chat_in.message}
    ]

    # 6. Call Cerebras Cloud for ultra-fast response generation
    llm_response = await generate_chat_completion(messages_payload)
    ai_answer = llm_response.choices[0].message.content

    # 7. Save user question and AI answer to Supabase chat history
    user_msg = Message(conversation_id=conversation_id, sender="user", content=chat_in.message)
    ai_msg = Message(
        conversation_id=conversation_id, 
        sender="assistant", 
        content=ai_answer,
        agent_logs={"sources": list(sources), "retrieved_chunks_count": len(matched_rows)}
    )
    db.add(user_msg)
    db.add(ai_msg)
    await db.commit()

    return ChatResponse(
        conversation_id=conversation_id,
        answer=ai_answer,
        sources=list(sources)
    )