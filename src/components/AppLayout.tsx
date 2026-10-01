import Sidebar from './Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg)',
    }}>
      <Sidebar />
      <main style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '36px 32px',
        paddingBottom: 'calc(36px + env(safe-area-inset-bottom, 0px))',
        maxWidth: 860,
      }}>
        {children}
      </main>
    </div>
  );
}
