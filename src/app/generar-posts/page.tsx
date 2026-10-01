'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import CopyButton from '@/components/CopyButton';
import { getOrCreateSessionId } from '@/lib/session';

export default function GenerarPostsPage() {
  const [idea, setIdea] = useState('');
  const [variaciones, setVariaciones] = useState(1);
  const [posts, setPosts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;

    setLoading(true);
    setError('');
    setPosts([]);

    const sessionId = getOrCreateSessionId();

    try {
      const res = await fetch('/api/generar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({ idea: idea.trim(), variaciones }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al generar los posts.');
        return;
      }

      setPosts(json.posts);
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <h1 className="page-title">Generar posts</h1>
      <p className="page-subtitle">
        Escribe tu idea y Gemini creará posts listos para publicar en LinkedIn.
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label htmlFor="idea" className="field-label">Tu idea</label>
            <textarea
              id="idea"
              className="field-input"
              placeholder="Ej: Quiero hablar sobre los 3 errores que cometen los emprendedores al comenzar..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              style={{ minHeight: 120 }}
              required
            />
          </div>

          <div>
            <label className="field-label">Variaciones</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setVariaciones(n)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    border: `2px solid ${variaciones === n ? 'var(--accent)' : 'var(--border)'}`,
                    background: variaciones === n ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--surface)',
                    color: variaciones === n ? 'var(--accent)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font)',
                    fontSize: 15,
                    fontWeight: variaciones === n ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {n}
                </button>
              ))}
              <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--text-secondary)', marginLeft: 4 }}>
                post{variaciones !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'color-mix(in srgb, var(--error) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
              borderRadius: 8,
              padding: '10px 14px',
              color: 'var(--error)',
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <div>
            <button type="submit" className="btn-primary" disabled={loading || !idea.trim()}>
              {loading ? (
                <>
                  <Spinner />
                  Generando...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Generar {variaciones > 1 ? `${variaciones} posts` : 'post'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {posts.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>
            {posts.length} post{posts.length !== 1 ? 's' : ''} generado{posts.length !== 1 ? 's' : ''}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {posts.map((post, i) => (
              <PostResult key={i} post={post} index={i + 1} total={posts.length} />
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function PostResult({ post, index, total }: { post: string; index: number; total: number }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--accent)',
          background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
          padding: '3px 10px',
          borderRadius: 20,
        }}>
          {total > 1 ? `Variación ${index}` : 'Post generado'}
        </div>
        <CopyButton text={post} />
      </div>
      <div style={{
        fontSize: 15,
        lineHeight: 1.7,
        color: 'var(--text-primary)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {post}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
