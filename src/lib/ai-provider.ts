import type { OllamaMessage } from '@/lib/ollama';
import { askOllama } from '@/lib/ollama';

type AIResponse = {
  content: string;
  provider: 'groq' | 'openrouter' | 'ollama';
  model: string;
};

async function callGroq(messages: OllamaMessage[]): Promise<AIResponse> {
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq error: ${await response.text()}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    provider: 'groq',
    model,
  };
}

async function callOpenRouter(messages: OllamaMessage[]): Promise<AIResponse> {
  const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324:free';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      'X-Title': 'AURA GASTRONOMY',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${await response.text()}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    provider: 'openrouter',
    model,
  };
}

export async function completeText(messages: OllamaMessage[]) {
  if (process.env.GROQ_API_KEY) {
    return callGroq(messages);
  }

  if (process.env.OPENROUTER_API_KEY) {
    return callOpenRouter(messages);
  }

  if (process.env.OLLAMA_HOST) {
    return {
      content: await askOllama(messages),
      provider: 'ollama' as const,
      model: process.env.OLLAMA_MODEL || 'kimi',
    };
  }

  throw new Error('No AI provider configured');
}
