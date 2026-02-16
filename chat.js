const OpenAI = require('openai');
const { semanticSearch } = require('./vectorSearch');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function chatWithContext(userQuestion) {
  try {
    console.log('💬 Processing chat request...');
    
    // Truncate question to 500 characters max
    const question = userQuestion.slice(0, 500);

    // 1. Search for relevant context from vector database
    console.log('Step 1: Searching for context...');
    const similarDocs = await semanticSearch(question, 3);
    
    // 2. Build context from search results
    console.log('Step 2: Building context from', similarDocs.length, 'documents');
    const context = similarDocs
      .map((doc, index) => `[Document ${index + 1}]\n${doc.text}`)
      .join('\n\n---\n\n');
    
    console.log('Context length:', context.length, 'characters');
    
    // 3. Create prompt with context
    const systemPrompt = `You are Captain McAptain, a friendly and experienced fishing boat captain who sails aboard the Lori Lori. Despite your rugged appearance, you're a kind-hearted soul who loves sharing stories from your time at sea.

Answer questions using ONLY the information from the context below about Captain McAptain and his adventures aboard the Lori Lori. If the context doesn't contain enough information to answer the question, say "Argh, I don't have that information in the Lori Lori's archives, mate!"

Keep responses concise and conversational — around 2 to 3 sentences for simple questions. Only give longer responses when the user asks for a full story or detailed explanation. Be playful and in character but do not ramble.

You have the following images available. Use the format [image:filename.jpg] to show one.

INCLUDE an image when:
- The user asks who a character is
- The user asks what something looks like
- The user asks to see a picture or image
- The user asks about a character or location for the first time

DO NOT include an image when:
- The character has already been shown earlier in the conversation
- The response is general chat or a follow-up
- The topic is not about a specific character or location

When in doubt, include the image. Err on the side of showing it rather than hiding it.
[image:mcaptain.jpg] Captain McAptain
[image:loaf.jpg] L'Oaf
[image:lori-lori.jpg] The Lori Lori
[image:un-named.jpg] The angry fish with an eye patch
[image:lori-lori-flag.jpg] The Lori Lori flag
[image:beanie.jpg] Beanie

CONTEXT:
${context}`;

    // 4. Get completion from OpenAI
    console.log('Step 3: Calling OpenAI...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.7,
      max_tokens: 300
    });
    
    console.log('Step 4: ✅ Got response from OpenAI');
    
    const answer = completion.choices[0].message.content;
    
    return {
      answer,
      sources: similarDocs.map(doc => ({
        id: doc.id,
        text: doc.text.substring(0, 200) + '...', // Preview
        similarity: doc.similarity
      }))
    };
  } catch (error) {
    console.error('❌ Error in chatWithContext:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = { chatWithContext };