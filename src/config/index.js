const CONFIG = {
    groqAiModel: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    groqApiKey: process.env.GROQ_API_KEY,
    cerebrasModel: process.env.CEREBRAS_MODEL ?? 'llama3.1-8b',
    cerebrasApiKey: process.env.CEREBRAS_API_KEY,
    openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4.1-2025-04-14',
    openAiApiKey: process.env.OPENAI_API_KEY
}

module.exports = { CONFIG };
