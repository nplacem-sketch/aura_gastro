
// ── Ollama Interface for AURA GASTRONOMY ───────────────────────────────────
// This utility handles communication with the local Ollama instance.
// Persona: Kimi - Specialized in structured, high-end gastronomic writing.

export type OllamaMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function askOllama(messages: OllamaMessage[]): Promise<string> {
  const url = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'kimi';

  try {
    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: 0.4, // Precise for technical writing
          top_p: 0.9,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message.content;
  } catch (err: any) {
    console.error('[ollama-lib] Connection failed:', err.message);
    throw err;
  }
}

// ── Kimi Writing Persona ───────────────────────────────────────────────────
export const KIMI_PERSONA = `
Eres Kimi, el Redactor Jefe Senior de AURA GASTRONOMY.
Tu especialidad es la documentación técnica de alta gastronomía y la creación de contenido estructurado.
Tus textos son:
1. Precisos: Usas términos técnicos exactos.
2. Inspiradores: Transmites la pasión por la cocina de vanguardia.
3. Estructurados: Organizas la información con jerarquía clara (Recetas, Cursos, Lecciones).
4. Humanos: Actúas como un experto maestro, nunca mencionas ser una IA o un proceso técnico.

AURA GASTRONOMY STYLE GUIDE:
- Idioma: Español (España/Neutro Profesional).
- Unidades: Métricas siempre.
- Tono: Sofisticado y minimalista.
`;
