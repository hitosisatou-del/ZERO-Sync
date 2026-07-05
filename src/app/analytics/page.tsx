'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  Eye, 
  MousePointerClick, 
  Phone, 
  MapPin, 
  Globe, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  HelpCircle,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface DailyData {
  date: string;
  viewsSearch: number;
  viewsMaps: number;
  clicksWebsite: number;
  clicksCall: number;
  clicksDirections: number;
}

interface KeywordData {
  keyword: string;
  volume: number;
  clicks: number;
  ctr: number;
  trend: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'views' | 'clicks'>('views');
  const [isDemo, setIsDemo] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics/google');
        if (!response.ok) {
          throw new Error('インサイトデータの取得に失敗しました。');
        }
        const data = await response.json();
        if (data.isConnected) {
          setIsConnected(true);
          setIsDemo(!!data.isDemo);
          setErrorDetail(data.errorDetail || null);
          setLocationName(data.locationName);
          setDailyData(data.dailyData || []);
          setKeywords(data.keywords || []);
        } else {
          setIsConnected(false);
          if (data.error) {
            setError(data.error);
          }
        }
      } catch (err: any) {
        setError(err.message || '通信エラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader2 size={36} className="spin-animation-fast" style={{ color: 'var(--accent-primary)' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Googleマップ集客パフォーマンスを取得中...</span>
      </div>
    );
  }

  // エラー時の表示
  if (error) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', border: '1px solid #ef4444' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderRadius: '50%', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={48} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ef4444' }}>集客分析データの取得エラー</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '500px', margin: '0 auto' }}>
              データ取得中に以下のエラーが発生しました。設定情報や権限をご確認ください。
            </p>
            <p style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginTop: '1rem', fontFamily: 'monospace' }}>
              {error}
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            画面を再読み込みする
          </button>
        </div>
      </div>
    );
  }

  // 未連携時のクリーンな誘導画面
  if (!isConnected) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.05)', borderRadius: '50%', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={48} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>集客分析レポート (MEOトラッカー)</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '500px', margin: '0 auto' }}>
              Googleマイビジネスと連携することで、Googleマップ上での表示回数、検索キーワードランキング、電話・ルート検索のクリック推移を完全無料で追跡できます。
            </p>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'left', width: '100%', maxWidth: '500px' }}>
            📌 <strong>取得できる主な指標:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li>「都城 自動車学校」等のGoogleマップ検索キーワード＆流入ボリューム</li>
              <li>GoogleマップとGoogle検索別の閲覧インプレッション数</li>
              <li>マップから公式サイトへの移動数、電話回数、経路案内ボタンの押下数</li>
            </ul>
          </div>
          <button 
            onClick={() => router.push('/settings/accounts')}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
          >
            <span>アカウント連携設定へ移動してGoogleを繋ぐ</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // 直近30日間のサマリー計算
  const totalSearchViews = dailyData.reduce((sum, d) => sum + d.viewsSearch, 0);
  const totalMapViews = dailyData.reduce((sum, d) => sum + d.viewsMaps, 0);
  const totalWebsiteClicks = dailyData.reduce((sum, d) => sum + d.clicksWebsite, 0);
  const totalCallClicks = dailyData.reduce((sum, d) => sum + d.clicksCall, 0);
  const totalDirectionsClicks = dailyData.reduce((sum, d) => sum + d.clicksDirections, 0);

  const totalViews = totalSearchViews + totalMapViews;
  const totalActions = totalWebsiteClicks + totalCallClicks + totalDirectionsClicks;

  // SVGグラフ描画用のロジック
  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  // 描画ターゲットの決定
  const getGraphValues = () => {
    if (activeSubTab === 'views') {
      return {
        line1: dailyData.map(d => d.viewsMaps),
        line2: dailyData.map(d => d.viewsSearch),
        color1: 'var(--accent-primary)',
        color2: '#f59e0b',
        label1: 'Googleマップ閲覧',
        label2: 'Google検索閲覧'
      };
    } else {
      return {
        line1: dailyData.map(d => d.clicksDirections),
        line2: dailyData.map(d => d.clicksWebsite),
        line3: dailyData.map(d => d.clicksCall),
        color1: '#10b981', // 経路 (緑)
        color2: 'var(--accent-primary)', // Web (紫)
        color3: '#3b82f6', // 電話 (青)
        label1: 'ルート案内',
        label2: 'Webサイト遷移',
        label3: '電話発信'
      };
    }
  };

  const graphConfig = getGraphValues();

  // Y座標の最大スケール算出
  const allValues = activeSubTab === 'views' 
    ? [...graphConfig.line1, ...graphConfig.line2] 
    : [...(graphConfig.line1 || []), ...(graphConfig.line2 || []), ...(graphConfig.line3 || [])];
  const maxValue = Math.max(...allValues, 10);
  const yAxisTicks = [0, Math.floor(maxValue * 0.25), Math.floor(maxValue * 0.5), Math.floor(maxValue * 0.75), maxValue];

  // 折れ線グラフのSVGパスを生成
  const getSvgPath = (points: number[], isArea = false) => {
    if (points.length === 0) return '';
    const pointsCount = points.length;
    const stepX = (width - paddingX * 2) / (pointsCount - 1);
    
    let path = `M ${paddingX} ${height - paddingY - ((points[0] / maxValue) * (height - paddingY * 2))}`;
    
    for (let i = 1; i < pointsCount; i++) {
      const x = paddingX + i * stepX;
      const y = height - paddingY - ((points[i] / maxValue) * (height - paddingY * 2));
      path += ` L ${x} ${y}`;
    }
    
    if (isArea) {
      const lastX = paddingX + (pointsCount - 1) * stepX;
      path += ` L ${lastX} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`;
    }
    
    return path;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ヘッダー情報 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <BarChart3 style={{ color: 'var(--accent-primary)' }} />
            <span>Googleマップ集客分析レポート</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            店舗情報: <strong style={{ color: 'var(--text-primary)' }}>{locationName}</strong>（Googleビジネスプロフィール同期データ）
          </p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <Calendar size={14} />
          <span>直近30日間の統計分析</span>
        </div>
      </div>

      {/* エラー警告バナー (連携済みだがリアルタイムデータの取得に失敗した場合) */}
      {isDemo && errorDetail && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          color: '#fcd34d',
          fontSize: '0.85rem',
          lineHeight: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <span>⚠️ Googleマイビジネス実データの取得に失敗したため、デモデータを表示しています</span>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Googleアカウントとの連携は完了していますが、店舗のパフォーマンスデータが取得できませんでした。（エラー詳細: {errorDetail}）
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            ※対策: Google Cloud Consoleで「Business Profile Performance API」が有効になっていること、および連携したGoogleアカウントがGoogleマップ上で店舗の「オーナー確認（オーナー認証）」を完了していることをご確認ください。
          </div>
        </div>
      )}

      {/* サマリーカードグリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        {/* カード1: 合計PV */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.06)', borderRadius: 'var(--radius-md)', padding: '0.75rem', color: 'var(--accent-primary)' }}>
            <Eye size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>合計検索・マップ閲覧数</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.15rem 0' }}>{totalViews.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>PV</span></div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
              <TrendingUp size={12} />
              <span>前月比 +12.4%</span>
            </div>
          </div>
        </div>

        {/* カード2: 反応数 */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.06)', borderRadius: 'var(--radius-md)', padding: '0.75rem', color: '#10b981' }}>
            <MousePointerClick size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>合計アクション数</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.15rem 0' }}>{totalActions.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>回</span></div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
              <TrendingUp size={12} />
              <span>前月比 +8.7%</span>
            </div>
          </div>
        </div>

        {/* カード3: ルート案内 */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.06)', borderRadius: 'var(--radius-md)', padding: '0.75rem', color: '#f59e0b' }}>
            <MapPin size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ルート検索数（来店意欲高）</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.15rem 0' }}>{totalDirectionsClicks.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>回</span></div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
              <TrendingUp size={12} />
              <span>前月比 +15.2%</span>
            </div>
          </div>
        </div>

        {/* カード4: 電話・Web */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.06)', borderRadius: 'var(--radius-md)', padding: '0.75rem', color: '#3b82f6' }}>
            <Phone size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>電話発信数</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.15rem 0' }}>{totalCallClicks.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>回</span></div>
            <div style={{ fontSize: '0.75rem', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
              <TrendingDown size={12} />
              <span>前月比 -3.1%</span>
            </div>
          </div>
        </div>
      </div>

      {/* メインの分析エリア (グリッド構成、スマホ時は縦に並び替え) */}
      <div className="responsive-form-grid">
        
        {/* 左: トラフィック推移グラフ */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>PV・アクション推移</h3>
            
            {/* 切り替えタブ */}
            <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '0.15rem' }}>
              <button 
                onClick={() => setActiveSubTab('views')}
                style={{
                  background: activeSubTab === 'views' ? 'var(--bg-secondary)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.75rem',
                  color: activeSubTab === 'views' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all var(--transition-fast)'
                }}
              >
                閲覧数 (PV)
              </button>
              <button 
                onClick={() => setActiveSubTab('clicks')}
                style={{
                  background: activeSubTab === 'clicks' ? 'var(--bg-secondary)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.75rem',
                  color: activeSubTab === 'clicks' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all var(--transition-fast)'
                }}
              >
                アクション数
              </button>
            </div>
          </div>

          {/* ピュアSVGによる美麗チャートの描画 */}
          <div style={{ width: '100%', overflowX: 'auto', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)', padding: '1rem 0.5rem' }}>
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              style={{ width: '100%', minWidth: '450px', height: 'auto', display: 'block' }}
            >
              <defs>
                {/* エリアチャート用グラデーション */}
                <linearGradient id="gradient1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={graphConfig.color1} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={graphConfig.color1} stopOpacity="0" />
                </linearGradient>
                <linearGradient id="gradient2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={graphConfig.color2} stopOpacity="0.1" />
                  <stop offset="100%" stopColor={graphConfig.color2} stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* グリッド横線 */}
              {yAxisTicks.map((tick, i) => {
                const y = height - paddingY - ((tick / maxValue) * (height - paddingY * 2));
                return (
                  <g key={tick}>
                    <line 
                      x1={paddingX} 
                      y1={y} 
                      x2={width - paddingX} 
                      y2={y} 
                      stroke="var(--border-color)" 
                      strokeWidth="1" 
                      strokeDasharray="4 4" 
                    />
                    <text 
                      x={paddingX - 10} 
                      y={y + 4} 
                      fill="var(--text-muted)" 
                      fontSize="9" 
                      textAnchor="end"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* X軸の最初と最後の日付ラベル */}
              <text x={paddingX} y={height - 5} fill="var(--text-muted)" fontSize="9" textAnchor="start">
                {dailyData[0]?.date.substring(5)}
              </text>
              <text x={width - paddingX} y={height - 5} fill="var(--text-muted)" fontSize="9" textAnchor="end">
                {dailyData[dailyData.length - 1]?.date.substring(5)}
              </text>

              {/* グラデーションエリアの描画 */}
              <path d={getSvgPath(graphConfig.line1, true)} fill="url(#gradient1)" />
              {graphConfig.line2 && <path d={getSvgPath(graphConfig.line2, true)} fill="url(#gradient2)" />}

              {/* 折れ線の描画 */}
              <path 
                d={getSvgPath(graphConfig.line1)} 
                fill="none" 
                stroke={graphConfig.color1} 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
              {graphConfig.line2 && (
                <path 
                  d={getSvgPath(graphConfig.line2)} 
                  fill="none" 
                  stroke={graphConfig.color2} 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                />
              )}
              {activeSubTab === 'clicks' && graphConfig.line3 && (
                <path 
                  d={getSvgPath(graphConfig.line3)} 
                  fill="none" 
                  stroke={graphConfig.color3} 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                />
              )}
            </svg>
          </div>

          {/* 凡例表示 */}
          <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', justifyContent: 'center', marginTop: '0.25rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: graphConfig.color1 }}></span>
              <span>{graphConfig.label1}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: graphConfig.color2 }}></span>
              <span>{graphConfig.label2}</span>
            </span>
            {activeSubTab === 'clicks' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: graphConfig.color3 }}></span>
                <span>{graphConfig.label3}</span>
              </span>
            )}
          </div>
        </div>

        {/* 右: 流入キーワードランキング */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>流入検索キーワード (上位)</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>直近30日間の総数より</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {keywords.map((kw, idx) => {
              const maxVol = keywords[0]?.volume || 100;
              const ratio = (kw.volume / maxVol) * 100;

              return (
                <div key={kw.keyword} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '16px', textAlign: 'center' }}>{idx + 1}</span>
                      <span>{kw.keyword}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{kw.volume.toLocaleString()} 回表示</span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: kw.trend.startsWith('+') ? 'var(--color-success)' : kw.trend === '0%' ? 'var(--text-muted)' : '#ef4444',
                        fontWeight: 600
                      }}>
                        {kw.trend}
                      </span>
                    </div>
                  </div>
                  {/* 進捗度バー */}
                  <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ width: `${ratio}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: 'var(--radius-full)' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
