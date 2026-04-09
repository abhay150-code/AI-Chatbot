// API Configuration
// IMPORTANT: Keys are now managed via the UI Settings to avoid leaking them on GitHub.
let HF_TOKEN = localStorage.getItem('hf_token') || "";
let OPENROUTER_KEY = localStorage.getItem('openrouter_key') || "";

// Pre-fill keys from .env logic (commented out for security if pushed)
// In a real production app, use a backend proxy.

// DOM Elements
const chatHistory = document.getElementById('chat-history');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const genImageBtn = document.getElementById('gen-image-btn');
const sendBtn = document.getElementById('send-btn');

// --- API Functions ---

/**
 * Sends a chat request to OpenRouter
 */
async function queryChat(messages) {
    if (!OPENROUTER_KEY) {
        const key = prompt("Please enter your OpenRouter API Key:");
        if (key) {
            OPENROUTER_KEY = key;
            localStorage.setItem('openrouter_key', key);
        } else return { error: "OpenRouter API Key required" };
    }
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.href, // Required by OpenRouter
                "X-Title": "Aether AI Chatbot"
            },
            body: JSON.stringify({
                model: "openrouter/free",
                messages: messages
            })
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Chat API Error:", error);
        return { error: "Failed to connect to chat service" };
    }
}

/**
 * Generates an image using HF Flux as provided in the prompt
 */
async function queryImage(data) {
    if (!HF_TOKEN) {
        const key = prompt("Please enter your Hugging Face API Token:");
        if (key) {
            HF_TOKEN = key;
            localStorage.setItem('hf_token', key);
        } else return null;
    }
    try {
        const response = await fetch(
            "https://router.huggingface.co/nscale/v1/images/generations",
            {
                headers: {
                    Authorization: `Bearer ${HF_TOKEN}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify(data),
            }
        );
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Generation failed");
        }
        
        const result = await response.json();
        return result.data[0].b64_json; // Extract base64 image data
    } catch (error) {
        console.error("Image API Error:", error);
        return null;
    }
}

// --- UI Functions ---

function addMessage(content, role = 'bot', type = 'text') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    let contentHtml = '';
    if (type === 'text') {
        contentHtml = `<div class="bubble">${content}</div>`;
    } else if (type === 'image') {
        contentHtml = `
            <div class="bubble">Generating visual representation...</div>
            <div class="image-attachment">
                <img src="${content}" alt="AI Generated Image">
            </div>
        `;
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageDiv.innerHTML = `
        ${contentHtml}
        <span class="timestamp">${timestamp}</span>
    `;
    
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return messageDiv;
}

function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot typing-indicator';
    typingDiv.innerHTML = `
        <div class="typing">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    chatHistory.appendChild(typingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return typingDiv;
}

// --- Event Handlers ---

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    // Add user message
    addMessage(text, 'user');
    userInput.value = '';

    // Show typing
    const typing = showTyping();

    // Prepare context (last 5 messages for simple history)
    const context = [
        { role: "system", content: "You are Aether AI, a premium, intelligent assistant. Be concise, helpful, and professional." },
        { role: "user", content: text }
    ];

    const result = await queryChat(context);
    console.log("Chat API Response:", result);
    typing.remove();

    if (result.error) {
        const errorMsg = result.error.message || JSON.stringify(result.error);
        addMessage(`Error: ${errorMsg}`, 'bot');
    } else if (result.choices && result.choices[0]) {
        const reply = result.choices[0].message.content;
        addMessage(reply, 'bot');
    } else {
        addMessage("Received an unexpected response from the AI service.", 'bot');
    }
});

genImageBtn.addEventListener('click', async () => {
    const promptText = userInput.value.trim();
    if (!promptText) {
        addMessage("Please provide a description in the input field to generate an image.", 'bot');
        return;
    }

    addMessage(`Generating image for: "${promptText}"`, 'user');
    userInput.value = '';
    
    const typing = showTyping();

    const base64Data = await queryImage({
        response_format: "b64_json",
        prompt: promptText,
        model: "black-forest-labs/FLUX.1-schnell",
    });

    typing.remove();

    if (base64Data) {
        const imageUrl = `data:image/png;base64,${base64Data}`;
        addMessage("Here is the generated image:", 'bot', 'image');
        
        // Update the last message to show the image
        const lastMsg = chatHistory.lastElementChild;
        const img = lastMsg.querySelector('img');
        if (img) img.src = imageUrl;
    } else {
        addMessage("Sorry, I couldn't generate that image. Please check the console for details.", 'bot');
    }
});

// Settings interaction
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (item.textContent.includes('Settings')) {
            const hf = prompt("Update Hugging Face Token:", HF_TOKEN);
            if (hf !== null) {
                HF_TOKEN = hf;
                localStorage.setItem('hf_token', hf);
            }
            const or = prompt("Update OpenRouter API Key:", OPENROUTER_KEY);
            if (or !== null) {
                OPENROUTER_KEY = or;
                localStorage.setItem('openrouter_key', or);
            }
            if (hf || or) alert("API Configurations Updated!");
        }
    });
});
