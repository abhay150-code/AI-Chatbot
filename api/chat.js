export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages } = request.body;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'OpenRouter API key not configured on server' });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-chatbot-omega-eight-45.vercel.app/",
        "X-Title": "Aether AI Chatbot"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: messages
      })
    });

    const data = await res.json();
    return response.status(res.status).json(data);
  } catch (error) {
    console.error("Chat Proxy Error:", error);
    return response.status(500).json({ error: 'Failed to communicate with AI provider' });
  }
}
