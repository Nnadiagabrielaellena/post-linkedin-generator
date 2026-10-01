import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function geminiUserError(msg: string): string {
  if (msg.includes('503') || msg.includes('Service Unavailable'))
    return 'Gemini está saturado en este momento. Espera unos segundos e intenta de nuevo.';
  if (msg.includes('404') || msg.includes('no longer available'))
    return 'Este modelo de Gemini no está disponible para tu API key. Contacta soporte.';
  if (msg.includes('API_KEY') || msg.includes('401') || msg.includes('403'))
    return 'API key de Gemini inválida. Verifica tu GOOGLE_GENERATIVE_AI_API_KEY en .env.local.';
  return 'Error al generar los posts. Intenta de nuevo.';
}

function buildPrompt(
  idea: string,
  variaciones: number,
  perfil: {
    descripcion_negocio: string;
    industria: string;
    audiencia_objetivo: string;
    ejemplos_posts: string[];
  } | null
): string {
  const perfilSection = perfil
    ? `
## Contexto del negocio / marca
- Descripción: ${perfil.descripcion_negocio || 'No especificada'}
- Industria: ${perfil.industria || 'No especificada'}
- Audiencia objetivo: ${perfil.audiencia_objetivo || 'No especificada'}
${
  perfil.ejemplos_posts?.length > 0
    ? `- Ejemplos de posts anteriores (usa el tono y estilo de referencia):
${perfil.ejemplos_posts.map((e, i) => `  Ejemplo ${i + 1}: "${e}"`).join('\n')}`
    : ''
}
`
    : '';

  return `Eres un experto en LinkedIn con años de experiencia creando contenido que genera engagement y posiciona marcas personales y empresariales.
${perfilSection}
## Tarea
Genera exactamente ${variaciones} variación${variaciones > 1 ? 'es' : ''} de post para LinkedIn basado en esta idea:

"${idea}"

## Reglas para cada post
- Longitud: entre 150 y 400 palabras
- Estructura profesional: apertura que engancha, desarrollo con valor, cierre con llamada a la acción
- Tono: conversacional pero profesional, auténtico
- Máximo 3-5 hashtags relevantes al final (no genéricos como #LinkedIn)
- Sin emojis excesivos (máximo 2-3 por post, solo si añaden valor)
- Cada post debe ser claramente diferente en enfoque, estructura o tono

## Formato de respuesta
Devuelve ÚNICAMENTE un JSON válido con este formato exacto, sin markdown, sin explicaciones adicionales:
{"posts": ["post 1 completo aquí", "post 2 completo aquí"]}`;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const { allowed } = checkRateLimit(`generar:${ip}`, 10, 60_000); // 10 req/min por IP
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas peticiones. Espera un momento e intenta de nuevo.' },
      { status: 429 }
    );
  }

  const sessionId = request.headers.get('x-session-id');
  if (!sessionId || !UUID_REGEX.test(sessionId)) {
    return NextResponse.json({ error: 'Session ID inválido' }, { status: 400 });
  }

  const body = await request.json();
  const { idea, variaciones } = body;

  if (!idea?.trim()) {
    return NextResponse.json({ error: 'La idea es requerida' }, { status: 400 });
  }

  const numVariaciones = Math.min(Math.max(Number(variaciones) || 1, 1), 3);

  const supabase = createServerClient();

  // Fetch personalization profile
  const { data: perfil } = await supabase
    .from('personalizacion')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  const prompt = buildPrompt(idea.trim(), numVariaciones, perfil);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    let result;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        const isSaturated = msg.includes('503') || msg.includes('Service Unavailable');
        if (isSaturated && attempt < 4) {
          await sleep(attempt * 1500);
        } else {
          throw err;
        }
      }
    }

    const responseText = result!.response.text().trim();

    // Parse JSON response
    let posts: string[] = [];
    try {
      // Remove potential markdown code blocks
      const cleaned = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(cleaned);
      posts = parsed.posts ?? [];
    } catch {
      // Fallback: treat the whole response as a single post
      posts = [responseText];
    }

    if (posts.length === 0) {
      return NextResponse.json({ error: 'No se pudieron generar posts' }, { status: 500 });
    }

    // Save to Supabase
    const { data: saved, error: saveError } = await supabase
      .from('posts_generados')
      .insert({
        session_id: sessionId,
        idea: idea.trim(),
        variaciones: numVariaciones,
        posts,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving posts:', saveError);
    }

    return NextResponse.json({ posts, id: saved?.id });
  } catch (err: unknown) {
    console.error('Gemini error:', err);
    const msg = err instanceof Error ? err.message : '';
    return NextResponse.json({ error: geminiUserError(msg) }, { status: 500 });
  }
}
