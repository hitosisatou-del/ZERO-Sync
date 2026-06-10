'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  LogOut, 
  Layers 
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

type Theme = 'midnight-cosmic' | 'light-cyber' | 'sunset-cyberpunk' | 'emerald-forest';

const themes: { id: Theme; label: string; gradient: string; accentColor: string }[] = [
  {
    id: 'midnight-cosmic',
    label: 'Cosmic',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    accentColor: '#6366f1'
  },
  {
    id: 'light-cyber',
    label: 'Light',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    accentColor: '#4f46e5'
  },
  {
    id: 'sunset-cyberpunk',
    label: 'Sunset',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    accentColor: '#ec4899'
  },
  {
    id: 'emerald-forest',
    label: 'Forest',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    accentColor: '#10b981'
  }
];

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [theme, setTheme] = useState<Theme>('midnight-cosmic');

  useEffect(() => {
    const savedTheme = localStorage.getItem('zero-theme') as Theme;
    if (savedTheme && ['midnight-cosmic', 'light-cyber', 'sunset-cyberpunk', 'emerald-forest'].includes(savedTheme)) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('zero-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const isLoginPage = pathname === '/login';

  const handleLogout = async () => {
    try {
      // 1. ダミークッキーの削除
      document.cookie = "sb-dummy-session=; path=/; max-age=0";
      
      // 2. サーバーサイドのSession Cookieを破棄
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // 3. Firebase Auth クライアントのサインアウト
      try {
        await auth.signOut();
      } catch (e) {
        // 設定未完了時のエラーなどは無視して進める
      }

      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  // ナビゲーション項目
  const navItems = [
    {
      name: '投稿履歴一覧',
      path: '/', // dashboard
      icon: LayoutDashboard,
    },
    {
      name: '新規投稿作成',
      path: '/posts/new',
      icon: PlusCircle,
    },
    {
      name: 'アカウント連携',
      path: '/settings/accounts',
      icon: Settings,
    },
  ];

  return (
    <div className="app-container">
      {/* サイドバー */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{
            background: 'var(--accent-gradient)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--accent-glow)'
          }}>
            <Layers size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
              ZERO Sync
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Miyakonojo DS MVP
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            // 完全一致またはサブパスの判定 (root `/` の場合は完全一致にする)
            const isActive = item.path === '/' 
              ? pathname === '/' || pathname.startsWith('/dashboard') || pathname.startsWith('/posts/') && pathname !== '/posts/new'
              : pathname.startsWith(item.path);

            return (
              <Link 
                key={item.path} 
                href={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--nav-active-bg)' : 'transparent',
                  border: isActive ? '1px solid var(--nav-active-border)' : '1px solid transparent',
                  transition: 'all var(--transition-fast)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.95rem'
                }}
                className={isActive ? '' : 'nav-hover'}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--accent-primary)' : 'inherit' }} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* テーマ設定 */}
          <div>
            <span style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em', 
              display: 'block', 
              marginBottom: '0.75rem', 
              fontWeight: 600 
            }}>
              テーマ設定
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {themes.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleThemeChange(t.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.5rem 0.25rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                      border: '1px solid ' + (isSelected ? 'var(--accent-primary)' : 'var(--border-color)'),
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                    className={isSelected ? '' : 'theme-item-hover'}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: t.gradient,
                      boxShadow: isSelected ? '0 0 8px ' + t.accentColor : 'none'
                    }} />
                    <span style={{ fontSize: '0.7rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isSelected ? 600 : 500 }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              gap: '0.875rem',
              padding: '0.875rem 1rem',
              border: '1px solid transparent',
              background: 'transparent',
              color: 'var(--text-muted)'
            }}
          >
            <LogOut size={18} />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="main-content">
        {children}
      </main>

      <style jsx global>{`
        .nav-hover:hover {
          background: rgba(255, 255, 255, 0.03) !important;
          color: var(--text-primary) !important;
        }
        .theme-item-hover:hover {
          background: var(--bg-tertiary) !important;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
