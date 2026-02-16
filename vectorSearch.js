const pool = require('./db');
const OpenAI = require('openai');
const NodeCache = require('node-cache');

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

// Search similar vectors in SingleStore
async function searchSimilarVectors(queryEmbedding, limit = 5) {
  try {
    console.log('🔍 Searching vectors in SingleStore...');
    
    // Convert embedding array to binary format for SingleStore
    const float32Array = new Float32Array(queryEmbedding);
    const buffer = Buffer.from(float32Array.buffer);
    
    // Get a connection
    const connection = await pool.getConnection();
    
    try {
      // Set the query embedding as a session variable
      await connection.query('SET @query_vec = ?', [buffer]);
      
      // Now use it in the DOT_PRODUCT query
      // Use string interpolation for LIMIT to avoid the prepared statement issue
      const query = `
        SELECT 
          id,
          text,
          DOT_PRODUCT(vector, @query_vec) as similarity
        FROM mcaptain
        ORDER BY similarity DESC
        LIMIT ${limit}
      `;
      
      console.log('Executing query with limit:', limit);
      
      // Use .query() instead of .execute()
      const [rows] = await connection.query(query);
      
      console.log('✅ Found', rows.length, 'results');
      
      return rows;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('❌ Error searching vectors:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage
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