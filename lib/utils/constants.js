// Application-wide constants used across all parts of the project
// Import from here instead of hardcoding values anywhere

// -----------------------------------------------
// File upload limits — used in Part 1 (upload validation)
// -----------------------------------------------
export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB in bytes
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx']

// -----------------------------------------------
// Document selection limits — used in Part 1 (sidebar UI)
// -----------------------------------------------
export const MAX_SELECTED_DOCS = 3   // Maximum docs that can be selected at once
export const MIN_DOCS_FOR_COMPARE = 2 // Minimum docs needed to start comparison

// -----------------------------------------------
// Polling interval — used in Part 1 (usePolling hook)
// How often the frontend checks a document's processing status
// -----------------------------------------------
export const POLLING_INTERVAL_MS = 2000 // 2 seconds

// -----------------------------------------------
// Auth constants — used in Part 1 (JWT and cookie logic)
// -----------------------------------------------
export const JWT_COOKIE_NAME = 'auth-token'
export const SALT_ROUNDS = 12 // bcrypt cost factor — higher = more secure but slower

// -----------------------------------------------
// Chunking settings — used in Part 2 (text extraction pipeline)
// Controls how documents are split into smaller pieces for embedding
// -----------------------------------------------
export const CHUNK_SIZE_TOKENS = 500    // Target size of each chunk in tokens
export const CHUNK_OVERLAP_TOKENS = 50 // How many tokens overlap between chunks

// -----------------------------------------------
// RAG (retrieval-augmented generation) — used in Part 3 (Q&A)
// Controls how many chunks are retrieved and which models are used
// -----------------------------------------------
export const MAX_CONTEXT_CHUNKS = 5              // Max chunks sent to GPT as context
export const EMBEDDING_MODEL = 'text-embedding-3-small' // OpenAI embedding model
export const LLM_MODEL = 'gpt-4o'                // OpenAI chat completion model
