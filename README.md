# ResearchPilot 🚀
> **Production-Grade Full-Stack AI/RAG (Retrieval-Augmented Generation) Hub**

ResearchPilot is a cloud-native full-stack AI application designed to parse, index, and query scientific PDF research papers. Built using a modern and highly optimized stack, it processes documents into chunks, generates vector embeddings, and runs semantic search against a high-speed vector index in the cloud.

---

## 🛠️ Tech Stack

### **Frontend**
*   **Next.js 16 (App Router):** Modern React framework.
*   **TypeScript:** Type safety.
*   **Tailwind CSS:** Responsive dark-mode dashboard UI.
*   **Lucide React:** Premium clean UI icons.

### **Backend**
*   **FastAPI (Python):** High-performance asynchronous REST API.
*   **SQLAlchemy ORM:** Database management and query compilation.
*   **PyMuPDF:** High-accuracy PDF text extraction.

### **AI & Databases**
*   **Supabase PostgreSQL:** Cloud database hosting.
*   **`pgvector` (HNSW Indexing):** Advanced high-speed vector similarity search using Cosine Distance.
*   **Google Gemini API:** `models/gemini-embedding-001` for semantic vector embeddings.
*   **Cerebras Cloud SDK:** `gemma-4-31b` on ultra-low latency AI hardware for response synthesis.

---

## 🏗️ System Architecture

```text
┌───────────────────────┐
│  Next.js 16 Frontend  │
└───────────┬───────────┘
            │  (REST API / CORS)
            ▼
┌───────────────────────┐      (Embeddings API)      ┌─────────────────────┐
│  FastAPI Python Host  ├───────────────────────────>│  Google Gemini API  │
└───────────┬───────────┘                            └─────────────────────┘
            │
            ├───────────────────────────────────────>┌─────────────────────┐
            │                  (Inference API)       │ Cerebras Cloud AI   │
            ▼                                        └─────────────────────┘
┌────────────────────────────────────────┐
│  Supabase PostgreSQL + pgvector (HNSW) │
└────────────────────────────────────────┘
```

---

## 🚦 Getting Started

### **1. Prerequisites**
Ensure you have the following installed on your machine:
*   [Node.js (v18+)](https://nodejs.org/)
*   [Python (3.10+)](https://www.python.org/)
*   [Git](https://git-scm.com/)

---

### **2. Running the Backend**

1.  Navigate to the backend directory:
    ```bash
    cd researchpilot-backend
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Configure your environment variables in `.env`:
    ```env
    DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres
    CEREBRAS_API_KEY=your_cerebras_key
    GEMINI_API_KEY=your_gemini_key
    CORS_ORIGINS=http://localhost:3000
    ```
4.  Run the API server:
    ```bash
    uvicorn main:app --reload
    ```
    *   API Docs will be live at: `http://127.0.0.1:8000/docs`

---

### **3. Running the Frontend**

1.  Navigate to the frontend directory:
    ```bash
    cd ../researchpilot-frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    *   Open your browser to: `http://localhost:3000`
