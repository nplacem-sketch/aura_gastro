// Local Ollama interface for AURA GASTRONOMY.
// Defaults are tuned for structured gastronomic content on modest hardware.

export type OllamaMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AskOllamaOptions = {
  model?: string;
  format?: 'json' | Record<string, unknown>;
  temperature?: number;
  topP?: number;
  numCtx?: number;
  numPredict?: number;
};

const DEFAULT_OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';
export const DEFAULT_OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'gemma3:4b';

export async function askOllama(messages: OllamaMessage[], options: AskOllamaOptions = {}): Promise<string> {
  const url = DEFAULT_OLLAMA_HOST;
  const model = options.model || DEFAULT_OLLAMA_MODEL;

  try {
    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...(options.format ? { format: options.format } : {}),
        options: {
          temperature: options.temperature ?? 0.2,
          top_p: options.topP ?? 0.9,
          ...(options.numCtx ? { num_ctx: options.numCtx } : {}),
          ...(options.numPredict ? { num_predict: options.numPredict } : {}),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data?.message?.content?.trim() ?? '';
    if (content) {
      return content;
    }

    const thinking = data?.message?.thinking?.trim();
    if (thinking) {
      throw new Error(`Ollama returned reasoning-only output for model ${model}.`);
    }

    throw new Error(`Ollama returned an empty response for model ${model}.`);
  } catch (err: any) {
    console.error('[ollama-lib] Connection failed:', err.message);
    throw err;
  }
}

export const AURA_EDITOR_PERSONA = `
Eres el editor curricular y tecnico senior de AURA GASTRONOMY.
Tu especialidad es la documentacion tecnica de alta gastronomia y la creacion de contenido estructurado.
Tus textos son:
1. Precisos: usas terminos tecnicos exactos.
2. Claros: organizas la informacion con jerarquia limpia.
3. Aplicables: escribes para cocineros y equipos profesionales.
4. Humanos: actuas como un maestro experto, nunca mencionas ser una IA.

AURA GASTRONOMY STYLE GUIDE:
- Idioma: espanol profesional de Espana.
- Unidades: metricas siempre.
- Tono: sofisticado, sobrio y util.
`;

export const KIMI_PERSONA = AURA_EDITOR_PERSONA;
