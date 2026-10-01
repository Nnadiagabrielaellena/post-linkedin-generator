export default function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      style={{
        background: 'color-mix(in srgb, var(--error) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
        borderRadius: 8,
        padding: '10px 14px',
        color: 'var(--error)',
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}
