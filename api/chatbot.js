import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables relative to the project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.warn("Warning: OPENAI_API_KEY not found in .env. Chatbot functionality will be disabled.");
}

let openai;
if (OPENAI_API_KEY) {
     openai = new OpenAI({
       apiKey: OPENAI_API_KEY,
     });
} else {
    openai = null; // Explicitly set to null if key is missing
}

// Define the Bot's Persona and Instructions
const BOT_INSTRUCTIONS = `
You are 'MindGuide', a compassionate and supportive AI assistant focused on mental well-being.
Your primary role is to offer a listening ear, provide general information about mental health topics (like stress, anxiety, low mood), and explain how the self-assessment questionnaires (PHQ-9 for depression, GAD-7 for anxiety) work.
Encourage users to take the assessment if they express concerns related to mood or anxiety.
If a user's message indicates immediate distress or mentions self-harm, prioritize responding with empathy and immediately suggest contacting emergency services or a crisis hotline (provide generic examples like 'emergency services in your area' or 'a mental health crisis line') and gently guide them away from continuing the chat for crisis support.
You must not provide medical diagnoses, therapy, or specific treatment plans. Offer supportive statements and general information only.
Keep responses concise (under 150 words ideally), empathetic, and helpful.
Maintain a calm, understanding, and non-judgmental tone.
Do not ask for Personally Identifiable Information (PII).
If asked about topics outside mental well-being or the website's function, politely steer the conversation back or state you cannot help with that topic.
`;


/**
 * Generates a response using the OpenAI o4-mini model.
 * @param {Array<{role: 'user' | 'assistant' | 'system', content: string}>} conversationHistory - The conversation history, including the latest user message.
 * @param {string} reasoningEffort - The reasoning effort parameter for the API ('auto', 'low', 'high'). Defaults to 'auto'.
 * @returns {Promise<string>} The generated response text.
 * @throws {Error} If the OpenAI API request fails or the API key is missing.
 */
const generateO4MiniResponse = async (conversationHistory, reasoningEffort = 'auto') => {
    if (!openai) {
         console.error("OpenAI client not initialized. Check API Key.");
         // Fallback response or throw error
         return "I apologize, but I'm currently unable to process requests. My connection to the AI service is unavailable.";
         // Or: throw new Error("OpenAI client not initialized. API Key might be missing.");
    }

    if (!conversationHistory || conversationHistory.length === 0) {
        throw new Error("Conversation history cannot be empty.");
    }

    // Prepare messages for the API, including the system prompt
    const messages = [
        { role: "system", content: BOT_INSTRUCTIONS },
        ...conversationHistory // Spread the existing conversation history
    ];

    console.log("Sending to OpenAI:", JSON.stringify(messages, null, 2)); // Log request payload for debugging

    try {
        const completion = await openai.chat.completions.create({
            model: "o4-mini", // Use o4-mini as specified
            messages: messages,
            temperature: 0.7, // Adjust temperature for creativity vs. predictability
            max_tokens: 200, // Limit response length
            // Pass the reasoning_effort parameter as an extra body parameter
            extra_body: {
                reasoning_effort: reasoningEffort
            }
        });

        console.log("Received from OpenAI:", JSON.stringify(completion, null, 2)); // Log response for debugging


        // Extract the response content
        const replyContent = completion.choices[0]?.message?.content?.trim();

        if (!replyContent) {
            console.error("OpenAI response missing content:", completion);
            throw new Error("Received an empty response from the AI assistant.");
        }

        return replyContent;

    } catch (error) {
        console.error("OpenAI API request failed:", error.response ? error.response.data : error.message);
         // Provide a more specific error message if possible
         let errorMessage = "An error occurred while communicating with the AI assistant.";
         if (error.response?.status === 401) {
             errorMessage = "AI assistant authentication failed. Please check the API key.";
         } else if (error.response?.status === 429) {
             errorMessage = "AI assistant is currently experiencing high traffic. Please try again shortly.";
         } else if (error.message) {
             // Include OpenAI's error message if available and seems safe to expose
              errorMessage = `AI assistant error: ${error.message}`;
         }
        throw new Error(errorMessage); // Re-throw a potentially more user-friendly error
    }
};

export { generateO4MiniResponse };
