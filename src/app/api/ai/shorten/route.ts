import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const { text, limit = 280 } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'テキストが指定されていません。' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI APIキーが設定されていません。環境変数をご確認ください。' },
        { status: 500 }
      );
    }

    const systemPrompt = `あなたはプロのSNSマーケターです。
与えられた日本語の投稿文を、元のニュアンスや重要な情報（キャンペーン内容、価格、日付、連絡先など）や文末のハッシュタグを可能な限り維持したまま、全体の文字数が${limit}文字以下になるように要約・短縮してください。
不自然な日本語にならないようにし、適度に絵文字を使用して魅力的なX（旧Twitter）向けの文章に仕上げてください。

出力は短縮された文章のみを返し、解説やマークダウン of デコレーションコード（\`\`\`等）は一切含めないでください。`;

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
          { role: 'user', content: text }
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI APIの呼び出しに失敗しました。');
    }

    const data = await response.json();
    const shortenedText = data.choices?.[0]?.message?.content?.trim();

    if (!shortenedText) {
      throw new Error('AIからの応答が空でした。');
    }

    return NextResponse.json({ text: shortenedText });
  } catch (err: any) {
    console.error('AI Shorten API error:', err);
    return NextResponse.json(
      { error: err.message || 'AI短縮の実行中にエラーが発生しました。' },
      { status: 500 }
    );
  }
}
