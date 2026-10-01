'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import ErrorBanner from '@/components/ErrorBanner';
import Spinner from '@/components/Spinner';
import { getOrCreateSessionId } from '@/lib/session';
import { PostGenerado } from '@/lib/types';

type Fuente = 'historial' | 'manual';

export default function GenerarImagenPage() {
  const [fuente, setFuente] = useState<Fuente>('historial');
  const [historial, setHistorial] = useState<PostGenerado[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [postSeleccionado, setPostSeleccionado] = useState('');
  const [textoManual, setTextoManual] = useState('');
  const [postIndexSeleccionado, setPostIndexSeleccionado] = useState<string>('');
  const [variaciones, setVariaciones] = useState(1);
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    if (!sessionId) { setLoadingHistorial(false); return; }

    fetch('/api/posts?limit=20', { headers: { 'x-session-id': sessionId } })
      .then((r) => r.json())
      .then((json) => setHistorial((json.posts as PostGenerado[]) ?? []))
      .catch(() => {})
      .finally(() => setLoadingHistorial(false));
  }, []);

  // Build flat list of selectable posts from historial
  const opcionesPosts: { label: string; texto: string; key: string }[] = historial.flatMap(
    (item) =>
      item.posts.map((post, i) => ({
        key: `${item.id}-${i}`,
        label:
          item.posts.length > 1
            ? `${item.idea.slice(0, 50)}… — Variación ${i + 1}`
            : item.idea.slice(0, 60) + (item.idea.length > 60 ? '…' : ''),
        texto: post,
      }))
  );

  function handleSelectPost(key: string) {
    setPostIndexSeleccionado(key);
    const opcion = opcionesPosts.find((o) => o.key === key);
    setPostSeleccionado(opcion?.texto ?? '');
  }

  const textoActivo = fuente === 'historial' ? postSeleccionado : textoManual;
  const puedeGenerar = textoActivo.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeGenerar) return;

    setLoading(true);
    setError('');
    setImagenes([]);

    try {
      const res = await fetch('/api/generar-imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: textoActivo.trim(), variaciones }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al generar las imágenes.');
        return;
      }

      setImagenes(json.imagenes);
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  function descargarImagen(dataUrl: string, index: number) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `imagen-linkedin-${index + 1}.png`;
    a.click();
  }

  return (
    <AppLayout>
      <h1 className="page-title">Generar imagen</h1>
      <p className="page-subtitle">
        Crea imágenes con IA para acompañar tus posts de LinkedIn usando gpt-image-2.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>

          {/* Source selector */}
          <div>
            <label className="field-label">Origen del texto</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['historial', 'manual'] as Fuente[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setFuente(f); setImagenes([]); setError(''); }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    border: `2px solid ${fuente === f ? 'var(--accent)' : 'var(--border)'}`,
                    background: fuente === f ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--surface)',
                    color: fuente === f ? 'var(--accent)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font)',
                    fontSize: 14,
                    fontWeight: fuente === f ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {f === 'historial' ? 'Seleccionar post anterior' : 'Pegar texto nuevo'}
                </button>
              ))}
            </div>
          </div>

          {/* Historial selector */}
          {fuente === 'historial' && (
            <div>
              <label htmlFor="post-select" className="field-label">Post a ilustrar</label>
              {loadingHistorial ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Cargando historial...</div>
              ) : opcionesPosts.length === 0 ? (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg)',
                  borderRadius: 8,
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  border: '1px dashed var(--border)',
                }}>
                  No tienes posts generados aún. Prueba con &quot;Pegar texto nuevo&quot;.
                </div>
              ) : (
                <>
                  <select
                    id="post-select"
                    className="field-input"
                    value={postIndexSeleccionado}
                    onChange={(e) => handleSelectPost(e.target.value)}
                  >
                    <option value="">— Elige un post —</option>
                    {opcionesPosts.map((o) => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                  </select>
                  {postSeleccionado && (
                    <div style={{
                      marginTop: 10,
                      padding: '12px 14px',
                      background: 'var(--bg)',
                      borderRadius: 8,
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      maxHeight: 120,
                      overflow: 'hidden',
                      position: 'relative',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ overflow: 'hidden', maxHeight: 96, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {postSeleccionado}
                      </div>
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 32,
                        background: 'linear-gradient(transparent, var(--bg))',
                        borderRadius: '0 0 8px 8px',
                      }} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Manual text */}
          {fuente === 'manual' && (
            <div>
              <label htmlFor="texto-manual" className="field-label">Texto del post</label>
              <textarea
                id="texto-manual"
                className="field-input"
                placeholder="Pega aquí el texto de tu post de LinkedIn..."
                value={textoManual}
                onChange={(e) => setTextoManual(e.target.value)}
                style={{ minHeight: 140 }}
              />
            </div>
          )}

          {/* Variations */}
          <div>
            <label className="field-label">Variaciones de imagen</label>
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
                imagen{variaciones !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>

          <ErrorBanner message={error} />

          <div>
            <button type="submit" className="btn-primary" disabled={loading || !puedeGenerar}>
              {loading ? (
                <>
                  <Spinner />
                  Generando {variaciones > 1 ? `${variaciones} imágenes` : 'imagen'}...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  Generar {variaciones > 1 ? `${variaciones} imágenes` : 'imagen'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {loading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          padding: '40px 0',
          color: 'var(--text-secondary)',
          fontSize: 14,
        }}>
          <Spinner />
          <span>Generando {variaciones > 1 ? `${variaciones} imágenes` : 'imagen'}… esto puede tomar unos segundos.</span>
        </div>
      )}

      {imagenes.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>
            {imagenes.length} imagen{imagenes.length !== 1 ? 'es' : ''} generada{imagenes.length !== 1 ? 's' : ''}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {imagenes.map((src, i) => (
              <ImagenResult
                key={i}
                src={src}
                index={i}
                total={imagenes.length}
                onDownload={() => descargarImagen(src, i)}
              />
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function ImagenResult({
  src,
  index,
  total,
  onDownload,
}: {
  src: string;
  index: number;
  total: number;
  onDownload: () => void;
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--accent)',
          background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
          padding: '3px 10px',
          borderRadius: 20,
        }}>
          {total > 1 ? `Variación ${index + 1}` : 'Imagen generada'}
        </div>
        <button
          onClick={onDownload}
          title="Descargar imagen"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 7,
            border: '1.5px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
            (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          Descargar
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Imagen generada ${index + 1}`}
        style={{
          width: '100%',
          borderRadius: 8,
          display: 'block',
          aspectRatio: '1 / 1',
          objectFit: 'cover',
        }}
      />
    </div>
  );
}
