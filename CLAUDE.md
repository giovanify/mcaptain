# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Captain McAptain Chat — a RAG (Retrieval-Augmented Generation) chatbot where users chat with "Captain McAptain," a fictional fishing boat captain. The app uses OpenAI embeddings + SingleStore vector search to find relevant context, then generates in-character responses via GPT-4o-mini.

## Commands

- `npm start` — run the server (production)
- `npm run dev` — run with nodemon (auto-reload on changes)
- Server runs on `http://localhost:3000` by default (configurable via `PORT` env var)

## Architecture

**Backend (Node.js/Express):**
- `server.js` — Express app entry point. Serves static files from `public/`, exposes `POST /api/chat` and `GET /health`. Exported as a module for Vercel.
- `chat.js` — Orchestrates the RAG pipeline: calls `semanticSearch()` to get relevant documents, builds a system prompt with context, then calls OpenAI chat completions.
- `vectorSearch.js` — Handles embedding creation (`text-embedding-ada-002`) and vector similarity search against SingleStore using `DOT_PRODUCT`.
- `db.js` — MySQL2 connection pool to SingleStore.
- `index.js` — Standalone script for testing embedding creation (not part of the main app).

**Frontend:**
- `public/index.html` — Single-page chat UI with inline JavaScript (vanilla JS, no framework).
- `public/styles.css` — Styling for the chat interface.

**Deployment:**
- Deployed to Vercel via `vercel.json`. All routes funnel through `server.js`.

## Environment Variables

Requires a `.env` file with:
- `OPENAI_API_KEY` — OpenAI API key
- `SINGLESTORE_HOST`, `SINGLESTORE_PORT`, `SINGLESTORE_USER`, `SINGLESTORE_PASSWORD`, `SINGLESTORE_DATABASE` — SingleStore connection details

## Key Details

- The SingleStore `mcaptain` table stores documents with columns: `id`, `text`, `vector` (binary embedding format).
- The database is named `mcaptain`.
- Embeddings use `Float32Array` → `Buffer` conversion for SingleStore's binary vector format.
- The chat model is `gpt-4o-mini` with `temperature: 0.7` and `max_tokens: 500`.
- Node.js 24.x is required (see `engines` in package.json).
