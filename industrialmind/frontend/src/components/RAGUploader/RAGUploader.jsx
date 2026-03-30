import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

/**
 * Resolves API base URL from environment with browser fallback.
 * @returns {string}
 */
function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return `${window.location.protocol}//${window.location.hostname}:8000`;
}

/**
 * Uploads a PDF with progress callback.
 * @param {string} apiBaseUrl
 * @param {File} file
 * @param {(progress: number) => void} onProgress
 * @returns {Promise<any>}
 */
function uploadPdf(apiBaseUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiBaseUrl}/rag/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload request failed"));
    xhr.send(formData);
  });
}

/**
 * RAG upload/query panel for industrial manuals.
 * @returns {JSX.Element}
 */
export default function RAGUploader() {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [context, setContext] = useState("");
  const [querying, setQuerying] = useState(false);
  const [error, setError] = useState(null);

  const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), []);

  /**
   * Handles file drop/select updates.
   * @param {File | null} nextFile
   * @returns {void}
   */
  function handleNewFile(nextFile) {
    if (!nextFile) {
      return;
    }
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }
    setFile(nextFile);
    setUploaded(false);
    setUploadProgress(0);
    setError(null);
  }

  /**
   * Uploads selected PDF to backend ingestion endpoint.
   * @returns {Promise<void>}
   */
  async function handleUpload() {
    if (!file) {
      setError("Select a PDF file first.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await uploadPdf(apiBaseUrl, file, setUploadProgress);
      setUploaded(true);
    } catch (uploadError) {
      setError("Upload failed. Reconnecting...");
    } finally {
      setUploading(false);
    }
  }

  /**
   * Queries indexed manuals and displays context + answer.
   * @returns {Promise<void>}
   */
  async function handleQuery() {
    if (!query.trim()) {
      return;
    }
    setQuerying(true);
    setError(null);
    setAnswer("");
    setContext("");

    try {
      const response = await fetch(`${apiBaseUrl}/rag/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query.trim() }),
      });
      if (!response.ok) {
        throw new Error(`Query failed (${response.status})`);
      }
      const payload = await response.json();
      setAnswer(`${payload.answer}\n\nProvider: ${payload.provider.toUpperCase()} | Latency: ${payload.latency_ms} ms`);
      setContext(payload.retrieved_context ?? "");
    } catch (queryError) {
      setError("RAG query failed. Reconnecting...");
    } finally {
      setQuerying(false);
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper
        sx={{
          p: 3,
          background: "rgba(22,27,34,0.82)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)",
          maxWidth: 980,
        }}
      >
        <Typography variant="h4" sx={{ mb: 2 }}>
          Manual Intelligence (RAG)
        </Typography>

        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleNewFile(event.dataTransfer.files?.[0] ?? null);
          }}
          sx={{
            border: "2px dashed rgba(255,255,255,0.28)",
            borderRadius: 2,
            p: 3,
            textAlign: "center",
            mb: 2,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <Typography variant="h6">{file ? file.name : "Drag & Drop industrial PDF manual here"}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            or choose a file manually
          </Typography>
          <Button variant="outlined" component="label">
            Choose PDF
            <input type="file" hidden accept="application/pdf" onChange={(event) => handleNewFile(event.target.files?.[0] ?? null)} />
          </Button>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
          <Button variant="contained" onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? <CircularProgress size={20} color="inherit" /> : "Upload & Index"}
          </Button>
          <Typography variant="body2" color={uploaded ? "success.main" : "text.secondary"} sx={{ alignSelf: "center" }}>
            {uploaded ? "PDF indexed successfully." : "Awaiting upload."}
          </Typography>
        </Stack>

        {uploading && <LinearProgress variant="determinate" value={uploadProgress} sx={{ mb: 2 }} />}

        {uploaded && (
          <Stack spacing={1.5}>
            <TextField
              fullWidth
              label="Ask about the uploaded manual"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleQuery();
                }
              }}
            />
            <Button variant="contained" onClick={handleQuery} disabled={querying || !query.trim()}>
              {querying ? <CircularProgress size={20} color="inherit" /> : "Query Manual"}
            </Button>
          </Stack>
        )}

        {context && (
          <Paper sx={{ p: 2, mt: 2, backgroundColor: "rgba(0,212,255,0.08)" }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Retrieved Context Chunks
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {context}
            </Typography>
          </Paper>
        )}

        {answer && (
          <Paper sx={{ p: 2, mt: 2, backgroundColor: "rgba(255,107,53,0.08)" }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              AI Answer
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
              {answer}
            </Typography>
          </Paper>
        )}
      </Paper>
    </Box>
  );
}

