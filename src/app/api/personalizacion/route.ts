import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id');
  if (!sessionId || !UUID_REGEX.test(sessionId)) {
    return NextResponse.json({ error: 'Session ID inválido' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('personalizacion')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Supabase error [GET /api/personalizacion]:', error);
    return NextResponse.json({ error: 'Error al obtener el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null });
}

export async function POST(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id');
  if (!sessionId || !UUID_REGEX.test(sessionId)) {
    return NextResponse.json({ error: 'Session ID inválido' }, { status: 400 });
  }

  const body = await request.json();
  const { descripcion_negocio, industria, audiencia_objetivo, ejemplos_posts } = body;

  // Basic type checks to prevent unexpected data shapes
  if (
    (descripcion_negocio !== undefined && typeof descripcion_negocio !== 'string') ||
    (industria !== undefined && typeof industria !== 'string') ||
    (audiencia_objetivo !== undefined && typeof audiencia_objetivo !== 'string') ||
    (ejemplos_posts !== undefined && !Array.isArray(ejemplos_posts))
  ) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('personalizacion')
    .upsert(
      {
        session_id: sessionId,
        descripcion_negocio: String(descripcion_negocio ?? '').slice(0, 2000),
        industria: String(industria ?? '').slice(0, 200),
        audiencia_objetivo: String(audiencia_objetivo ?? '').slice(0, 1000),
        ejemplos_posts: (ejemplos_posts ?? [])
          .slice(0, 3)
          .map((e: unknown) => String(e ?? '').slice(0, 3000)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Supabase error [POST /api/personalizacion]:', error);
    return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
