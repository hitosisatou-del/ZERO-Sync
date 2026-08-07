import { NextResponse } from 'next/server';
import { SchoolContentService } from '@/lib/services/school-content';
import { DBService } from '@/lib/services/db';

export const revalidate = 0;

// スクレイプ対象の公式URL
const OFFICIAL_URLS = [
  'https://goodmenkyo.com/campaign/miyako/lp4/',
  'https://miyakonojyo-ds.jp',
];

/**
 * サーバーサイドで公式ページを取得し、構造化テキストを返す
 */
async function scrapeOfficialPages(): Promise<{ content: string; fetchedUrls: string[]; errors: string[] }> {
  const fetchedUrls: string[] = [];
  const errors: string[] = [];
  const sections: string[] = [];

  await Promise.allSettled(
    OFFICIAL_URLS.map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ZeroSyncBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ja,en;q=0.5',
          },
          signal: AbortSignal.timeout(12000),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const html = await res.text();
        const structured = buildStructuredContent(html, url);
        sections.push(`\n━━━━ ${url} ━━━━\n${structured}`);
        fetchedUrls.push(url);
      } catch (e: any) {
        errors.push(`${url}: ${e.message}`);
      }
    })
  );

  return {
    content: sections.join('\n'),
    fetchedUrls,
    errors,
  };
}

// ── HTML解析ユーティリティ ──────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6]|li|tr|th|td|section|article|header|footer|main|nav|aside|blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&yen;/g, '¥')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripHtml(m[1]).trim() : '';
}

function extractMetaDescription(html: string): string {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  return m ? m[1].trim() : '';
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const pattern = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let m;
  while ((m = pattern.exec(html)) !== null) {
    const t = stripHtml(m[1]).trim();
    if (t && t.length > 1 && t.length < 200) headings.push(t);
  }
  return [...new Set(headings)];
}

function extractMainText(html: string): string {
  const mainPatterns = [
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]+(?:id|class)=["'][^"']*(?:content|main|body|wrapper)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pat of mainPatterns) {
    const m = html.match(pat);
    if (m) {
      const t = stripHtml(m[1]);
      if (t.length > 200) return t.slice(0, 3000);
    }
  }
  const bodyM = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyM) return stripHtml(bodyM[1]).slice(0, 3000);
  return stripHtml(html).slice(0, 3000);
}

function extractPriceLines(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l =>
      l.length > 3 && l.length < 200 &&
      (l.match(/[¥￥]\s*[\d,]+/) ||
        l.match(/[\d,]+\s*円/) ||
        l.match(/最短\s*\d+日/) ||
        l.match(/\d+\s*%\s*(OFF|割引|引き)/) ||
        l.match(/No\.?1|No\s*1/) ||
        l.match(/\d+年連続/) ||
        l.match(/評価\s*[\d.]+/))
    );
}

function extractCtaLines(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l =>
      l.length > 3 && l.length < 150 &&
      (l.match(/申込|申し込み|仮申込|お問い合わせ|LINE|電話|無料相談|資料請求/) ||
        l.match(/今すぐ|こちら|クリック|タップ|詳細/))
    );
}

function buildStructuredContent(html: string, url: string): string {
  const title = extractTitle(html);
  const metaDesc = extractMetaDescription(html);
  const headings = extractHeadings(html);
  const mainText = extractMainText(html);
  const priceLines = extractPriceLines(mainText);
  const ctaLines = extractCtaLines(mainText);

  const lines: string[] = [];
  lines.push(`参照URL: ${url}`);
  if (title) lines.push(`ページタイトル: ${title}`);
  if (metaDesc) lines.push(`概要: ${metaDesc}`);

  if (headings.length > 0) {
    lines.push('\n【主な見出し】');
    headings.slice(0, 12).forEach(h => lines.push(`・${h}`));
  }

  if (priceLines.length > 0) {
    lines.push('\n【料金・特徴情報】');
    priceLines.slice(0, 10).forEach(l => lines.push(`・${l}`));
  }

  if (ctaLines.length > 0) {
    lines.push('\n【申込・問い合わせ情報】');
    ctaLines.slice(0, 5).forEach(l => lines.push(`・${l}`));
  }

  const cleanMain = mainText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 5 && l.length < 200)
    .slice(0, 30)
    .join('\n');

  if (cleanMain) {
    lines.push('\n【ページ本文（抜粋）】');
    lines.push(cleanMain);
  }

  return lines.join('\n');
}

// ── メインハンドラー ──────────────────────────────

export async function POST(request: Request) {
  try {
    const {
      theme,
      keywords,
      tone,
      cta,
      // 公式情報参照モード（DB登録コンテンツ）
      useSchoolContent = true,
      contentCategories,
      // SNSバリアント一括生成
      generateVariants = false,
      // 公式サイト・LPのリアルタイムスクレイプ
      useLiveWebContent = false,
      // クライアントから事前スクレイプ済みコンテンツを渡す場合
      liveWebContent,
      // AIの創造性調整
      temperature = 0.7,
    } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI APIキーが設定されていません。環境変数をご確認ください。' },
        { status: 500 }
      );
    }

    // ========================================================
    // 1. DBに登録された公式情報コンテキストの構築
    // ========================================================
    let schoolContext = '';
    if (useSchoolContent) {
      schoolContext = await SchoolContentService.buildAIContext(contentCategories);
    }

    // ========================================================
    // 2. 公式ページ・LPのリアルタイムスクレイプ
    // ========================================================
    let liveContent = '';
    let fetchedUrls: string[] = [];
    let scrapeErrors: string[] = [];

    if (liveWebContent) {
      // クライアントから渡された事前スクレイプ済みコンテンツを使用
      liveContent = liveWebContent;
      fetchedUrls = OFFICIAL_URLS;
    } else if (useLiveWebContent) {
      // サーバーサイドでリアルタイムスクレイプ
      const scrapeResult = await scrapeOfficialPages();
      liveContent = scrapeResult.content;
      fetchedUrls = scrapeResult.fetchedUrls;
      scrapeErrors = scrapeResult.errors;
    }

    // ========================================================
    // 3. 直近の投稿履歴の取得 (重複回避用)
    // ========================================================
    let recentHistoryContext = '';
    try {
      const { posts } = await DBService.getPosts();
      // 直近3件のベーステキストを取得
      const recentPosts = posts.slice(0, 3).map(p => p.base_text).filter(Boolean);
      if (recentPosts.length > 0) {
        recentHistoryContext = recentPosts.map((text, i) => `【直近の投稿 ${i + 1}】\n${text}`).join('\n\n');
      }
    } catch (e) {
      console.warn('Failed to fetch recent history for AI context:', e);
    }

    // ========================================================
    // 4. システムプロンプトの構築
    // ========================================================
    const hasAnyContent = schoolContext || liveContent;

    const contentRulesSection = hasAnyContent
      ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【⚠️ 絶対遵守ルール】
以下の「公式情報」に記載された内容のみを使って投稿文を生成してください。
公式情報に記載されていない料金・日程・キャンペーン・特典・数値・サービス名は
一切作成・推測・補完しないでください。不明な場合は「公式サイトをご確認ください」と記述してください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【公式情報（この内容のみ参照すること）】
${schoolContext ? `\n## 登録済み公式情報\n${schoolContext}` : ''}
${liveContent ? `\n## 公式Webサイト・LP（リアルタイム取得）\n${liveContent}` : ''}`
      : '';

    const historyRulesSection = recentHistoryContext
      ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【⚠️ 重複回避ルール】
以下のテキストは、直近で私たちがSNSに投稿した内容です。
新しく生成するテキストは、これらの「直近の投稿」とテーマや話題、構成が完全に被らないように、新しい視点や切り口で作成してください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${recentHistoryContext}
` : '';

    const today = new Date();
    const dateContext = `本日は ${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 です。この時期・季節感に合った自然な表現を取り入れてください。`;

    const systemPrompt = `あなたは宮崎県都城市にある「都城ドライビングスクール」のプロモーション担当者であり、Googleマップ検索（MEO）およびSNSマーケティングの専門家です。
指示された「テーマ」「キーワード」「文章のトーン」「誘導先（CTA）」に基づいて、Googleビジネスプロフィールや各種SNS（Instagram, Facebook等）への投稿に最適な効果的な告知文を生成してください。

【季節・時間コンテキスト】
${dateContext}
${contentRulesSection}
${historyRulesSection}

以下の【構成ガイドライン】を厳守すること：
1. 【タイトル・見出し】: 冒頭にテーマに合わせた魅力的な見出し（絵文字付き）を1行で記述する。
2. 【リード文】: 地名（都城、都城市）と指定された教習サービス名やイベント名を自然に織り交ぜたリード文を作成する。不自然なキーワードの詰め込みは避け、読みやすい日本語にすること。
3. 【詳細情報（箇条書き）】: キャンペーンのポイントや教習のメリット、卒業式の温かいメッセージ等を3つ程度の箇条書きで整理し、スマホ画面でも一目で内容が伝わるようにする。
4. 【行動への誘導（CTA）】: 指定された「誘導先」に応じて、最後に行動を促す文言（例:「Web仮申し込みはこちらから！」「詳細ボタンをタップしてお問い合わせください」）を入れる。
5. 【ハッシュタグ】: 投稿に関連するハッシュタグ（地名、サービス名、スクール名など）を5〜7個、文末に付与する（例：#都城 #都城市 #自動車学校 #バイク免許 #都城ドライビングスクール）。

教習タイプ別のトーン指示：
- 卒業式（卒業生の声・祝辞）: 卒業を祝福し、これからの生涯無事故運転への誓いと温かい教習所の雰囲気をエモーショナルに記述。
- 合宿免許: 旅行気分や短期集中での最短卒業、宿泊施設（快適さ・食事）の魅力をアピール。
- 通学免許: 学校や仕事帰りの通いやすさ、スケジュール調整、無料送迎バスをアピール。
- 普通車免許: 初めての免許取得のワクワク感、安心のサポート体制を強調。
- 二輪免許（普通二輪・大型二輪）: ツーリングの楽しさ、風を感じる魅力、バイク女子歓迎などをアクティブに記述。
- プロ免許（牽引・大型特殊・中型自動車）: お仕事でのキャリアアップ、スキルアップ、資格取得支援（教育訓練給付金等）の実用性・ビジネスメリットを強調し、しっかりとした信頼感あるトーンにする。`;

    // ========================================================
    // 4. バリアント一括生成
    // ========================================================
    if (generateVariants) {
      const variantPrompt = `以下の条件で、4つのSNS向け投稿バリアントを一括生成してください。

【テーマ】: ${theme}
【狙うキーワード】: ${keywords && keywords.length > 0 ? keywords.join(', ') : '指定なし'}
【文章のトーン】: ${tone}
【クリック誘導先（CTA）】: ${cta}

以下のJSON形式のみで出力してください（マークダウンのコードブロックや説明文は不要）:
{
  "base_text": "共通ベース文（上記ガイドラインに沿った全文。ハッシュタグ含む）",
  "instagram_text": "Instagram用（絵文字・ハッシュタグを豊富に。視覚的に魅力的に）",
  "facebook_text": "Facebook用（リンクや詳細説明を含めた丁寧な文体。400文字前後）",
  "twitter_text": "X(Twitter)用（ハッシュタグ含め140文字以内に収めること）",
  "google_business_text": "Googleビジネス用（ハッシュタグなし、簡潔で信頼感のある文体。300文字以内）"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: variantPrompt },
          ],
          temperature: temperature,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'OpenAI APIの呼び出しに失敗しました。');
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content?.trim();
      if (!rawContent) throw new Error('AIからの応答テキストが空でした。');

      const variants = JSON.parse(rawContent);
      return NextResponse.json({
        variants,
        usedSchoolContent: useSchoolContent,
        usedLiveWebContent: !!(liveContent),
        fetchedUrls,
        scrapeErrors,
      });
    }

    // ========================================================
    // 5. 通常の単一テキスト生成
    // ========================================================
    const userPrompt = `以下の条件で投稿テキストを生成してください。
    
【テーマ】: ${theme}
【狙うキーワード】: ${keywords && keywords.length > 0 ? keywords.join(', ') : '指定なし'}
【文章のトーン】: ${tone}
【クリック誘導先（CTA）】: ${cta}

※出力は生成された投稿本文テキストのみを返し、余計な説明文やマークダウンのデコレーションコード(\`\`\`等）は含めないでください。`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: temperature,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI APIの呼び出しに失敗しました。');
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      throw new Error('AIからの応答テキストが空でした。');
    }

    return NextResponse.json({
      text: generatedText,
      usedSchoolContent: useSchoolContent,
      usedLiveWebContent: !!(liveContent),
      fetchedUrls,
      scrapeErrors,
    });
  } catch (err: any) {
    console.error('AI Generation API error:', err);
    return NextResponse.json(
      { error: err.message || 'AI生成の実行中にエラーが発生しました。' },
      { status: 500 }
    );
  }
}
