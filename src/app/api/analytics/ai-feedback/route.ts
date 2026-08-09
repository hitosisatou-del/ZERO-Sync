import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // `api/analytics/all`から現在の分析データを取得
    // サーバーサイドでのフェッチのためURLを構築
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const analyticsRes = await fetch(`${protocol}://${host}/api/analytics/all`);
    
    if (!analyticsRes.ok) {
      throw new Error('分析データの取得に失敗しました');
    }
    const analyticsData = await analyticsRes.json();

    // 必要な情報だけを抽出・要約してAIに渡す
    const dataToAnalyze = {
      summary: analyticsData.summary,
      dailyTrendSample: analyticsData.dailyTrend.slice(-7), // 直近7日間の推移
      topPosts: analyticsData.recentPosts.slice(0, 5).map((p: any) => ({
        title: p.title,
        text: p.base_text.substring(0, 100) + '...',
        success_count: p.success_count
      }))
    };

    const systemPrompt = `あなたは教習所（ドライビングスクール）専門の凄腕SNSマーケティングコンサルタントです。
以下の直近のSNS集客データ（Googleマイビジネス、Instagram、Facebook、X等）を分析し、**マークダウン形式**でわかりやすく具体的な改善アドバイスを提示してください。

【制約事項】
- 教習所のターゲット（高校生・大学生の免許取得、地域の高齢者講習など）を意識すること。
- 文字数は400〜600文字程度で、要点を絞って箇条書きなどを活用して見やすくすること。
- 以下の3つの見出しを必ず含めること：
  1. 📈 現状の良かった点
  2. 🔍 改善の余地がある点
  3. 💡 次回の具体的なアクションプラン（どんなテーマでどんな投稿をするべきか）

【分析用データ（JSON形式）】
${JSON.stringify(dataToAnalyze, null, 2)}`;

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
          { role: 'user', content: '現在の集客レポートデータを分析し、アドバイスをください。' },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI APIからの応答に失敗しました');
    }

    const aiData = await response.json();
    const feedbackText = aiData.choices?.[0]?.message?.content?.trim() || 'AIからの応答がありませんでした。';

    return NextResponse.json({ success: true, feedback: feedbackText });
  } catch (error: any) {
    console.error('Error in ai-feedback API:', error);
    return NextResponse.json({ error: error.message || 'AIフィードバックの生成中にエラーが発生しました。' }, { status: 500 });
  }
}
