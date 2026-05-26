const { CONFIG } = require('../config');
const groqEngine = require('groq-sdk');
const cerebrasEngine = require('@cerebras/cerebras_cloud_sdk');
const openAiEngine = require('openai');

const llmClients = [
  { name: 'Groq', client: new groqEngine({ apiKey: CONFIG.groqApiKey }), model: CONFIG.groqAiModel },
  { name: 'Cerebras', client: new cerebrasEngine({apiKey: CONFIG.cerebrasApiKey}), model: CONFIG.cerebrasModel },
  // { name: 'OpenAI', client: new openAiEngine({apiKey: CONFIG.openAiApiKey}), model: CONFIG.openAiModel },
];

let currentClientIndex = 0;

async function callWithFallback(fn) {
  const startIndex = currentClientIndex;
  currentClientIndex = (currentClientIndex + 1) % llmClients.length;

  for (let attempt = 0; attempt < llmClients.length; attempt++) {
    const index = (startIndex + attempt) % llmClients.length;
    const llmClientConf = llmClients[index];
    try {
      return await fn(llmClientConf);
    } catch (error) {
      const status = error?.status || error?.response?.status;
      const message = error?.message || '';
      const isRateLimit = status === 429 || /rate.?limit|quota|exceeded|too many requests/i.test(message);

      console.warn(`LLM ${llmClientConf.name} falló${isRateLimit ? ' (rate limit)' : ''}: ${message}`);

      if (attempt === llmClients.length - 1) {
        error.isLlmExhausted = true;
        throw error;
      }
    }
  }
}

module.exports = { callWithFallback };
