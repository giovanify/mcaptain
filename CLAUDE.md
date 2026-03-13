# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Captain McAptain Chat — a RAG (Retrieval-Augmented Generation) chatbot where users chat with "Captain McAptain," a fictional fishing boat captain. The app uses OpenAI embeddings + Supabase (PostgreSQL + pgvector) for vector search to find relevant context, then generates in-character responses via GPT-4o-mini.

## Commands

- `npm start` — run the server (production)
- `npm run dev` — run with nodemon (auto-reload on changes)
- `npm run create-table` — create the mcaptain table and enable pgvector
- `npm run ingest` — ingest .txt files from content/ into the vector database
- Server runs on `http://localhost:3000` by default (configurable via `PORT` env var)

## Architecture

**Backend (Node.js/Express):**
- `server.js` — Express app entry point. Serves static files from `public/`, exposes `POST /api/chat` and `GET /health`. Exported as a module for Vercel.
- `chat.js` — Orchestrates the RAG pipeline: calls `semanticSearch()` to get relevant documents, builds a system prompt with context, then calls OpenAI chat completions.
- `vectorSearch.js` — Handles embedding creation (`text-embedding-ada-002`) and vector similarity search against Supabase using pgvector cosine distance (`<=>`).
- `db.js` — pg connection pool to Supabase/PostgreSQL.
- `ingest.js` — Ingests .txt files from content/, chunks them, creates embeddings, and inserts into mcaptain table.
- `createTable.js` — Creates the mcaptain table with pgvector and optional HNSW index.
- `index.js` — Standalone script for testing embedding creation (not part of the main app).

**Frontend:**
- `public/index.html` — Single-page chat UI with inline JavaScript (vanilla JS, no framework).
- `public/styles.css` — Styling for the chat interface.

**Deployment:**
- Deployed to Vercel via `vercel.json`. All routes funnel through `server.js`.

## Environment Variables

Requires a `.env` file with:
- `OPENAI_API_KEY` — OpenAI API key
- `DATABASE_URL` — PostgreSQL connection string (e.g. Supabase connection pooler URL for serverless)

For Supabase: use the "Connection pooling" URI from Project Settings → Database. Use port 6543 (transaction mode) for serverless/Vercel.

## Key Details

- The `mcaptain` table stores documents with columns: `id`, `text`, `embedding` (vector(1536)), `source`, `created_at`.
- Uses pgvector for cosine similarity search (`<=>` operator).
- The chat model is `gpt-4o-mini` with `temperature: 0.7` and `max_tokens: 300`.
- Node.js 24.x is required (see `engines` in package.json).
