import google.generativeai as genai
from openai import AsyncOpenAI
from cerebras.cloud.sdk import Cerebras
from app.config import get_settings
from typing import List, Dict, Any
import asyncio
from functools import partial

settings = get_settings()

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

openai_client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
cerebras_client = Cerebras(api_key=settings.cerebras_api_key)

async def get_embedding(text: str) -> List[float]:
    """Generates a 1536-dimensional vector embedding for input text using Gemini (or OpenAI fallback)."""
    # Try Gemini first if key exists
    if settings.gemini_api_key:
        try:
            loop = asyncio.get_event_loop()
            func = partial(
                genai.embed_content,
                model="models/gemini-embedding-001",
                content=text
            )
            res = await loop.run_in_executor(None, func)
            emb = res['embedding']
            # Gemini text-embedding-004 outputs 768 dimensions. Pad to 1536 to match DB vector column
            if len(emb) < 1536:
                emb = emb + [0.0] * (1536 - len(emb))
            return emb[:1536]
        except Exception as e:
            print(f"Gemini embedding failed: {e}")

    # Fallback to OpenAI if key exists
    if openai_client:
        try:
            response = await openai_client.embeddings.create(
                input=text,
                model="text-embedding-3-small"
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"OpenAI embedding failed: {e}")
            raise e

    raise Exception("No active embedding provider configured.")

async def generate_chat_completion(messages: List[Dict[str, str]], stream: bool = False) -> Any:
    """Generates text completions using Cerebras ultra-fast inference (llama-3.3-70b)."""
    try:
        loop = asyncio.get_event_loop()
        func = partial(
            cerebras_client.chat.completions.create,
            messages=messages,
            model="gemma-4-31b",
            stream=stream
        )
        response = await loop.run_in_executor(None, func)
        return response
    except Exception as e:
        print(f"Error generating LLM completion: {e}")
        raise e