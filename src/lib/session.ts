export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem('linkedin_session_id');
    if (!id) {
      id = generateUUID();
      localStorage.setItem('linkedin_session_id', id);
    }
    return id;
  } catch {
    return generateUUID();
  }
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
