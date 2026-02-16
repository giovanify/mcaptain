require('dotenv').config();

const openAiHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` 
}

async function createEmbeddings(textToEmbed) {
    let response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: openAiHeaders,
        body: JSON.stringify({
            input: textToEmbed,
            model: 'text-embedding-ada-002'
        })
    })
    if (response.ok) {
        const data = await response.json();
        console.log(data);
        return data;
    }
}

createEmbeddings('Ahoy');