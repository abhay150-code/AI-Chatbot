// DOM Elements
const chatHistory = document.getElementById('chat-history');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const genImageBtn = document.getElementById('gen-image-btn');
const sendBtn = document.getElementById('send-btn');

// --- API Functions (Using Internal Vercel Proxies) ---

/**
 * Sends a chat request to the secure server-side proxy
 */
async function queryChat(messages) {
    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ messages: messages })
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Chat API Error:", error);
        return { error: { message: "Failed to connect to AI server" } };
    }
}

/**
 * Generates an image using the secure server-side proxy
 */
async function queryImage(data) {
    try {
        const response = await fetch("/api/image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Generation failed");
        }
        
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

    // Prepare context
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
        addMessage("The AI server is busy. Please try again in 1 minute.", 'bot');
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
        addMessage("Image service is currently unavailable. Ensure the server token is configured.", 'bot');
    }
});

// Settings interaction
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (item.textContent.includes('Settings')) {
            alert("API Keys are now securely managed on the server. No manual setup required!");
        }
    });
});
