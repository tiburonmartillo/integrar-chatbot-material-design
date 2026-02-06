/**
 * Vercel Serverless Function - Proxy para Groq API
 * La API key se guarda en Vercel (Environment Variables) y nunca se expone al frontend.
 *
 * Configura GROQ_API_KEY en: Vercel Dashboard → Project → Settings → Environment Variables
 */

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GROQ_API_KEY no configurada. Añádela en Vercel → Settings → Environment Variables',
    });
  }

  try {
    const { messages, context } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Se requiere un array de messages' });
    }

    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content || '';
    const filteredContext = filterContextByMentionedPokemon(context, lastUserMessage);

    const systemPrompt = buildSystemPrompt(filteredContext);
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API error:', response.status, errText);
      return res.status(response.status).json({
        error: `Groq API error: ${response.status}`,
        details: errText,
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    return res.status(200).json({ content });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error: 'Error al conectar con Groq',
      details: error.message,
    });
  }
}

// Límite para no exceder tokens de Groq (llama-3.1-8b: 6K TPM)
const MAX_CONTEXT_CHARS = 9000;

/**
 * Filtra el contexto para incluir solo los Pokémon mencionados en el mensaje del usuario.
 * Reduce tokens cuando la pregunta es sobre Pokémon específicos.
 */
function filterContextByMentionedPokemon(context, userMessage) {
  if (!context || !context.trim()) return context;

  const lines = context.trim().split('\n');
  const headerLines = lines.slice(0, 2); // "POKÉDEX..." y línea vacía
  const pokemonLines = lines.slice(2).filter((l) => l.startsWith('#'));

  if (pokemonLines.length === 0) return context;

  const msg = userMessage.toLowerCase().replace(/[.-]/g, ' ');

  const pokemonWithNames = pokemonLines.map((line) => {
    const match = line.match(/^#\d+\s+([^|]+)\|/);
    const name = match ? match[1].trim().toLowerCase().replace(/-/g, ' ') : '';
    return { line, name };
  });

  const mentioned = pokemonWithNames.filter(({ name }) => name && msg.includes(name));

  if (mentioned.length === 0) {
    return context;
  }

  const filtered = [...headerLines, '', ...mentioned.map((m) => m.line)].join('\n');
  return filtered;
}

function buildSystemPrompt(context) {
  const base = `Eres un asistente de la Pokédex. Responde ÚNICAMENTE basándote en la información proporcionada (contenido de la página y datos de la PokeAPI).
Sé tolerante con la ortografía y los errores de escritura: interpreta la intención del usuario aunque escriba con faltas, typos o abreviaturas.
Si la pregunta no puede responderse con el contexto disponible, indícalo amablemente. Mantén un tono amigable y conciso.`;

  if (!context || !context.trim()) {
    return base;
  }

  const trimmed = context.trim();
  const truncated = trimmed.length > MAX_CONTEXT_CHARS
    ? trimmed.slice(0, MAX_CONTEXT_CHARS) + '\n\n[... contexto truncado por límite de la API ...]'
    : trimmed;

  return `${base}

CONTEXTO (datos de la página y PokeAPI):
---
${truncated}
---
Responde SOLO con la información de este contexto. No inventes datos.`;
}
