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

    const systemPrompt = buildSystemPrompt(context);
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

function buildSystemPrompt(context) {
  const base = `Eres un asistente de la Pokédex. Responde ÚNICAMENTE basándote en la información proporcionada (contenido de la página y datos de la PokeAPI).
Sé tolerante con la ortografía y los errores de escritura: interpreta la intención del usuario aunque escriba con faltas, typos o abreviaturas.
Si la pregunta no puede responderse con el contexto disponible, indícalo amablemente. Mantén un tono amigable y conciso.`;

  if (!context || !context.trim()) {
    return base;
  }

  return `${base}

CONTEXTO (datos de la página y PokeAPI):
---
${context.trim()}
---
Responde SOLO con la información de este contexto. No inventes datos.`;
}
