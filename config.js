export const CONFIG = {
    groqAiModel: process.env.AI_MODEL ?? 'llama-3.3-70b-versatile',
    groqApiKey: process.env.GROQ_API_KEY,
    cerebrasModel: process.env.CEREBRAS_MODEL ?? 'llama3.1-8b',
    cerebrasApiKey: process.env.CEREBRAS_API_KEY
}