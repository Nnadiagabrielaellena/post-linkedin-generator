'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import CopyButton from '@/components/CopyButton';
import { getOrCreateSessionId } from '@/lib/session';
import { PostGenerado } from '@/lib/types';
import Link from 'next/link';
import { formatDateRelative } from '@/lib/utils';

export default function HistorialPage() {
  const [historial, setHistorial] = useState<PostGenerado[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    if (!sessionId) { setLoading(false); return; }

    fetch('/api/posts', { headers: { 'x-session-id': sessionId } })
      .then((r) => r.json())
      .then((json) => setHistorial((json.posts as PostGenerado[]) ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AppLayout>
      <h1 className="page-title">Historial</h1>
      <p className="page-subtitle">
        Todos los posts que has generado, en orden cronológico.
      </p>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', padding: '24px 0' }}>Cargando historial...</div>
      ) : historial.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {historial.map((item) => {
            const isExpanded = expanded.has(item.id);
            return (
              <div key={item.id} className="card">
                <div
                  onClick={() => toggleExpand(item.id)}
                  style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, wordBreak: 'break-word' }}>
                      {item.idea}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {formatDateRelative(item.created_at)}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                        color: 'var(--accent)',
                        padding: '2px 8px',
                        borderRadius: 20,
                      }}>
                        {item.variaciones} post{item.variaciones !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-secondary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {item.posts.map((post, i) => (
                      <div key={i} style={{
                        background: 'var(--bg)',
                        borderRadius: 8,
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}>
                        {item.posts.length > 1 && (
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Variación {i + 1}
                          </div>
                        )}
                        <div style={{
                          fontSize: 14,
                          lineHeight: 1.7,
                          color: 'var(--text-primary)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}>
                          {post}
                        </div>
                        <div>
                          <CopyButton text={post} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

function EmptyState() {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: 'var(--surface)',
      border: '1px dashed var(--border)',
      borderRadius: 'var(--radius)',
    }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Tu historial está vacío</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
        Los posts que generes aparecerán aquí.
      </div>
      <Link href="/generar-posts" className="btn-primary" style={{ textDecoration: 'none' }}>
        Generar posts
      </Link>
    </div>
  );
}

