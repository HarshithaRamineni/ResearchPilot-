import fitz  # PyMuPDF
from typing import List

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts raw text from a PDF file provided as bytes."""
    text = ""
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text

def split_text_into_chunks(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Splits text into overlapping semantic chunks of specified size."""
    chunks = []
    if not text:
        return chunks
        
    text = " ".join(text.split())
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += (chunk_size - overlap)
        
    return chunks