/**
 * Short date format: "3 ene 2025"
 * Used on the dashboard where space is tight.
 */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Relative date format: "Hoy, 14:30" / "Ayer" / "Hace 3 días" / "3 de enero de 2025"
 * Used on the history page where context helps.
 */
export function formatDateRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Hoy, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
