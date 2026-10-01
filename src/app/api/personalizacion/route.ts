import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id');
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('personalizacion')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null });
}

export async function POST(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id');
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 });
  }

  const body = await request.json();
  const { descripcion_negocio, industria, audiencia_objetivo, ejemplos_posts } = body;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('personalizacion')
    .upsert(
      {
        session_id: sessionId,
        descripcion_negocio: descripcion_negocio ?? '',
        industria: industria ?? '',
        audiencia_objetivo: audiencia_objetivo ?? '',
        ejemplos_posts: ejemplos_posts ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
