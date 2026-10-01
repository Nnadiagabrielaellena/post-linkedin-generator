'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/generar-posts',
    label: 'Generar posts',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
      </svg>
    ),
  },
  {
    href: '/personalizacion',
    label: 'Personalización',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    href: '/generar-imagen',
    label: 'Generar imagen',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
  },
  {
    href: '/historial',
    label: 'Historial',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 15" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside style={{
        width: 240,
        minWidth: 240,
        background: 'var(--sidebar-bg)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
      }} className="sidebar-desktop">
        {/* Logo */}
        <div style={{
          padding: '28px 20px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              background: 'var(--accent)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-fg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
              </svg>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>PostLinked</div>
              <div style={{ color: 'var(--sidebar-text)', fontSize: 12 }}>Generador con IA</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                  background: isActive ? 'var(--sidebar-active)' : 'transparent',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 14,
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)';
                    (e.currentTarget as HTMLElement).style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)';
                  }
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }}>{item.icon}</span>
                {item.label}
                {isActive && (
                  <span style={{
                    marginLeft: 'auto',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    flexShrink: 0,
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--sidebar-text)', lineHeight: 1.5 }}>
            Conectado con<br />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Gemini AI</span>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="sidebar-mobile" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--sidebar-bg)',
        display: 'flex',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 4px 8px',
                color: isActive ? 'var(--accent)' : 'var(--sidebar-text)',
                textDecoration: 'none',
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {item.icon}
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>

      <style>{`
        @media (max-width: 640px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile { display: flex !important; }
        }
        @media (min-width: 641px) {
          .sidebar-desktop { display: flex !important; }
          .sidebar-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}
