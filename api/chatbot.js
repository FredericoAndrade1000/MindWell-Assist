// api/chatbot.js
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
// (The context will be prepended dynamically in routes.js)
const BOT_INSTRUCTIONS = `
Você é 'MindGuide', um assistente de IA compassivo e solidário focado no bem-estar mental.
Sua função principal é oferecer um ouvido atento, fornecer informações gerais sobre tópicos de saúde mental (como estresse, ansiedade, baixo humor) e explicar como funcionam os questionários de autoavaliação (PHQ-9 para depressão, GAD-7 para ansiedade).
Incentive os usuários a fazer a avaliação se expressarem preocupações relacionadas ao humor ou ansiedade.
Se a mensagem de um usuário indicar sofrimento imediato ou mencionar automutilação, priorize responder com empatia e sugerir imediatamente o contato com serviços de emergência ou uma linha direta de crise (forneça exemplos genéricos como 'serviços de emergência em sua área' ou 'uma linha de crise de saúde mental como o CVV no Brasil, ligue 188') e gentilmente o afaste de continuar o chat para suporte em crise.
Você não deve fornecer diagnósticos médicos, terapia ou planos de tratamento específicos. Ofereça apenas declarações de apoio e informações gerais.
Mantenha as respostas concisas (idealmente com menos de 150 palavras), empáticas e úteis.
Mantenha um tom calmo, compreensivo e sem julgamentos.
Não peça Informações de Identificação Pessoal (PII).
Se perguntado sobre tópicos fora do bem-estar mental ou da função do site, educadamente direcione a conversa de volta ou declare que não pode ajudar com esse tópico.
Se houver uma mensagem de sistema com 'Contexto da última autoavaliação', use essa informação para entender melhor o estado recente do usuário, mas NÃO mencione os scores ou nível de risco diretamente, a menos que o usuário pergunte sobre seus resultados. Adapte o tom e as sugestões gerais com base nesse contexto. Por exemplo, se o risco for alto, seja extra cuidadoso e reforce a sugestão de buscar ajuda profissional se apropriado.
`;


/**
 * Generates a response using the OpenAI o4-mini model.
 * @param {Array<{role: 'user' | 'assistant' | 'system', content: string}>} conversationHistoryWithContext - The conversation history, potentially including a prepended system message with assessment context.
 * @param {string} reasoningEffort - The reasoning effort parameter for the API ('auto', 'low', 'high'). Defaults to 'auto'.
 * @returns {Promise<string>} The generated response text.
 * @throws {Error} If the OpenAI API request fails or the API key is missing.
 */
const generateO4MiniResponse = async (conversationHistoryWithContext, reasoningEffort = 'auto') => {
    if (!openai) {
         console.error("OpenAI client not initialized. Check API Key.");
         return "Peço desculpas, mas não consigo processar solicitações no momento. Minha conexão com o serviço de IA está indisponível.";
    }

    if (!conversationHistoryWithContext || conversationHistoryWithContext.length === 0) {
        throw new Error("Conversation history cannot be empty.");
    }

    // Prepare messages for the API, including the main system prompt and the dynamic context/history
    const messages = [
        { role: "system", content: BOT_INSTRUCTIONS }, // Main instructions
        ...conversationHistoryWithContext // Spread the dynamic context and history passed from routes.js
    ];

    try {
        const completion = await openai.chat.completions.create({
            model: "o4-mini",
            messages: messages,
            max_completion_tokens: 1000,
        });

        const replyContent = completion.choices[0]?.message?.content?.trim();

        if (!replyContent) {
            console.error("OpenAI response missing content:", completion);
            return "Recebi uma resposta vazia do assistente. Pode tentar reformular sua pergunta?"; // More user-friendly empty response
        }

        return replyContent;

    } catch (error) {
        console.error("OpenAI API request failed:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
         let errorMessage = "Ocorreu um erro ao comunicar com o assistente de IA.";
         if (error.response?.status === 401) {
             errorMessage = "Falha na autenticação com o assistente de IA. Verifique a configuração.";
         } else if (error.response?.status === 429) {
             errorMessage = "O assistente de IA está sobrecarregado no momento. Por favor, tente novamente em breve.";
         } else if (error.message?.includes('insufficient_quota')) {
             errorMessage = "A cota de uso do assistente de IA foi excedida.";
         }
        // Don't throw here, return the error message to the user
        return errorMessage;
    }
};

export { generateO4MiniResponse };