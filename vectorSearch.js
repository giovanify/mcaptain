const pool = require('./db');
const OpenAI = require('openai');
const NodeCache = require('node-cache');
const pgvector = require('pgvector/pg');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Cache embeddings for 10 minutes, check for expired keys every 2 minutes
const embeddingCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Create embedding from text
async function createEmbedding(text) {
  try {
    const cached = embeddingCache.get(text);
    if (cached) {
      console.log('⚡ Using cached embedding for:', text.substring(0, 50) + '...');
      return cached;
    }

    console.log('Creating embedding for:', text.substring(0, 50) + '...');

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });

    const embedding = response.data[0].embedding;
    embeddingCache.set(text, embedding);

    console.log('✅ Embedding created successfully');
    return embedding;
  } catch (error) {
    console.error('❌ Error creating embedding:', {
      message: error.message,
      status: error.status,
      type: error.type
    });
    throw error;
  }
}

// Search similar vectors in Supabase (PostgreSQL + pgvector)
async function searchSimilarVectors(queryEmbedding, limit = 5) {
  try {
    console.log('🔍 Searching vectors in Supabase...');

    const client = await pool.connect();
    try {
      await pgvector.registerTypes(client);

      const embeddingSql = pgvector.toSql(queryEmbedding);
      // Cosine distance (<=>): lower = more similar. Return 1 - distance as similarity.
      const query = `
        SELECT 
          id,
          text,
          source,
          (1 - (embedding <=> $1::vector)) as similarity
        FROM mcaptain
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `;

      const { rows } = await client.query(query, [embeddingSql, limit]);

      console.log('✅ Found', rows.length, 'results');

      return rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error searching vectors:', {
      message: error.message,
      code: error.code
    });
    throw error;
  }
}

// Main search function
async function semanticSearch(question, limit = 5) {
  console.log('📝 Starting semantic search for:', question);

  // 1. Create embedding from question
  const questionEmbedding = await createEmbedding(question);

  // 2. Search similar vectors
  const results = await searchSimilarVectors(questionEmbedding, limit);

  console.log('✅ Semantic search complete');

  return results;
}

module.exports = {
  createEmbedding,
  searchSimilarVectors,
  semanticSearch
};
