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
  const base = `Eres un asistente de IA para una plataforma que sigue los principios de Material Design 3. 
Debes responder de manera clara, concisa y útil. Cuando proporciones información sobre diseño:

- Prioriza la accesibilidad y los estándares WCAG
- Sugiere colores del tema personalizado cuando sea relevante
- Recomienda componentes que sigan las guías de Material Design 3
- Menciona las jerarquías visuales apropiadas usando los tokens de superficie
- Considera tanto el tema claro como el oscuro en tus recomendaciones

Tema personalizado:
- Color primario: #415F91 (light) / #AAC7FF (dark)
- Color secundario: #565F71 (light) / #BEC6DC (dark)
- Color terciario: #705575 (light) / #DDBCE0 (dark)

Siempre mantén un tono profesional, amigable y educativo.`;

  if (!context || !context.trim()) {
    return base;
  }

  return `${base}

Tienes acceso al siguiente contexto para responder preguntas sobre la página y sus datos:
---
${context.trim()}
---
Responde ÚNICAMENTE basándote en esta información cuando el usuario pregunte sobre el contenido. Si la pregunta no puede responderse con el contexto proporcionado, indícalo amablemente.`;
}
