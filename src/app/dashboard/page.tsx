'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { getOrCreateSessionId } from '@/lib/session';
import { PostGenerado } from '@/lib/types';
import CopyButton from '@/components/CopyButton';
import { formatDateShort } from '@/lib/utils';

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0 });
  const [recientes, setRecientes] = useState<PostGenerado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    if (!sessionId) { setLoading(false); return; }

    fetch('/api/posts?limit=3&count=true', {
      headers: { 'x-session-id': sessionId },
    })
      .then((r) => r.json())
      .then((json) => {
        setStats({ total: json.count ?? 0 });
        setRecientes((json.posts as PostGenerado[]) ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Bienvenido a tu generador de posts para LinkedIn.</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard
            label="Posts generados"
            value={loading ? '—' : String(stats.total)}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
              </svg>
            }
          />
        </div>

        {/* CTA */}
        <div className="card" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>¿Listo para crear contenido?</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Escribe una idea y Gemini generará hasta 3 variaciones de post listas para publicar.
            </div>
          </div>
          <Link href="/generar-posts" className="btn-primary" style={{ whiteSpace: 'nowrap', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
            </svg>
            Generar posts
          </Link>
        </div>

        {/* Recientes */}
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Generados recientemente</h2>
          {recientes.length > 0 && (
            <Link href="/historial" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Ver todos
            </Link>
          )}
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: '24px 0' }}>Cargando...</div>
        ) : recientes.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {recientes.map((item) => (
              <div key={item.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.idea}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {item.variaciones} variación{item.variaciones !== 1 ? 'es' : ''} · {formatDateShort(item.created_at)}
                    </div>
                  </div>
                </div>
                {item.posts.slice(0, 1).map((post, i) => (
                  <div key={i} style={{
                    background: 'var(--bg)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 120,
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <p style={{ margin: 0 }}>{post.substring(0, 200)}{post.length > 200 ? '…' : ''}</p>
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
                      background: 'linear-gradient(transparent, var(--bg))',
                    }} />
                  </div>
                ))}
                <div style={{ marginTop: 10 }}>
                  <CopyButton text={item.posts[0]} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
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
      <div style={{ fontSize: 36, marginBottom: 12 }}>✍️</div>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Aún no has generado posts</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
        Empieza escribiendo una idea y Gemini hará el resto.
      </div>
      <Link href="/generar-posts" className="btn-primary" style={{ textDecoration: 'none' }}>
        Generar mi primer post
      </Link>
    </div>
  );
}

