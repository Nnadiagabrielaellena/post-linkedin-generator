import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

function buildImagePrompt(texto: string): string {
  const context = texto.slice(0, 300).replace(/\n+/g, ' ').trim();
  return (
    `Professional LinkedIn post illustration, clean minimal modern business design, ` +
    `visual concept for: ${context}. ` +
    `Flat illustration, subtle gradients, warm amber and navy palette, no text, no faces, social media ready`
  );
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const { allowed } = checkRateLimit(`imagen:${ip}`, 6, 60_000); // 6 req/min por IP
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas peticiones. Espera un momento e intenta de nuevo.' },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { texto, variaciones } = body;

  if (!texto?.trim()) {
    return NextResponse.json({ error: 'El texto del post es requerido' }, { status: 400 });
  }

  const numVariaciones = Math.min(Math.max(Number(variaciones) || 1, 1), 3);
  const prompt = buildImagePrompt(texto.trim());
  const encodedPrompt = encodeURIComponent(prompt);

  try {
    // Fetch each variation in parallel; use different seeds for variety
    const requests = Array.from({ length: numVariaciones }, (_, i) => {
      const seed = Math.floor(Math.random() * 1_000_000) + i * 100;
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;
      return fetch(url).then(async (res) => {
        if (!res.ok) throw new Error(`Pollinations error ${res.status}`);
        const buffer = await res.arrayBuffer();
        const b64 = Buffer.from(buffer).toString('base64');
        const mime = res.headers.get('content-type') ?? 'image/jpeg';
        return `data:${mime};base64,${b64}`;
      });
    });

    const imagenes = await Promise.all(requests);
    return NextResponse.json({ imagenes });
  } catch (err: unknown) {
    console.error('Image generation error:', err);
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('fetch') || msg.includes('ENOTFOUND')) {
      return NextResponse.json(
        { error: 'No se pudo conectar con el servicio de imágenes. Verifica tu conexión.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Error al generar las imágenes. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
