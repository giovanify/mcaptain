require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { chatWithContext } = require('./chat');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiter for chat endpoint
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '1kb' }));
app.use(express.static('public'));

// Chat endpoint
app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { question } = req.body;
    
    console.log('💬 Received question:', question);
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    const result = await chatWithContext(question);
    
    console.log('✅ Successfully generated response');
    
    res.json(result);
  } catch (error) {
    console.error('❌ Chat error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Health check — also pings SingleStore to prevent trial workspace suspension
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'ok', db: 'error', details: error.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// For local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
module.exports = app;