# Technical Decisions

## Architecture Overview

DocIntel is a single Next.js 14 application using the App Router. The frontend and backend live in the same repo — React components handle the UI, and Next.js API routes handle all server-side logic including authentication, file processing, and AI interactions.

```
User → Next.js Frontend (React components)
     → Next.js API Routes
          → PostgreSQL (Prisma ORM) — users, documents, chunks, conversations, messages
          → Cloudinary                — PDF/DOCX file storage
          → Pinecone                  — vector embeddings for semantic search
          → OpenAI                    — text-embedding-3-small + GPT-4o
```

**Request flow for a question:**
1. User selects a document and types a question
2. Frontend sends POST to `/api/chat` with question + documentId
3. API detects intent (general chat vs document question) using gpt-4o-mini
4. If document question: embed the question → query Pinecone → fetch matching chunk text from DB
5. Build RAG prompt with retrieved context → stream GPT-4o response via SSE
6. Frontend reads the stream and renders tokens as they arrive

**Upload and processing flow:**
1. User uploads a file → API saves to Cloudinary, creates DB record (status: PENDING)
2. API responds immediately — processing runs in the background
3. Pipeline: extract text → chunk into 500-token pieces → generate embeddings → store in Pinecone
4. Document status updates: PENDING → PROCESSING → READY (or FAILED)
5. Frontend polls the status endpoint every 2 seconds until READY

**Authentication:** Custom JWT stored in an httpOnly cookie. Every API route calls `getUserFromRequest()` which verifies the JWT and returns the user payload or null.

---

## Key Decisions

### Chunking Strategy

Paragraph-aware chunking was chosen over fixed character/token splits:

- Fixed splits break sentences mid-thought, degrading semantic coherence
- Paragraph splits respect natural document structure and meaning boundaries
- Better semantic coherence produces better similarity matches in Pinecone
- 50-token overlap between adjacent chunks preserves context at boundaries
- tiktoken (cl100k_base) for accurate token counting ensures chunks fit embedding model limits

Chunk size of 500 tokens is a balance between context richness (larger = more info per chunk) and retrieval precision (smaller = more targeted matches).

### Vector Store: Pinecone

- Managed service with no infrastructure to maintain
- Free tier sufficient for this project's scale
- Fast similarity search with metadata filtering by `documentId`
- The `documentId` filter ensures queries only return results from the selected document
- Simple SDK with clean Next.js compatibility

### Embedding Model: text-embedding-3-small

- 1536 dimensions — good balance of quality and storage cost
- Significantly cheaper than text-embedding-3-large
- Sufficient quality for document Q&A at this scale
- Uses cl100k_base tokenizer — same as GPT-4o — so token counts are consistent

### LLM: GPT-4o

- Best instruction-following for RAG prompts among available models
- Reliably responds with "I couldn't find information about that in this document" when context is absent
- Streaming support integrates cleanly with Next.js ReadableStream and SSE
- Strong performance on multi-document comparison tasks

### Authentication: Custom JWT

NextAuth was not used because:

- Full control over token structure and cookie settings
- Simpler to audit for security — fewer moving parts
- No third-party dependency for a security-critical feature
- httpOnly cookies prevent XSS token theft
- Sufficient for this project's authentication scope

### File Storage: Cloudinary

- Generous free tier for this project's scale
- Simple upload API with buffer support
- Files stored outside the Next.js server — required because Vercel's filesystem is ephemeral
- Raw resource type supports PDF and DOCX without conversion

### Background Processing Pipeline

The processing pipeline runs fire-and-forget after the upload API responds:

- Users get an instant response after upload — no waiting for extraction/embedding
- Text extraction and embedding for large documents can take 10–30 seconds
- Status polling keeps the user informed without blocking the upload API
- If the pipeline fails, the document is marked FAILED with a specific error message

### Duplicate Document Detection

SHA-256 hashing prevents redundant processing when the same file is uploaded more than once:

- The file buffer is hashed immediately after reading the multipart form data
- The hash is checked against existing READY documents for the same user before any other operation runs
- If a match is found, the existing document is returned instantly — no Cloudinary upload, no text extraction, no embedding calls
- This eliminates wasted API spend when users re-upload the same file
- The hash is stored in a `fileHash` column on the Document table

### Retry Pipeline for Failed Documents

Failed documents can be retried from the UI without re-uploading the file:

- A `POST /api/documents/[id]/retry` route resets the document status and re-runs the full processing pipeline in the background
- Before re-processing, any partial data from the previous attempt (DB chunks, Pinecone vectors) is deleted first to avoid duplicates
- The file is re-downloaded from Cloudinary using Node's native `https` module to avoid issues with Next.js's request-context-bound `fetch` in background tasks
- The frontend shows a retry icon on FAILED document cards and polls status exactly like a fresh upload

### Source Attribution in Multi-Document Comparison

Comparison responses include per-document, per-page source attribution:

- After querying Pinecone for each document separately, sources are collected from all matched chunks — each carrying `documentId`, `documentName`, and `pageNumber`
- Saved to the `Message.sources` JSON field alongside the response text
- The `SourceAttribution` component detects multi-document context and renders `DocumentName · Page X` badges rather than plain `Page X`, making it clear which document each cited passage came from

### Conversation Export as PDF

Users can export conversation history to a structured, readable PDF:

- Each conversation row in the history panel has an individual export button
- A top-level "Export Full History" button exports every conversation for the selected document(s) into one combined PDF, with each conversation on a new page
- PDF generation is entirely client-side via `jsPDF` — no server round-trip or new API endpoint needed
- PDF layout includes: branded header with document names and export date, per-conversation type and timestamp headers, color-coded message blocks with left accent bars distinguishing user from assistant, source page attribution below assistant replies, and a page counter footer on every page

### Intent Detection Before RAG

A gpt-4o-mini call classifies each message as `general_chat` or `knowledge_base` before running the full RAG pipeline:

- Greetings like "hi" or "thanks" do not trigger embedding generation or Pinecone queries
- Reduces cost and latency significantly for conversational messages
- gpt-4o-mini is very cheap (well under $0.001 per classification)

### Full Chunk Content from DB

After Pinecone returns matching chunk IDs, the API fetches the full chunk content from PostgreSQL rather than relying on Pinecone metadata:

- Pinecone metadata has size limits — storing full text in metadata is unreliable for large chunks
- PostgreSQL is the source of truth for chunk content
- This ensures GPT-4o always receives complete context regardless of chunk size

---

## Trade-offs Made

- **Page number tracking in DOCX** is approximate — estimated from word count at 300 words per page. Exact page tracking would require page break detection in the DOCX XML, which mammoth does not expose.

- **Conversation history is capped at last 6 messages** to avoid exceeding GPT-4o's context window. Longer conversations lose early context. A summarisation approach could preserve early context but adds complexity.

- **Pinecone free tier limits** apply to total vectors stored. With many users uploading large documents, a paid plan or migrating to pgvector (storing vectors in PostgreSQL) would be more cost-effective.

- **No rate limiting on API routes.** In production, per-user rate limiting would be essential to control OpenAI costs and prevent abuse.

- **File size limit is 10MB.** Very large documents may need a chunked upload approach. 10MB covers most real-world PDFs and DOCX files.

- **Embedding tokens are counted exactly** (tiktoken at chunk-creation time) but message tokens in analytics are approximated at 4 characters per token. The RAG prompt context tokens are not tracked, so estimated cost is lower than actual.

---

## AI Tool Usage

This project was built through a deliberate collaboration between my own architectural design and Claude Code as a coding accelerator.

**My role — architecture and product decisions:**

The overall system design was planned before writing a single line of code. This included the database schema (normalised five-table design with cascade deletes), the decision to keep chunk content in PostgreSQL rather than Pinecone metadata, the fire-and-forget pipeline pattern, the intent detection layer before RAG, the multi-document comparison flow with per-document vector queries, and the full feature scope. These structural decisions were mine — Claude Code executed them.

**How Claude Code was used:**

- **Project setup and scaffolding:** I described the architecture and Claude Code generated the initial file structure, Prisma schema, API route shells, and component layout. This saved hours of boilerplate work.
- **Service implementations:** The chunker, embedder, vectordb service, and LLM streaming logic were co-developed with Claude Code — I specified the behaviour (paragraph-aware chunking, token-based overlap, SSE streaming protocol) and Claude translated it into working code that I reviewed and adjusted.
- **Prompt engineering:** The RAG system prompt and comparison prompt went through several iterations. I directed what constraints the prompt needed ("only answer from context", "never hallucinate") and Claude Code drafted and refined the prompt text.
- **Feature implementation:** Newer features — duplicate document detection, the retry pipeline, source attribution for comparisons, and the PDF export — were implemented with Claude Code assistance. I described exactly what each feature should do and how it should integrate with the existing system; Claude wrote the code and I reviewed each change.
- **Debugging:** Integration issues such as Pinecone SDK v7 API differences, Next.js App Router `fetch` behaviour in background tasks, and Cloudinary raw resource access were diagnosed and resolved with Claude Code's help.

**What was reviewed and adjusted manually:**

All security-critical code — JWT signing and verification, password hashing, ownership checks on every API route — was read line by line and verified manually. When Claude Code generated code that did not match my intended design (e.g., the original page number estimation logic), it was identified through code review and corrected. No AI-generated code was accepted without reading and understanding it.

**Summary:** Claude Code acted as a fast, capable implementation partner. The architectural decisions, product design, and final code review remained mine throughout. The combination allowed the full feature set to be shipped in the assessment window without sacrificing code quality or understanding.

---

## Scaling Considerations

How this system would handle 1000x more documents and users:

- **Database:** Add indexes on `userId`, `documentId`, and `status` columns. Consider read replicas for heavy query load. The current schema already normalises data well for this.

- **Processing pipeline:** Replace fire-and-forget with a proper job queue (BullMQ + Redis). This enables retries on failure, prioritisation, monitoring, and horizontal scaling of workers.

- **Vector storage:** Pinecone scales well but cost grows linearly with vectors stored. At scale, pgvector (vectors stored directly in PostgreSQL) eliminates a separate service dependency and can be more cost-effective.

- **File storage:** Cloudinary scales but direct S3 or R2 would be more cost-effective at high volume.

- **LLM costs:** Cache embeddings per chunk (already stored in Pinecone — this is done). Cache responses for identical questions against the same document version. Add per-user rate limiting to prevent runaway costs.

- **Streaming:** The current SSE approach works well. For very high concurrency, deploying chat/compare routes to Vercel Edge Runtime would reduce cold start latency.

- **Authentication:** The current JWT approach scales horizontally without shared session state. No changes needed for scale.
