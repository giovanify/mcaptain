const fs = require('fs');
const path = require('path');
const pool = require('./db');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const CONTENT_DIR = path.join(__dirname, 'content');
const CHUNK_SIZE = 300;
const CHUNK_OVERLAP = 50;

function splitIntoChunks(text) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end >= words.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

async function createEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text
  });
  return response.data[0].embedding;
}

async function ingest() {
  let totalFiles = 0;
  let totalChunks = 0;

  try {
    const connection = await pool.getConnection();

    try {
      // Clear existing data
      await connection.query('DELETE FROM mcaptain');
      console.log('Cleared all existing rows from mcaptain table.');

      // Read all .txt files from content/
      if (!fs.existsSync(CONTENT_DIR)) {
        console.error('content/ directory not found.');
        return;
      }

      const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.txt'));

      if (files.length === 0) {
        console.log('No .txt files found in content/.');
        return;
      }

      for (const file of files) {
        try {
          console.log(`\nProcessing: ${file}`);
          const text = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
          const chunks = splitIntoChunks(text);
          console.log(`  ${chunks.length} chunk(s) created.`);

          for (const chunk of chunks) {
            const embedding = await createEmbedding(chunk);
            const float32Array = new Float32Array(embedding);
            const buffer = Buffer.from(float32Array.buffer);

            await connection.query(
              'INSERT INTO mcaptain (text, vector, source) VALUES (?, ?, ?)',
              [chunk, buffer, file]
            );
          }

          console.log(`  ${chunks.length} chunk(s) inserted.`);
          totalFiles++;
          totalChunks += chunks.length;
        } catch (error) {
          console.error(`  Error processing ${file}:`, error.message);
        }
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    console.log(`\nDone. ${totalFiles} file(s) processed, ${totalChunks} chunk(s) inserted.`);
    await pool.end();
  }
}

ingest();
