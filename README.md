# DocIntel — AI-Powered Document Intelligence Platform

A full-stack web application that lets you upload documents (PDF and DOCX), ask questions about them using AI, and compare multiple documents side by side.

## Features

- Upload PDF and DOCX files (up to 10MB)
- AI-powered Q&A with source attribution (shows which page answered)
- Multi-document comparison (up to 3 documents)
- Conversation history per document
- JWT authentication (register and login)
- Real-time streaming responses via Server-Sent Events

## Tech Stack

- **Frontend/Backend:** Next.js 14 (App Router)
- **Database:** PostgreSQL with Prisma ORM
- **Vector DB:** Pinecone
- **File Storage:** Cloudinary
- **AI:** OpenAI (GPT-4o + text-embedding-3-small)
- **Auth:** Custom JWT with httpOnly cookies

## Prerequisites

You need accounts and credentials for:

- PostgreSQL database (local or hosted — [Supabase](https://supabase.com) free tier works)
- [Pinecone](https://pinecone.io) (free tier)
- [Cloudinary](https://cloudinary.com) (free tier)
- [OpenAI](https://platform.openai.com) API key

## Setup Instructions

### 1. Clone and install

```bash
git clone <your-repo-url>
cd docintel
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in all values in `.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Any random string, minimum 32 characters |
| `JWT_EXPIRES_IN` | Token expiry, e.g. `7d` |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `OPENAI_API_KEY` | From OpenAI platform |
| `PINECONE_API_KEY` | From Pinecone console |
| `PINECONE_INDEX_NAME` | `docintel` (see step 3) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

### 3. Create Pinecone index

In your Pinecone console:

1. Click **Create index**
2. Name: `docintel`
3. Dimensions: `1536`
4. Metric: `cosine`
5. Cloud/Region: any available on free tier

### 4. Run database migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
app/
  (auth)/                 Login and register pages
  (main)/                 Protected app pages
  api/
    auth/                 Register, login, logout, me
    documents/            Upload, list, delete, status polling
    chat/                 Single document Q&A (streaming)
    compare/              Multi-document comparison (streaming)
    analytics/            Usage stats and cost estimates

components/
  auth/                   Login and register forms
  layout/                 Navbar, Sidebar, MainArea
  documents/              Upload zone, document list, status badges
  chat/                   Chat window, message bubbles, input, streaming indicator
  compare/                Compare window and result display
  analytics/              Analytics panel
  ui/                     Shared EmptyState component

hooks/
  useAuth.js              Auth operations (login, register, logout)
  useDocuments.js         Document CRUD and upload
  useChat.js              Chat state and SSE stream reading
  useCompare.js           Comparison state and SSE stream reading
  usePolling.js           Document status polling
  useFilter.js            Frontend document search and filter

lib/
  auth/                   JWT signing/verification and password hashing
  db/                     Prisma client and DB query functions
  services/               extractor, chunker, embedder, vectordb, llm, storage
  utils/                  constants, fileValidation, errorHandler, tokenCounter

prisma/
  schema.prisma           Database schema
  migrations/             Migration history
```

---

## How It Works

1. **Upload** a PDF or DOCX file
2. The system extracts text, splits it into ~500-token chunks, generates embeddings for each chunk, and stores them in Pinecone
3. **Single document Q&A:** Select one document → ask a question → the system embeds the question, finds the most relevant chunks via similarity search, and sends them as context to GPT-4o → response streams back in real time with source attribution
4. **Multi-document comparison:** Select 2–3 documents → ask a comparison question → the system queries each document separately and GPT-4o compares them with per-document attribution

---

## Deployment

See [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md) for architecture details.

### Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Framework: Next.js (auto-detected)
4. Add all environment variables from `.env.example` before deploying
5. Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL
6. Click **Deploy**

Your `DATABASE_URL` should point to a hosted PostgreSQL instance (Supabase, Railway, Neon, etc.) — Vercel does not provide a database.

---

## Test Credentials

Register a new account at `/register` — no pre-seeded credentials are needed.

---

## Deployment Checklist

After deploying, verify:

- [ ] Register a new account
- [ ] Login and logout work
- [ ] Upload a PDF → status reaches READY
- [ ] Upload a DOCX → status reaches READY
- [ ] Ask a question about a document → streaming response with source attribution
- [ ] Ask a follow-up question → conversation context carries over
- [ ] Ask something not in the document → see "I couldn't find..." response
- [ ] Select 2 documents → ask a comparison question → see per-document response
- [ ] Delete a document → disappears from list
- [ ] Upload an unsupported file type → see error message
- [ ] Upload a file over 10MB → see error message
- [ ] Access `/` without login → redirect to login page
