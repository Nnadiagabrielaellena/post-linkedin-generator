'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { getOrCreateSessionId } from '@/lib/session';
import { Personalizacion } from '@/lib/types';

const INDUSTRIAS = [
  'Tecnología',
  'Marketing y Publicidad',
  'Finanzas y Contabilidad',
  'Salud y Bienestar',
  'Educación',
  'Consultoría',
  'Recursos Humanos',
  'Ventas',
  'Emprendimiento',
  'Legal',
  'Inmobiliaria',
  'Retail y E-commerce',
  'Diseño y Creatividad',
  'Manufactura',
  'Otra',
];

const EMPTY_FORM: Omit<Personalizacion, 'session_id'> = {
  descripcion_negocio: '',
  industria: '',
  audiencia_objetivo: '',
  ejemplos_posts: ['', '', ''],
};

export default function PersonalizacionPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    if (!sessionId) { setLoading(false); return; }

    fetch('/api/personalizacion', {
      headers: { 'x-session-id': sessionId },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setForm({
            descripcion_negocio: json.data.descripcion_negocio ?? '',
            industria: json.data.industria ?? '',
            audiencia_objetivo: json.data.audiencia_objetivo ?? '',
            ejemplos_posts: [
              ...((json.data.ejemplos_posts as string[]) ?? []),
              '', '', '',
            ].slice(0, 3),
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');

    const sessionId = getOrCreateSessionId();
    const payload = {
      ...form,
      ejemplos_posts: form.ejemplos_posts.filter((e) => e.trim() !== ''),
    };

    try {
      const res = await fetch('/api/personalizacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'No se pudo guardar.');
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  }

  function updateEjemplo(index: number, value: string) {
    const next = [...form.ejemplos_posts];
    next[index] = value;
    setForm({ ...form, ejemplos_posts: next });
  }

  if (loading) {
    return (
      <AppLayout>
        <div style={{ color: 'var(--text-secondary)', padding: '48px 0' }}>Cargando perfil...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="page-title">Personalización</h1>
      <p className="page-subtitle">
        Esta información se usa para que los posts generados estén adaptados a tu voz y negocio.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div className="card">
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: 'var(--text-primary)' }}>Tu negocio</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div>
                <label htmlFor="descripcion" className="field-label">Descripción del negocio</label>
                <textarea
                  id="descripcion"
                  className="field-input"
                  placeholder="Ej: Somos una agencia de marketing digital especializada en pymes latinoamericanas. Ayudamos a nuestros clientes a crecer su presencia en redes sociales y generar leads calificados."
                  value={form.descripcion_negocio}
                  onChange={(e) => setForm({ ...form, descripcion_negocio: e.target.value })}
                  style={{ minHeight: 100 }}
                />
              </div>

              <div>
                <label htmlFor="industria" className="field-label">Industria</label>
                <select
                  id="industria"
                  className="field-input"
                  value={form.industria}
                  onChange={(e) => setForm({ ...form, industria: e.target.value })}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Seleccionar industria...</option>
                  {INDUSTRIAS.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="audiencia" className="field-label">Audiencia objetivo</label>
                <textarea
                  id="audiencia"
                  className="field-input"
                  placeholder="Ej: Emprendedores y dueños de pymes entre 25 y 45 años que quieren digitalizar su negocio pero no saben por dónde empezar."
                  value={form.audiencia_objetivo}
                  onChange={(e) => setForm({ ...form, audiencia_objetivo: e.target.value })}
                  style={{ minHeight: 80 }}
                />
              </div>

            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>Ejemplos de posts</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              Pega hasta 3 posts propios que representen tu estilo. La IA los usará como referencia de tono y voz.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {form.ejemplos_posts.map((ejemplo, i) => (
                <div key={i}>
                  <label htmlFor={`ejemplo-${i}`} className="field-label">
                    Ejemplo {i + 1} <span style={{ fontWeight: 400, opacity: 0.7 }}>(opcional)</span>
                  </label>
                  <textarea
                    id={`ejemplo-${i}`}
                    className="field-input"
                    placeholder={`Pega aquí un post que represente tu estilo...`}
                    value={ejemplo}
                    onChange={(e) => updateEjemplo(i, e.target.value)}
                    style={{ minHeight: 90 }}
                  />
                </div>
              ))}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Spinner />
                  Guardando...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Guardar perfil
                </>
              )}
            </button>

            {saved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontSize: 14, fontWeight: 500 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Perfil guardado
              </div>
            )}
          </div>

        </div>
      </form>
    </AppLayout>
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
