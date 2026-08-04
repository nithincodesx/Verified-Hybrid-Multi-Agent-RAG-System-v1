const BASE = import.meta.env.VITE_API_BASE ?? "/api";

/**
 * Call the full RAG pipeline (Retrieve → Draft → Verify).
 * @param {string} query - User question
 * @param {object} [opts] - Optional parameters
 * @param {number} [opts.topK] - Optional top-K override
 * @param {string} [opts.filterSource] - Optional source document filter
 * @returns {Promise<import('./types').PipelineResponse>}
 */
export async function runPipeline(query, opts = {}) {
  const body = { query };
  if (opts.topK != null) body.top_k = opts.topK;
  if (opts.filterSource) body.filter_source = opts.filterSource;

  const res = await fetch(`${BASE}/pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pipeline request failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Upload a document file for async ingestion.
 * Returns a task_id immediately. Poll getUploadStatus() for the result.
 * @param {File} file - The file to upload (.txt, .md, .pdf, .csv, .json)
 * @returns {Promise<{task_id: string, status: string}>}
 */
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Poll upload status by task_id.
 * @param {string} taskId
 * @returns {Promise<{status: string, filename?: string, chunks?: number, error?: string}>}
 */
export async function getUploadStatus(taskId) {
  const res = await fetch(`${BASE}/upload/${taskId}`);
  if (!res.ok) throw new Error(`Status check failed (${res.status})`);
  return res.json();
}

/**
 * List all ingested documents with chunk counts.
 * @returns {Promise<{documents: Array<{filename: string, chunk_count: number}>, total_docs: number, total_chunks: number}>}
 */
export async function listDocuments() {
  const res = await fetch(`${BASE}/documents`);
  if (!res.ok) throw new Error(`List documents failed (${res.status})`);
  return res.json();
}

/**
 * Delete a document and all its chunks.
 * @param {string} filename - The document filename to delete
 * @returns {Promise<{success: boolean, filename: string, deleted_chunks: number, error?: string}>}
 */
export async function deleteDocument(filename) {
  const res = await fetch(`${BASE}/documents/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
  return res.json();
}

/**
 * Fetch the current LLM provider settings (API keys are masked server-side).
 * @returns {Promise<{provider: string, openai_api_key: string, openai_base_url: string, openai_model: string, openrouter_api_key: string, openrouter_base_url: string, openrouter_model: string, ollama_base_url: string, embedding_model: string, draft_model: string, verifier_model: string}>}
 */
export async function getProviderSettings() {
  const res = await fetch(`${BASE}/settings`);
  if (!res.ok) throw new Error(`Failed to load settings (${res.status})`);
  return res.json();
}

/**
 * Update the active LLM provider (openai / openrouter / ollama).
 * Leaving an API key empty keeps the existing one.
 * @returns {Promise<{provider: string}>}
 */
export async function saveProviderSettings(settings) {
  const res = await fetch(`${BASE}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to save settings (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Health check endpoint.
 * @returns {Promise<{status: string, db_connected: boolean, gemini_configured: boolean, doc_count?: number, hybrid_search_enabled: boolean, confidence_threshold: number}>}
 */
export async function getHealth() {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}
