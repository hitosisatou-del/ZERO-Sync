import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const { theme, textContext } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // 画像生成用の詳細なプロンプトを作成
    const imagePrompt = `あなたはSNSマーケティング用の画像クリエイターです。
以下のテーマと内容に基づいて、日本の教習所（ドライビングスクール）のSNS投稿に最適な、魅力的で高品質な画像を1枚生成してください。

【テーマ】: ${theme}
【投稿内容の要約】: ${textContext ? textContext.substring(0, 300) : ''}

【画像スタイルの指定】
- スタイル: 実写風の高品質な写真、または親しみやすい高品質なフラットイラスト（テキストを含めないこと）
- 対象: 日本の若者、学生、または教習所の風景（車、バイクなど）
- トーン: 明るく、前向きで、安心感のある雰囲気
- 注意事項: 画像内に文字（英語や日本語のテキスト）を極力含めないでください。不自然な文字化けを防ぐためです。`;

    // DALL-E 3 API呼び出し
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('DALL-E API Error:', errData);
      throw new Error(errData.error?.message || '画像の生成に失敗しました');
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;

    // 画像をダウンロードして圧縮（Sharpを使用）
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('生成された画像のダウンロードに失敗しました');
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sharpでリサイズ＆圧縮（DB容量制限対策: 1024x1024 -> 800x800, JPEG 70%）
    const compressedBuffer = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();

    const base64Image = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;

    return NextResponse.json({ success: true, imageUrl: base64Image });
  } catch (error: any) {
    console.error('Error in generate-image API:', error);
    return NextResponse.json({ error: error.message || '画像の生成中にエラーが発生しました。' }, { status: 500 });
  }
}
