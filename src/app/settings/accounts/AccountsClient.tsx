'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  CheckCircle2, 
  AlertCircle, 
  Link2, 
  Link2Off,
  UserCheck,
  Calendar,
  Users,
  UserPlus,
  Shield
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, GoogleBusinessIcon } from '@/components/Icons';
import { ConnectedAccount } from '@/lib/services/db';

interface AccountsClientProps {
  initialAccounts: ConnectedAccount[];
}

export default function AccountsClient({ initialAccounts }: AccountsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(initialAccounts);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ユーザー管理用の状態
  const [activeTab, setActiveTab] = useState<'sns' | 'users'>('sns');
  const [userList, setUserList] = useState<Array<{ email: string; role: 'admin' | 'editor' }>>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'editor'>('editor');

  // URLクエリパラメータから連携成否を受け取る
  useEffect(() => {
    const success = searchParams.get('success');
    const errorParam = searchParams.get('error');

    if (success) {
      setSuccessMessage('アカウントの連携に成功しました！');
      router.replace('/settings/accounts');
    }
    if (errorParam) {
      setError(errorParam);
      router.replace('/settings/accounts');
    }
  }, [searchParams, router]);

  // 指定プラットフォームのアカウントが連携されているか取得
  const getAccountByPlatform = (platform: string) => {
    return accounts.find(a => a.platform === platform);
  };

  // 連携の実行
  const handleConnect = async (platform: 'instagram' | 'facebook' | 'google_business_profile') => {
    setIsLoading(platform);
    setError(null);
    setSuccessMessage(null);

    // モックセッションかどうか判定
    const isMockSession = document.cookie.includes('sb-dummy-session=');

    // モックセッションでない場合は、実際のOAuthエンドポイントへ遷移
    if (!isMockSession) {
      if (platform === 'facebook' || platform === 'instagram') {
        window.location.href = '/api/auth/meta';
        return;
      }
      if (platform === 'google_business_profile') {
        window.location.href = '/api/auth/google';
        return;
      }
    }

    // OAuth連携のモック処理（APIへダミー連携リクエスト）
    try {
      const response = await fetch('/api/settings/accounts/mock-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '連携処理に失敗しました。');
      }

      // ローカルステータスの更新
      const updatedAccounts = await fetch('/api/settings/accounts/list').then(r => r.json());
      setAccounts(updatedAccounts);
      router.refresh();
    } catch (err: any) {
      setError(`${platform}の連携中にエラーが発生しました: ${err.message}`);
    } finally {
      setIsLoading(null);
    }
  };

  // 連携解除の実行
  const handleDisconnect = async (platform: 'instagram' | 'facebook' | 'google_business_profile') => {
    if (!confirm(`${platform === 'google_business_profile' ? 'Googleビジネスプロフィール' : platform}の連携を解除しますか？`)) {
      return;
    }

    setIsLoading(platform);
    setError(null);

    try {
      const response = await fetch(`/api/settings/accounts/disconnect?platform=${platform}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '連携解除に失敗しました。');
      }

      // アカウントリストの再取得
      const updatedAccounts = await fetch('/api/settings/accounts/list').then(r => r.json());
      setAccounts(updatedAccounts);
      router.refresh();
    } catch (err: any) {
      setError(`${platform}の連携解除中にエラーが発生しました: ${err.message}`);
    } finally {
      setIsLoading(null);
    }
  };

  // ユーザー一覧の取得
  const fetchUsers = async () => {
    setIsListLoading(true);
    try {
      const res = await fetch('/api/settings/users/list');
      if (res.ok) {
        const data = await res.json();
        setUserList(data.users || []);
      } else {
        const data = await res.json();
        setError(data.error || 'ユーザー一覧の取得に失敗しました。');
      }
    } catch (err: any) {
      setError('ユーザー一覧の取得中にエラーが発生しました。');
    } finally {
      setIsListLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  // ユーザーの追加
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setError('有効なメールアドレスを入力してください。');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/settings/users/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: newEmail.trim().toLowerCase(), 
          role: newRole 
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(`ユーザー ${newEmail} を追加しました。`);
        setNewEmail('');
        setNewRole('editor');
        fetchUsers();
      } else {
        setError(data.error || 'ユーザーの追加に失敗しました。');
      }
    } catch (err: any) {
      setError('ユーザー追加中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ユーザーの削除
  const handleDeleteUser = async (email: string) => {
    if (!confirm(`ユーザー ${email} の権限設定を削除しますか？`)) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/settings/users/delete?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(`ユーザー ${email} を削除しました。`);
        fetchUsers();
      } else {
        setError(data.error || 'ユーザーの削除に失敗しました。');
      }
    } catch (err: any) {
      setError('ユーザー削除中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1>{activeTab === 'sns' ? 'アカウント連携管理' : 'ユーザー権限管理'}</h1>
        <p>
          {activeTab === 'sns' 
            ? 'Instagram、Facebook、Googleビジネスプロフィールと連携して、同時投稿を有効にします。' 
            : 'システムの投稿担当者や管理者のGoogleメールアドレスを登録して権限を管理します。'}
        </p>
      </div>

      {/* タブ選択 */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '2rem',
        paddingBottom: '0.25rem'
      }}>
        <button
          onClick={() => {
            setActiveTab('sns');
            setError(null);
            setSuccessMessage(null);
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'sns' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'sns' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: activeTab === 'sns' ? 600 : 500,
            fontSize: '0.95rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          SNS連携設定
        </button>
        <button
          onClick={() => {
            setActiveTab('users');
            setError(null);
            setSuccessMessage(null);
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'users' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'users' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: activeTab === 'users' ? 600 : 500,
            fontSize: '0.95rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          ユーザー権限管理
        </button>
      </div>

      {successMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '0.875rem',
          color: '#34d399',
          fontSize: '0.9rem',
          marginBottom: '1.5rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '0.875rem',
          color: '#f87171',
          fontSize: '0.9rem',
          marginBottom: '1.5rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {activeTab === 'sns' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Instagram 連携カード */}
          {(() => {
            const account = getAccountByPlatform('instagram');
            const isConnected = !!account;
            
            return (
              <div className="card" style={{
                borderLeft: '4px solid ' + (isConnected ? 'var(--color-instagram)' : 'var(--border-color)'),
                padding: '1.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{
                      background: isConnected ? 'var(--color-instagram-gradient)' : 'rgba(255,255,255,0.05)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isConnected ? '0 4px 15px rgba(225, 48, 108, 0.3)' : 'none'
                    }}>
                      <InstagramIcon size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>Instagram Business</span>
                        {isConnected && (
                          <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                            連携中
                          </span>
                        )}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Instagram Graph APIを使用して、画像の投稿とキャプション送信を行います。
                      </p>

                      {isConnected && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <UserCheck size={14} style={{ color: 'var(--color-instagram)' }} />
                            <span>連携アカウント: <strong>{account.account_name}</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <Calendar size={14} />
                            <span>トークン有効期限: {account.token_expires_at ? new Date(account.token_expires_at).toLocaleDateString() : '期限なし'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginLeft: 'auto' }}>
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect('instagram')}
                        disabled={isLoading !== null}
                        className="btn btn-secondary"
                        style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', gap: '0.35rem' }}
                      >
                        <Link2Off size={16} />
                        <span>連携を解除</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect('instagram')}
                        disabled={isLoading !== null}
                        className="btn btn-primary"
                        style={{ background: 'var(--color-instagram-gradient)', boxShadow: '0 4px 15px rgba(225, 48, 108, 0.2)', display: 'flex', gap: '0.35rem' }}
                      >
                        <Link2 size={16} />
                        <span>{isLoading === 'instagram' ? '連携処理中...' : 'Metaアカウントで連携'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Facebook 連携カード */}
          {(() => {
            const account = getAccountByPlatform('facebook');
            const isConnected = !!account;

            return (
              <div className="card" style={{
                borderLeft: '4px solid ' + (isConnected ? 'var(--color-facebook)' : 'var(--border-color)'),
                padding: '1.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{
                      background: isConnected ? 'var(--color-facebook)' : 'rgba(255,255,255,0.05)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isConnected ? '0 4px 15px rgba(24, 119, 242, 0.3)' : 'none'
                    }}>
                      <FacebookIcon size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>Facebookページ</span>
                        {isConnected && (
                          <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                            連携中
                          </span>
                        )}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Facebook Graph APIを使用して、Facebookページ（ビジネスアカウント）に投稿します。
                      </p>

                      {isConnected && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <UserCheck size={14} style={{ color: 'var(--color-facebook)' }} />
                            <span>連携ページ: <strong>{account.account_name}</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <Calendar size={14} />
                            <span>トークン有効期限: {account.token_expires_at ? new Date(account.token_expires_at).toLocaleDateString() : '期限なし'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginLeft: 'auto' }}>
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect('facebook')}
                        disabled={isLoading !== null}
                        className="btn btn-secondary"
                        style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', gap: '0.35rem' }}
                      >
                        <Link2Off size={16} />
                        <span>連携を解除</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect('facebook')}
                        disabled={isLoading !== null}
                        className="btn btn-primary"
                        style={{ backgroundColor: 'var(--color-facebook)', boxShadow: '0 4px 15px rgba(24, 119, 242, 0.2)', display: 'flex', gap: '0.35rem' }}
                      >
                        <Link2 size={16} />
                        <span>{isLoading === 'facebook' ? '連携処理中...' : 'Metaアカウントで連携'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Google Business Profile 連携カード */}
          {(() => {
            const account = getAccountByPlatform('google_business_profile');
            const isConnected = !!account;

            return (
              <div className="card" style={{
                borderLeft: '4px solid ' + (isConnected ? 'var(--color-google)' : 'var(--border-color)'),
                padding: '1.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{
                      background: isConnected ? 'var(--color-google)' : 'rgba(255,255,255,0.05)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isConnected ? '0 4px 15px rgba(66, 133, 244, 0.3)' : 'none'
                    }}>
                      <GoogleBusinessIcon size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>Googleビジネスプロフィール</span>
                        {isConnected && (
                          <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                            連携中
                          </span>
                        )}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Google Business Profile API（Local Posts）を使用して、Googleマップ上の店舗最新情報を投稿します。
                      </p>

                      {isConnected && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <UserCheck size={14} style={{ color: 'var(--color-google)' }} />
                            <span>連携店舗: <strong>{account.account_name}</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <Calendar size={14} />
                            <span>トークン有効期限: {account.token_expires_at ? new Date(account.token_expires_at).toLocaleDateString() : '期限なし'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginLeft: 'auto' }}>
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect('google_business_profile')}
                        disabled={isLoading !== null}
                        className="btn btn-secondary"
                        style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', gap: '0.35rem' }}
                      >
                        <Link2Off size={16} />
                        <span>連携を解除</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect('google_business_profile')}
                        disabled={isLoading !== null}
                        className="btn btn-primary"
                        style={{ backgroundColor: '#202124', border: '1px solid var(--border-color)', color: '#fff', display: 'flex', gap: '0.35rem' }}
                      >
                        <Link2 size={16} />
                        <span>{isLoading === 'google_business_profile' ? '連携処理中...' : 'Googleアカウントで連携'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">
          {/* 新規ユーザー追加フォーム */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <UserPlus size={20} style={{ color: 'var(--accent-primary)' }} />
              <span>ユーザー権限の新規登録</span>
            </h3>
            
            <form onSubmit={handleAddUser} style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'flex-end'
            }}>
              <div style={{ flex: '1 1 250px' }}>
                <label className="form-label">Google メールアドレス</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  disabled={isSubmitting}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
              
              <div style={{ width: '150px' }}>
                <label className="form-label">権限（ロール）</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  disabled={isSubmitting}
                  className="form-select"
                  style={{ width: '100%' }}
                >
                  <option value="editor">投稿担当者</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '0.35rem', height: '42px' }}
              >
                <span>ユーザーを追加</span>
              </button>
            </form>
          </div>

          {/* 登録済みユーザー一覧 */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Users size={20} style={{ color: 'var(--accent-primary)' }} />
              <span>登録済みユーザー一覧</span>
            </h3>

            {isListLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <span>読み込み中...</span>
              </div>
            ) : userList.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <span>登録されているユーザーがいません。</span>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>メールアドレス</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>権限</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.map((user) => {
                      const isOwner = user.email.toLowerCase() === 'hitosi.satou@gmail.com';
                      return (
                        <tr key={user.email} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                          <td style={{ padding: '1rem', fontSize: '0.95rem', fontWeight: 500 }}>{user.email}</td>
                          <td style={{ padding: '1rem' }}>
                            <span className={user.role === 'admin' ? 'badge badge-success' : 'badge badge-pending'} style={{
                              background: user.role === 'admin' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: user.role === 'admin' ? '#a5b4fc' : '#fcd34d',
                              border: user.role === 'admin' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)'
                            }}>
                              {user.role === 'admin' ? '管理者' : '投稿担当者'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            {isOwner ? (
                              <span style={{ 
                                fontSize: '0.8rem', 
                                color: 'var(--text-muted)',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border-color)',
                                padding: '0.25rem 0.5rem',
                                borderRadius: 'var(--radius-sm)'
                              }}>
                                オーナー (保護)
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(user.email)}
                                disabled={isSubmitting}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.8rem',
                                  color: '#f87171',
                                  borderColor: 'rgba(239, 68, 68, 0.2)'
                                }}
                              >
                                削除
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
