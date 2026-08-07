import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';
import { SchoolContentService } from '@/lib/services/school-content';

// GET (Vercel Cron) および POST (手動実行) の両方をサポート
export async function GET(request: NextRequest) {
  return processAutoGenerate(request);
}

export async function POST(request: NextRequest) {
  return processAutoGenerate(request);
}

async function processAutoGenerate(request: NextRequest) {
  try {
    const rules = await DBService.getAutomationRules();
    
    // 日本時間の現在時刻を取得
    const nowStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
    const now = new Date(nowStr);
    const currentDay = now.getDay();
    const currentHour = now.getHours();

    // 実行対象のルールをフィルタリング
    const rulesToRun = rules.filter(rule => {
      if (!rule.is_active) return false;
      if (rule.day_of_week !== currentDay) return false;
      if (rule.time_hour !== currentHour) return false;
      
      // 同じ日に重複して実行しないようにする
      if (rule.last_run_at) {
        const lastRunStr = new Date(rule.last_run_at).toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
        const lastRun = new Date(lastRunStr);
        if (
          lastRun.getFullYear() === now.getFullYear() &&
          lastRun.getMonth() === now.getMonth() &&
          lastRun.getDate() === now.getDate()
        ) {
          return false;
        }
      }
      return true;
    });

    if (rulesToRun.length === 0) {
      return NextResponse.json({ success: true, message: '実行対象のオートメーションルールはありません。', processed: 0 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI APIキーが設定されていません。');
    }

    // 1. 直近の投稿履歴の取得 (重複回避用)
    let recentHistoryContext = '';
    try {
      const { posts } = await DBService.getPosts();
      const recentPosts = posts.slice(0, 3).map(p => p.base_text).filter(Boolean);
      if (recentPosts.length > 0) {
        recentHistoryContext = recentPosts.map((text, i) => `【直近の投稿 ${i + 1}】\n${text}`).join('\n\n');
      }
    } catch (e) {
      console.warn('Failed to fetch recent history for AI context:', e);
    }

    // 2. DB公式情報の取得
    const schoolContext = await SchoolContentService.buildAIContext();
    const contentRulesSection = schoolContext ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【⚠️ 絶対遵守ルール】
以下の「公式情報」に記載された内容のみを使って投稿文を生成してください。
公式情報に記載されていない料金・日程・キャンペーン・特典・数値・サービス名は
一切作成・推測・補完しないでください。不明な場合は「公式サイトをご確認ください」と記述してください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【公式情報（この内容のみ参照すること）】
${schoolContext}
` : '';

    const historyRulesSection = recentHistoryContext ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【⚠️ 重複回避ルール】
以下のテキストは、直近で私たちがSNSに投稿した内容です。
新しく生成するテキストは、これらの「直近の投稿」とテーマや話題、構成が完全に被らないように、新しい視点や切り口で作成してください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${recentHistoryContext}
` : '';

    const dateContext = `本日は ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 です。この時期・季節感に合った自然な表現を取り入れてください。`;

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
5. 【ハッシュタグ】: 投稿に関連するハッシュタグ（地名、サービス名、スクール名など）を5〜7個、文末に付与する（例：#都城 #都城市 #自動車学校 #バイク免許 #都城ドライビングスクール）。`;

    const reports: any[] = [];

    // 3. 各ルールに基づいて生成と投稿予約を実行
    for (const rule of rulesToRun) {
      try {
        const variantPrompt = `以下の条件で、4つのSNS向け投稿バリアントを一括生成してください。

【テーマ】: ${rule.theme}
【文章のトーン】: ${rule.tone}
【クリック誘導先（CTA）】: ${rule.cta}

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
            temperature: 0.8, // 定期配信は少しクリエイティブに振る
            max_tokens: 2000,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          throw new Error('OpenAI API request failed');
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content?.trim();
        const variants = JSON.parse(rawContent);

        // 投稿をDBに保存 (10分後に配信されるようにスケジュール)
        const scheduledTime = new Date(now.getTime() + 10 * 60000);
        await DBService.createPost(
          {
            title: `[自動生成] ${rule.theme}`,
            base_text: variants.base_text,
            instagram_text: variants.instagram_text,
            facebook_text: variants.facebook_text,
            google_business_text: variants.google_business_text,
            twitter_text: variants.twitter_text,
            link_url: null,
            image_url: null,
            scheduled_at: scheduledTime.toISOString(),
            is_ai: true,
          },
          rule.platforms
        );

        await DBService.updateAutomationRuleLastRun(rule.id);

        reports.push({ ruleId: rule.id, status: 'success' });
      } catch (err: any) {
        console.error(`Error processing automation rule ${rule.id}:`, err);
        reports.push({ ruleId: rule.id, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${rulesToRun.length}件のオートメーションルールを実行しました。`,
      processed: rulesToRun.length,
      reports 
    });

  } catch (error: any) {
    console.error('Error in cron/auto-generate API:', error);
    return NextResponse.json({ error: error.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
