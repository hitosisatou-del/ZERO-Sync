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
  AlertTriangle,
  Trophy,
  Share2,
  Heart,
  MessageCircle,
  Bookmark,
  Award,
  Sparkles,
  Layers,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, GoogleBusinessIcon, TwitterIcon } from '@/components/Icons';
import AILoadingState from '@/components/AILoadingState';

type TabType = 'overall' | 'google' | 'instagram' | 'facebook' | 'twitter' | 'posts_ranking';

interface DailyTrendItem {
  date: string;
  googleViews: number;
  googleActions: number;
  instagramReach: number;
  instagramLikes: number;
  facebookReach: number;
  facebookReactions: number;
  twitterImpressions: number;
  twitterLikes: number;
  totalEngagements: number;
}

interface PostPerformance {
  id: string;
  title: string;
  base_text: string;
  image_url: string | null;
  created_at: string;
  scheduled_at?: string | null;
  platformResults: Array<{
    platform: string;
    status: string;
    error_message?: string | null;
  }>;
  platformStats: Record<string, any>;
  totalReach: number;
  totalEngagement: number;
  engagementRate: string;
}

// タブの説明文
const TAB_DESCRIPTIONS: Record<string, { title: string; desc: string }> = {
  overall:       { title: 'SNS全体のまとめ',           desc: 'Google・Instagram・Facebook・X(Twitter) 全チャネルの集客数・反応数を1画面でまとめて確認できます。' },
  posts_ranking: { title: '各投稿の効果ランキング',     desc: '過去に配信した投稿を「どれだけ多くの人に届いたか・反応されたか」の順に並べた一覧です。一番上が最も効果の高かった投稿です。' },
  google:        { title: 'Googleマップ（MEO）の成果', desc: 'Googleマップで「都城ドライビングスクール」を検索・閲覧した人数や、ルート案内・電話などのアクション数を確認できます。' },
  instagram:     { title: 'Instagramの成果',           desc: 'Instagramの投稿がどれだけの人に届いた（リーチ）か、いいね・コメント・保存などの反応をまとめています。' },
  facebook:      { title: 'Facebookの成果',            desc: 'Facebookページの投稿・情報がどれだけの人に届いたか、リアクション（いいね等）やシェアの集計です。' },
  twitter:       { title: 'X (Twitter) の成果',        desc: 'X(旧Twitter)の投稿インプレッション（表示回数）、いいね、リポスト（リツイート）の集計です。' },
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overall');
  const [showGuide, setShowGuide] = useState(true);

  // --- AI分析 ---
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  // APIデータ
  const [data, setData] = useState<{
    isConnectedMap: Record<string, boolean>;
    googleLocationName: string;
    keywords: Array<{ keyword: string; volume: number; clicks: number; ctr: number; trend: string }>;
    channelSummaries: any;
    dailyTrend: DailyTrendItem[];
    postPerformanceList: PostPerformance[];
  } | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics/all');
        if (!response.ok) {
          throw new Error('分析データの取得に失敗しました。');
        }
        const json = await response.json();
        if (json.success) {
          setData(json);
        } else {
          setError(json.error || 'データのロードに失敗しました。');
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
    return <AILoadingState />;
  }

  if (error || !data) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', border: '1px solid #ef4444' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderRadius: '50%', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={48} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ef4444' }}>集客分析データの取得エラー</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              {error || 'データの読み込みに失敗しました。'}
            </p>
          </div>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            画面を再読み込みする
          </button>
        </div>
      </div>
    );
  }

  const handleGenerateFeedback = async () => {
    setIsGeneratingFeedback(true);
    try {
      const res = await fetch('/api/analytics/ai-feedback');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiFeedback(data.feedback);
    } catch (e: any) {
      alert(e.message || 'AI分析に失敗しました');
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const { channelSummaries, dailyTrend, postPerformanceList, keywords, googleLocationName } = data;
  const overall = channelSummaries.overall;

  // SVGグラフ設定
  const width = 600;
  const height = 200;
  const paddingX = 40;
  const paddingY = 25;

  const getMaxChartValue = () => {
    if (activeTab === 'overall') {
      return Math.max(...dailyTrend.map(d => d.googleViews + d.instagramReach + d.twitterImpressions), 100);
    } else if (activeTab === 'google') {
      return Math.max(...dailyTrend.map(d => d.googleViews), 50);
    } else if (activeTab === 'instagram') {
      return Math.max(...dailyTrend.map(d => d.instagramReach), 50);
    } else if (activeTab === 'facebook') {
      return Math.max(...dailyTrend.map(d => d.facebookReach), 50);
    } else if (activeTab === 'twitter') {
      return Math.max(...dailyTrend.map(d => d.twitterImpressions), 50);
    }
    return 100;
  };

  const maxValue = getMaxChartValue();

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

  // トップパフォーマンス投稿（第1位）
  const topPost = postPerformanceList.length > 0 ? postPerformanceList[0] : null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* 使い方ガイドバナー */}
      {showGuide && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.06) 100%)',
          border: '1px solid rgba(79, 70, 229, 0.25)',
          borderRadius: '14px',
          padding: '1.1rem 1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
        }}>
          <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>📖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem', color: 'var(--accent-primary)' }}>このレポートの見方</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7 }}>
              <strong>①タブを切り替える</strong>と、チャネルごとの詳細データを確認できます。<br />
              <strong>②「SNS全体のまとめ」</strong>では全チャネルの総合成果、<strong>「各投稿の効果ランキング」</strong>では個別投稿の反響を比較できます。<br />
              <strong>③各数値は過去30日間の自動集計データ</strong>です。
            </p>
          </div>
          <button
            onClick={() => setShowGuide(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '1.2rem', padding: '0 0.25rem',
              flexShrink: 0, lineHeight: 1
            }}
            title="閉じる"
          >✕</button>
        </div>
      )}

      {/* 1. ヘッダータイトル & 期間表示 */}
      <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.65rem', margin: 0, letterSpacing: '-0.02em' }}>
            <div style={{ background: 'var(--accent-gradient)', padding: '0.4rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 color="#fff" size={22} />
            </div>
            <span>集客・投稿成果分析レポート</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            Googleマップ・SNS全チャネルの集客インサイト ＆ <strong style={{ color: 'var(--accent-primary)' }}>「みんなの投稿成果」可視化ダッシュボード</strong>
          </p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <Calendar size={14} />
          <span>直近30日間の自動解析データ</span>
        </div>
      </div>

      {/* AI改善アドバイスセクション */}
      <div style={{ marginTop: '1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-focus)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiFeedback ? '1.5rem' : '0' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--text-primary)' }}>
              <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
              AIによる集客レポート分析＆改善提案
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
              現在のデータをもとに、AIマーケティングコンサルタントが具体的なアドバイスを作成します。
            </p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleGenerateFeedback} 
            disabled={isGeneratingFeedback}
            style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}
          >
            {isGeneratingFeedback ? (
              <><Loader2 size={16} className="spinner" /> 分析中...</>
            ) : (
              <><Sparkles size={16} /> AIに分析させる</>
            )}
          </button>
        </div>
        
        {aiFeedback && (
          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-md)', 
            padding: '1.5rem',
            lineHeight: 1.7,
            color: 'var(--text-secondary)'
          }}>
            {/* Markdown形式のテキストを簡易的に表示（要件に応じてreact-markdown等を利用してもOK） */}
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }} dangerouslySetInnerHTML={{ __html: aiFeedback.replace(/\\n/g, '<br/>').replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>') }} />
          </div>
        )}
      </div>

      {/* 2. メインナビゲーションタブ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="analytics-tab-bar">
          {[
            { id: 'overall',       label: '📊 SNS全体のまとめ',         badge: '全チャネル' },
            { id: 'posts_ranking', label: '🏆 各投稿の効果ランキング',   badge: '効果順' },
            { id: 'google',        label: '📍 Googleマップ',             icon: GoogleBusinessIcon },
            { id: 'instagram',     label: '📸 Instagram',               icon: InstagramIcon },
            { id: 'facebook',      label: '📘 Facebook',                icon: FacebookIcon },
            { id: 'twitter',       label: '🐦 Twitter (X)',             icon: TwitterIcon },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.15rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: isActive ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span style={{
                    fontSize: '0.7rem',
                    background: isActive ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    padding: '0.15rem 0.45rem',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 600
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* タブの説明文 */}
        <div style={{
          background: 'rgba(79, 70, 229, 0.05)',
          border: '1px solid rgba(79, 70, 229, 0.15)',
          borderRadius: '10px',
          padding: '0.75rem 1.1rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.6rem',
        }}>
          <HelpCircle size={15} style={{ color: 'var(--accent-primary)', marginTop: '1px', flexShrink: 0 }} />
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
              {TAB_DESCRIPTIONS[activeTab]?.title}
            </span>
            <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginLeft: '0.6rem' }}>
              {TAB_DESCRIPTIONS[activeTab]?.desc}
            </span>
          </div>
        </div>
      </div>

      {/* 3. タブコンテンツ判定 */}

      {/* TAB 1: 全体統合サマリー */}
      {activeTab === 'overall' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* KPI 4列カード */}
          <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-primary)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>全チャネル総インプレッション・PV</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.3rem 0' }}>
                {overall.grandTotalReach.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>回</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                <TrendingUp size={14} /> <span>前月比 +18.4%</span>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>全チャネル総アクション・反応数</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.3rem 0' }}>
                {overall.grandTotalEngagements.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>件</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                <TrendingUp size={14} /> <span>前月比 +14.2%</span>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>平均エンゲージメント率</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.3rem 0' }}>
                {overall.avgEngagementRate} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>%</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                <TrendingUp size={14} /> <span>高パフォーマンス達成中</span>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ec4899' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>最優秀集客貢献チャネル</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--accent-primary)' }}>
                {overall.topChannelName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                マップ検索 ＆ IG写真投稿が好調
              </div>
            </div>
          </div>

          {/* 全体推移チャート ＆ チャネル内訳 */}
          <div className="responsive-form-grid analytics-chart-grid">
            {/* チャート */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>過去30日間の全社集客・インプレッション推移</h3>
              <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)', padding: '1rem 0.5rem' }}>
                <svg viewBox={`0 0 ${width} ${height}`} className="analytics-svg-chart" style={{ width: '100%', minWidth: '300px', height: 'auto', display: 'block' }}>
                  <defs>
                    <linearGradient id="gradOverall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* 横罫線 */}
                  {[0, 0.33, 0.66, 1].map((ratio) => {
                    const y = height - paddingY - (ratio * (height - paddingY * 2));
                    return (
                      <line key={ratio} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
                    );
                  })}
                  {/* 面グラフ */}
                  <path d={getSvgPath(dailyTrend.map(d => d.googleViews + d.instagramReach + d.twitterImpressions), true)} fill="url(#gradOverall)" />
                  {/* 折れ線 */}
                  <path d={getSvgPath(dailyTrend.map(d => d.googleViews + d.instagramReach + d.twitterImpressions))} fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" />
                </svg>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                ※ Googleマップ閲覧・Instagramリーチ・Twitterインプレッションの合計推移
              </div>
            </div>

            {/* チャネル別貢献度比率 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>チャネル別 集客インプレッション貢献度</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
                {/* Google */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <GoogleBusinessIcon size={16} /> Googleマップ (MEO)
                    </span>
                    <span style={{ fontWeight: 700 }}>{channelSummaries.google.totalViews.toLocaleString()} PV ({((channelSummaries.google.totalViews / overall.grandTotalReach) * 100).toFixed(1)}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)' }}>
                    <div style={{ width: `${(channelSummaries.google.totalViews / overall.grandTotalReach) * 100}%`, height: '100%', background: '#3b82f6', borderRadius: 'var(--radius-full)' }} />
                  </div>
                </div>

                {/* Instagram */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <InstagramIcon size={16} /> Instagram
                    </span>
                    <span style={{ fontWeight: 700 }}>{channelSummaries.instagram.totalReach.toLocaleString()} リーチ ({((channelSummaries.instagram.totalReach / overall.grandTotalReach) * 100).toFixed(1)}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)' }}>
                    <div style={{ width: `${(channelSummaries.instagram.totalReach / overall.grandTotalReach) * 100}%`, height: '100%', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', borderRadius: 'var(--radius-full)' }} />
                  </div>
                </div>

                {/* Twitter */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <TwitterIcon size={16} /> Twitter (X)
                    </span>
                    <span style={{ fontWeight: 700 }}>{channelSummaries.twitter.totalImpressions.toLocaleString()} IMP ({((channelSummaries.twitter.totalImpressions / overall.grandTotalReach) * 100).toFixed(1)}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)' }}>
                    <div style={{ width: `${(channelSummaries.twitter.totalImpressions / overall.grandTotalReach) * 100}%`, height: '100%', background: '#1da1f2', borderRadius: 'var(--radius-full)' }} />
                  </div>
                </div>

                {/* Facebook */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <FacebookIcon size={16} /> Facebook
                    </span>
                    <span style={{ fontWeight: 700 }}>{channelSummaries.facebook.totalReach.toLocaleString()} リーチ ({((channelSummaries.facebook.totalReach / overall.grandTotalReach) * 100).toFixed(1)}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)' }}>
                    <div style={{ width: `${(channelSummaries.facebook.totalReach / overall.grandTotalReach) * 100}%`, height: '100%', background: '#1877f2', borderRadius: 'var(--radius-full)' }} />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 🏆 みんなの投稿成果 (投稿効果・ランキング) */}
      {activeTab === 'posts_ranking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* Top 1 位の特別ハイライトカード */}
          {topPost && (
            <div className="card" style={{
              padding: '1.75rem',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.08) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-15px',
                right: '-15px',
                background: 'var(--accent-gradient)',
                padding: '1.5rem',
                borderRadius: '50%',
                opacity: 0.15
              }}>
                <Trophy size={100} color="#fff" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                <Award size={20} />
                <span>👑 直近で最も集客・反響を生んだ「No.1 ベストパフォーマンス投稿」</span>
              </div>

              <div className="top-post-flex" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {topPost.image_url && (
                  <img
                    src={topPost.image_url}
                    alt={topPost.title}
                    style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                  />
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                    {topPost.title}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {topPost.base_text}
                  </p>
                  <div className="top-post-stats" style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>合計リーチ / 閲覧数:</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{topPost.totalReach.toLocaleString()} 回</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>合計エンゲージメント:</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>{topPost.totalEngagement.toLocaleString()} 反応</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>反響率 (エンゲージメント率):</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>{topPost.engagementRate}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 全投稿の効果一覧テーブル */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
                <span>全投稿の個別効果・プラットフォーム別反響内訳一覧</span>
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>全 {postPerformanceList.length} 件の投稿</span>
            </div>

            <div className="report-table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>順位 / 投稿内容</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>投稿日時</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>配信先</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>総リーチ数</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>総反応数</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>主要反響の内訳</th>
                  </tr>
                </thead>
                <tbody>
                  {postPerformanceList.map((post, idx) => (
                    <tr key={post.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'var(--bg-tertiary)',
                            color: idx < 3 ? '#000' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            flexShrink: 0
                          }}>
                            {idx + 1}
                          </div>
                          {post.image_url && (
                            <img src={post.image_url} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{post.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {post.base_text}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td data-label="投稿日時" style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(post.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td data-label="配信先" style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {post.platformResults.map(r => (
                            <span key={r.platform} title={`${r.platform}: ${r.status}`}>
                              {r.platform === 'google_business_profile' && <GoogleBusinessIcon size={16} />}
                              {r.platform === 'instagram' && <InstagramIcon size={16} />}
                              {r.platform === 'facebook' && <FacebookIcon size={16} />}
                              {r.platform === 'twitter' && <TwitterIcon size={16} />}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td data-label="総リーチ数" style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>
                        {post.totalReach.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>PV/Reach</span>
                      </td>
                      <td data-label="総反応数" style={{ padding: '1rem 0.5rem', fontWeight: 700, color: '#10b981' }}>
                        {post.totalEngagement.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>反響</span>
                      </td>
                      <td data-label="主要反響" style={{ padding: '1rem 0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {post.platformStats.instagram && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <InstagramIcon size={12} /> いいね {post.platformStats.instagram.likes}件 / コメント {post.platformStats.instagram.comments}件
                            </span>
                          )}
                          {post.platformStats.twitter && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <TwitterIcon size={12} /> いいね {post.platformStats.twitter.likes} / RT {post.platformStats.twitter.retweets}
                            </span>
                          )}
                          {post.platformStats.google_business_profile && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <GoogleBusinessIcon size={12} /> 店舗アクション {post.platformStats.google_business_profile.actions}回
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 📍 Googleマップ */}
      {activeTab === 'google' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Googleマップ閲覧数 (PV)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{channelSummaries.google.mapViews.toLocaleString()} 回</div>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Google検索表示数 (PV)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{channelSummaries.google.searchViews.toLocaleString()} 回</div>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ルート案内・電話等アクション数</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{channelSummaries.google.totalActions.toLocaleString()} 回</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Googleマップ流入キーワードランキング</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {keywords.map((kw, idx) => (
                <div key={kw.keyword} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                    <span>{idx + 1}. {kw.keyword}</span>
                    <span>{kw.volume.toLocaleString()} 回表示 ({kw.trend})</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)' }}>
                    <div style={{ width: `${(kw.volume / (keywords[0]?.volume || 100)) * 100}%`, height: '100%', background: '#3b82f6', borderRadius: 'var(--radius-full)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 📸 Instagram */}
      {activeTab === 'instagram' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #cc2366' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>総リーチ数</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{channelSummaries.instagram.totalReach.toLocaleString()} 人</div>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #e6683c' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>獲得「いいね」総数</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{channelSummaries.instagram.totalLikes.toLocaleString()} 件</div>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #bc1888' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>保存数（関心度高）</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{channelSummaries.instagram.totalSaves.toLocaleString()} 件</div>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>エンゲージメント率</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{channelSummaries.instagram.engagementRate} %</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: 📘 Facebook */}
      {activeTab === 'facebook' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #1877f2' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Facebookページリーチ数</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{channelSummaries.facebook.totalReach.toLocaleString()} 人</div>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>総リアクション数</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{channelSummaries.facebook.totalReactions.toLocaleString()} 件</div>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>投稿シェア数</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{channelSummaries.facebook.totalShares.toLocaleString()} 回</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: 🐦 Twitter (X) */}
      {activeTab === 'twitter' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #1da1f2' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ツイート総インプレッション</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{channelSummaries.twitter.totalImpressions.toLocaleString()} IMP</div>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #0055ff' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>リツイート・リポスト数</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{channelSummaries.twitter.totalRetweets.toLocaleString()} 件</div>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ec4899' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>獲得「いいね」数</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{channelSummaries.twitter.totalLikes.toLocaleString()} 件</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
