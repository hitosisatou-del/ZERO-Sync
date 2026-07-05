import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const { theme, keywords, tone, cta } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI APIキーが設定されていません。環境変数をご確認ください。' },
        { status: 500 }
      );
    }

    const systemPrompt = `あなたは宮崎県都城市にある「都城ドライビングスクール」のプロモーション担当者であり、Googleマップ検索（MEO）およびSNSマーケティングの専門家です。
指示された「テーマ」「キーワード」「文章のトーン」「誘導先（CTA）」に基づいて、Googleビジネスプロフィールや各種SNS（Instagram, Facebook等）への投稿に最適な効果的な告知文を生成してください。

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

    const userPrompt = `以下の条件で投稿テキストを生成してください。
    
【テーマ】: ${theme}
【狙うキーワード】: ${keywords && keywords.length > 0 ? keywords.join(', ') : '指定なし'}
【文章のトーン】: ${tone}
【クリック誘導先（CTA）】: ${cta}

※出力は生成された投稿本文テキストのみを返し、余計な説明文やマークダウンのデコレーションコード（\`\`\`等）は含めないでください。`;

    // OpenAI APIに直接fetchリクエストを送信 (軽量化とパフォーマンス維持のため)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
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

    return NextResponse.json({ text: generatedText });
  } catch (err: any) {
    console.error('AI Generation API error:', err);
    return NextResponse.json(
      { error: err.message || 'AI生成の実行中にエラーが発生しました。' },
      { status: 500 }
    );
  }
}
