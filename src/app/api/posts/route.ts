import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id');
  if (!sessionId || !UUID_REGEX.test(sessionId)) {
    return NextResponse.json({ error: 'Session ID inválido' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const withCount = searchParams.get('count') === 'true';
  const limit = limitParam ? Math.min(Math.max(Number(limitParam), 1), 100) : 100;

  const supabase = createServerClient();
  const { data, error, count } = await supabase
    .from('posts_generados')
    .select('*', withCount ? { count: 'exact' } : undefined)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Supabase error [GET /api/posts]:', error);
    return NextResponse.json({ error: 'Error al obtener los posts.' }, { status: 500 });
  }

  return NextResponse.json({ posts: data ?? [], ...(withCount ? { count: count ?? 0 } : {}) });
}
