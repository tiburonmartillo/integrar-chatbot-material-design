// AI Service - Configuración para conectar con APIs de IA

/**
 * CONFIGURACIÓN DE API
 *
 * En Vercel (producción):
 *   - Usa /api/chat (serverless function). La API key va en Vercel → Settings → Environment Variables (GROQ_API_KEY)
 *   - No expones la key en el frontend
 *
 * En desarrollo local:
 *   - Usa proxy de Vite. Configura VITE_GROQ_API_KEY en .env.local
 *
 * OpenAI (alternativa local):
 *   - Configura VITE_OPENAI_API_KEY en .env.local
 */

// En producción (Vercel): usar nuestra API route. En desarrollo: proxy de Vite o directo
const USE_VERCEL_API = !import.meta.env.DEV; // En build de producción, usar /api/chat

const GROQ_CONFIG = {
  apiKey: import.meta.env.VITE_GROQ_API_KEY ?? '',
  endpoint: USE_VERCEL_API ? '/api/chat' : '/api/groq/openai/v1/chat/completions',
  model: 'llama-3.1-8b-instant',
  useVercelApi: USE_VERCEL_API,
};

const OPENAI_CONFIG = {
  apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? 'YOUR_OPENAI_API_KEY_HERE',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  useVercelApi: false,
};

// En producción con Vercel: siempre usar Groq vía /api/chat (no necesita key en frontend)
// En desarrollo: Groq si tiene key, sino OpenAI
const useGroq = USE_VERCEL_API || Boolean(GROQ_CONFIG.apiKey?.trim());
const API_CONFIG = useGroq
  ? { provider: 'groq' as const, ...GROQ_CONFIG }
  : { provider: 'openai' as const, ...OPENAI_CONFIG };

if (import.meta.env.DEV) {
  console.log('[AI] Provider:', API_CONFIG.provider, '| Endpoint:', API_CONFIG.endpoint);
}

// Límite de contexto para no exceder tokens de Groq (llama-3.1-8b: 6K TPM)
const MAX_CONTEXT_CHARS = 9000;

/**
 * Filtra el contexto para incluir solo los Pokémon mencionados en el mensaje.
 * Reduce tokens cuando la pregunta es sobre Pokémon específicos.
 */
function filterContextByMentionedPokemon(context: string | undefined, userMessage: string): string | undefined {
  if (!context?.trim()) return context;

  const lines = context.trim().split('\n');
  const headerLines = lines.slice(0, 2);
  const pokemonLines = lines.slice(2).filter((l) => l.startsWith('#'));

  if (pokemonLines.length === 0) return context;

  const msg = userMessage.toLowerCase().replace(/[.-]/g, ' ').replace(/\s+/g, ' ');

  const mentioned = pokemonLines.filter((line) => {
    const match = line.match(/^#\d+\s+([^|]+)\|/);
    const name = match ? match[1].trim().toLowerCase().replace(/-/g, ' ') : '';
    return name && msg.includes(name);
  });

  if (mentioned.length === 0) return context;

  return [...headerLines, '', ...mentioned].join('\n');
}

// Prompt para el asistente de la Pokédex: solo usa info de la página y PokeAPI
const BASE_SYSTEM_PROMPT = `Eres un asistente de la Pokédex. Responde ÚNICAMENTE basándote en la información proporcionada (contenido de la página y datos de la PokeAPI).
Sé tolerante con la ortografía y los errores de escritura: interpreta la intención del usuario aunque escriba con faltas, typos o abreviaturas.
Si la pregunta no puede responderse con el contexto disponible, indícalo amablemente. Mantén un tono amigable y conciso.`;

function buildSystemPrompt(context?: string): string {
  if (!context || !context.trim()) {
    return BASE_SYSTEM_PROMPT;
  }
  const trimmed = context.trim();
  const truncated = trimmed.length > MAX_CONTEXT_CHARS
    ? trimmed.slice(0, MAX_CONTEXT_CHARS) + '\n\n[... contexto truncado por límite de la API ...]'
    : trimmed;
  return `${BASE_SYSTEM_PROMPT}

CONTEXTO (datos de la página y PokeAPI):
---
${truncated}
---
Responde SOLO con la información de este contexto. No inventes datos.`;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Envía un mensaje a la API (Vercel /api/chat, Groq directo, u OpenAI)
 */
async function sendToAPI(messages: ChatMessage[], context?: string): Promise<string> {
  if (API_CONFIG.useVercelApi) {
    // Vercel serverless: envía a /api/chat, la key está en el servidor
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      const msg = err.error || err.details || `API error: ${response.status}`;
      if (response.status === 429) {
        throw new Error('Límite de solicitudes alcanzado. Espera un minuto e intenta de nuevo.');
      }
      throw new Error(msg);
    }
    const data = await response.json();
    return data.content ?? '';
  }

  // Llamada directa (dev con proxy o OpenAI)
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content ?? '';
  const filteredContext = filterContextByMentionedPokemon(context, lastUserMsg);
  const systemPrompt = buildSystemPrompt(filteredContext);
  const response = await fetch(API_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: API_CONFIG.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${API_CONFIG.provider} API error: ${response.status} - ${errText || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Función principal para enviar mensajes a la IA
 * @param messages - Historial de mensajes
 * @param context - Contexto opcional (página + API) para RAG
 */
export async function sendMessage(messages: ChatMessage[], context?: string): Promise<string> {
  const apiKey = API_CONFIG.apiKey;
  const needsKey = !API_CONFIG.useVercelApi;

  // En dev necesitamos API key. En Vercel la key está en el servidor.
  if (needsKey && (!apiKey?.trim() || apiKey.startsWith('YOUR_'))) {
    console.warn('API key no configurada. En local: VITE_GROQ_API_KEY en .env.local. En Vercel: GROQ_API_KEY en Settings.');
    return simulateAIResponse(messages[messages.length - 1].content);
  }

  try {
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content ?? '';
    const filteredContext = filterContextByMentionedPokemon(context, lastUserMsg);
    return await sendToAPI(messages, filteredContext);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error calling ${API_CONFIG.provider} API:`, error);
    // Mostrar el error real en lugar de respuestas simuladas
    return `Error al conectar con la API: ${errMsg}. Verifica tu API key y la consola del navegador (F12).`;
  }
}

/**
 * Simula respuestas de IA para modo demo (sin API key)
 */
function simulateAIResponse(userMessage: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const responses = [
        `Entiendo tu pregunta sobre "${userMessage}". En Material Design 3, recomendaría usar el color primario #415F91 para elementos interactivos principales, asegurando un contraste adecuado con el fondo.`,

        `Gracias por tu consulta. Según las guías de Material Design 3, para este caso sugiero utilizar los contenedores de superficie (surface-container-high o surface-container-highest) para crear jerarquía visual apropiada.`,

        `Excelente pregunta. Te recomiendo seguir los principios de accesibilidad WCAG, manteniendo un contraste mínimo de 4.5:1 para texto normal. El tema personalizado ya cumple con estos estándares.`,

        `Para "${userMessage}", considera usar componentes elevados con sombras sutiles. En el tema claro, usa surface-container con el outline #74777F para bordes definidos.`,

        `De acuerdo con Material Design 3, te sugiero implementar estados interactivos con overlays del 8-12% para hover y 12-16% para pressed. Esto mejorará la experiencia de usuario.`,
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      resolve(randomResponse);
    }, 1000 + Math.random() * 1500);
  });
}

/**
 * Información de configuración para mostrar al usuario
 */
export function getConfigInfo() {
  const configured = API_CONFIG.useVercelApi || Boolean(API_CONFIG.apiKey?.trim() && !API_CONFIG.apiKey.startsWith('YOUR_'));

  return {
    provider: API_CONFIG.provider,
    configured,
    model: API_CONFIG.model,
    isDemoMode: !configured,
  };
}
