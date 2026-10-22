const BASE = import.meta.env.VITE_API_BASE ?? "/api";

/**
 * Call the full RAG pipeline (Retrieve → Draft → Verify).
 * @param {string} query - User question
 * @param {object} [opts] - Optional parameters
 * @param {number} [opts.topK] - Optional top-K override
 * @param {string} [opts.filterSource] - Optional source document filter
 * @param {boolean} [opts.enableQueryExpansion] - Expand query before retrieval
 * @param {string} [opts.queryExpansionStrategy] - Expansion strategy: llm | synonym | hybrid
 * @param {number} [opts.queryExpansionMaxTerms] - Max expansion terms
 * @param {boolean} [opts.enableReranking] - Rerank retrieved chunks with cross-encoder
 * @param {number} [opts.rerankerTopK] - Top-K chunks to keep after reranking
 * @returns {Promise<import('./types').PipelineResponse>}
 */
export async function streamPipeline(query, opts = {}) {
  const params = new URLSearchParams({ query });
  if (opts.topK != null) params.set("top_k", String(opts.topK));
  if (opts.filterSource) params.set("filter_source", opts.filterSource);
  if (opts.enableQueryExpansion != null) params.set("enable_query_expansion", String(!!opts.enableQueryExpansion));
  if (opts.queryExpansionStrategy) params.set("query_expansion_strategy", opts.queryExpansionStrategy);
  if (opts.queryExpansionMaxTerms != null) params.set("query_expansion_max_terms", String(opts.queryExpansionMaxTerms));
  if (opts.enableReranking != null) params.set("enable_reranking", String(!!opts.enableReranking));
  if (opts.rerankerTopK != null) params.set("reranker_top_k", String(opts.rerankerTopK));

  const res = await fetch(`${BASE}/pipeline/stream?${params}`, {
    headers: { Accept: "text/event-stream" },
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pipeline stream failed (${res.status}): ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLines = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim() || "message";
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
      if (dataLines.length > 0) {
        const data = JSON.parse(dataLines.join("\n"));
        if (currentEvent === "stage") opts.onStage?.(data);
        else if (currentEvent === "done") {
          reader.cancel();
          return data;
        } else if (currentEvent === "error") {
          throw new Error(data.error || "Pipeline stream failed.");
        }
      }
      currentEvent = "message";
    }
  }
  throw new Error("Pipeline stream ended without a result.");
}

export async function runPipeline(query, opts = {}) {
  const body = { query };
  if (opts.topK != null) body.top_k = opts.topK;
  if (opts.filterSource) body.filter_source = opts.filterSource;
  if (opts.enableQueryExpansion != null) body.enable_query_expansion = !!opts.enableQueryExpansion;
  if (opts.queryExpansionStrategy) body.query_expansion_strategy = opts.queryExpansionStrategy;
  if (opts.queryExpansionMaxTerms != null) body.query_expansion_max_terms = opts.queryExpansionMaxTerms;
  if (opts.enableReranking != null) body.enable_reranking = !!opts.enableReranking;
  if (opts.rerankerTopK != null) body.reranker_top_k = opts.rerankerTopK;

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
 * @returns {Promise<{provider: string, openai_api_key: string, openai_base_url: string, openai_model: string, openrouter_api_key: string, openrouter_base_url: string, openrouter_model: string, ollama_base_url: string, embedding_model: string, draft_model: string, verifier_model: string, enable_query_expansion: boolean, query_expansion_strategy: string, query_expansion_max_terms: number, enable_reranking: boolean, reranker_model: string}>}
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
