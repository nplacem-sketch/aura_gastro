import { askOllama, type OllamaMessage } from '@/lib/ollama';

type AIResponse = {
  content: string;
  provider: 'groq' | 'ollama';
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

async function callOllama(messages: OllamaMessage[]): Promise<AIResponse> {
  return {
    content: await askOllama(messages),
    provider: 'ollama',
    model: process.env.OLLAMA_MODEL || 'gemma3:4b',
  };
}

export async function completeText(messages: OllamaMessage[]) {
  const errors: string[] = [];

  if (process.env.GROQ_API_KEY) {
    try {
      return await callGroq(messages);
    } catch (error: any) {
      errors.push(error?.message || 'Groq request failed.');
    }
  }

  if (process.env.OLLAMA_HOST) {
    try {
      return await callOllama(messages);
    } catch (error: any) {
      errors.push(error?.message || 'Ollama request failed.');
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(' | '));
  }

  throw new Error('No AI provider configured. Configure GROQ_API_KEY or OLLAMA_HOST.');
}
