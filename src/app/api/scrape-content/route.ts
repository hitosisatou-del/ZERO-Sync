import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

// スクレイプ対象URL一覧
const ALLOWED_DOMAINS = [
  'goodmenkyo.com',
  'miyakonojyo-ds.jp',
];

/**
 * HTMLタグを除去してプレーンテキストを抽出
 */
function stripHtml(html: string): string {
  return html
    // script / style タグごと除去
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    // HTMLコメント除去
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // 改行的タグを改行に変換
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6]|li|tr|th|td|section|article|header|footer|main|nav|aside|blockquote)[^>]*>/gi, '\n')
    // 残りのタグを除去
    .replace(/<[^>]+>/g, '')
    // HTMLエンティティのデコード
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&yen;/g, '¥')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    // 連続する空白・改行を整理
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * ページのタイトルを抽出
 */
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).trim() : '';
}

/**
 * meta descriptionを抽出
 */
function extractMetaDescription(html: string): string {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  return match ? match[1].trim() : '';
}

/**
 * 見出し（h1〜h3）を抽出
 */
function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const pattern = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const text = stripHtml(match[1]).trim();
    if (text && text.length > 1 && text.length < 200) {
      headings.push(text);
    }
  }
  return [...new Set(headings)]; // 重複除去
}

/**
 * 料金・数値情報を含む行を抽出（円マーク・%・日数など）
 */
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

/**
 * CTAテキスト（申込・問い合わせ関連）を抽出
 */
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

/**
 * メインコンテンツエリアのテキストを抽出（上位2000文字）
 */
function extractMainText(html: string): string {
  // main / article / #content / .content 等を優先
  const mainPatterns = [
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]+(?:id|class)=["'][^"']*(?:content|main|body|wrapper)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pat of mainPatterns) {
    const m = html.match(pat);
    if (m) {
      const text = stripHtml(m[1]);
      if (text.length > 200) return text.slice(0, 3000);
    }
  }

  // フォールバック: body全体
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    return stripHtml(bodyMatch[1]).slice(0, 3000);
  }
  return stripHtml(html).slice(0, 3000);
}

/**
 * スクレイプしたHTMLから構造化コンテンツを生成
 */
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

  // メインテキストの一部（重複を避けるため先頭部分のみ）
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'url パラメータが必要です。' }, { status: 400 });
    }

    // ドメイン許可チェック
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: '無効なURLです。' }, { status: 400 });
    }

    const isAllowed = ALLOWED_DOMAINS.some(d => parsedUrl.hostname.includes(d));
    if (!isAllowed) {
      return NextResponse.json(
        { error: `このドメインのスクレイピングは許可されていません: ${parsedUrl.hostname}` },
        { status: 403 }
      );
    }

    // HTMLをfetch
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZeroSyncBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000), // 15秒タイムアウト
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `ページの取得に失敗しました (HTTP ${response.status})` },
        { status: 502 }
      );
    }

    const html = await response.text();
    const structured = buildStructuredContent(html, targetUrl);

    return NextResponse.json({
      url: targetUrl,
      content: structured,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Scrape error:', err);
    const isTimeout = err.name === 'TimeoutError' || err.message?.includes('timeout');
    return NextResponse.json(
      { error: isTimeout ? 'ページの読み込みがタイムアウトしました。' : err.message || 'スクレイピング中にエラーが発生しました。' },
      { status: 500 }
    );
  }
}

/**
 * POST: 複数URLを一括スクレイプ
 */
export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json() as { urls: string[] };

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls 配列が必要です。' }, { status: 400 });
    }

    const results = await Promise.allSettled(
      urls.map(async (url) => {
        let parsedUrl: URL;
        try { parsedUrl = new URL(url); } catch { throw new Error(`無効なURL: ${url}`); }

        const isAllowed = ALLOWED_DOMAINS.some(d => parsedUrl.hostname.includes(d));
        if (!isAllowed) throw new Error(`許可されていないドメイン: ${parsedUrl.hostname}`);

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ZeroSyncBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ja,en;q=0.5',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
        const html = await res.text();
        return { url, content: buildStructuredContent(html, url) };
      })
    );

    const pages = results.map((r, i) => {
      if (r.status === 'fulfilled') {
        return { url: urls[i], content: r.value.content, error: null };
      } else {
        return { url: urls[i], content: null, error: (r.reason as Error).message };
      }
    });

    const combined = pages
      .filter(p => p.content)
      .map(p => `\n\n━━━━ ${p.url} ━━━━\n${p.content}`)
      .join('');

    return NextResponse.json({
      pages,
      combined,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Scrape POST error:', err);
    return NextResponse.json({ error: err.message || 'エラーが発生しました。' }, { status: 500 });
  }
}
