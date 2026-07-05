import { NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';
import { getGoogleBusinessPerformance } from '@/lib/services/google-business';

export const revalidate = 0;

export async function GET() {
  try {
    const accounts = await DBService.getConnectedAccounts();
    const googleAccount = accounts.find((a) => a.platform === 'google_business_profile');

    if (!googleAccount) {
      return NextResponse.json(
        { error: 'Googleビジネスプロフィールアカウントが連携されていません。', isConnected: false },
        { status: 200 } // 未連携でも200で返し、フロントで綺麗にハンドリングします
      );
    }

    try {
      const performanceData = await getGoogleBusinessPerformance(
        googleAccount.access_token,
        googleAccount.external_account_id || undefined
      );

      return NextResponse.json({
        isConnected: true,
        isDemo: googleAccount.access_token.includes('dummy'),
        ...performanceData
      });
    } catch (apiErr: any) {
      console.warn('Real Google performance fetch failed, falling back to mock:', apiErr);
      
      // 実機APIでエラーが起きた場合、モック（デモ）データを生成して返します
      // その際、警告を表示するために isDemo: true とエラー詳細を付加します
      const dummyToken = 'encrypted_dummy_token'; // モック作成を強制するトークン
      const performanceData = await getGoogleBusinessPerformance(dummyToken);

      return NextResponse.json({
        isConnected: true,
        isDemo: true,
        errorDetail: apiErr.message || 'Google APIエラー',
        ...performanceData
      });
    }
  } catch (err: any) {
    console.error('Analytics API error:', err);
    return NextResponse.json(
      { error: err.message || 'インサイトデータの取得中にエラーが発生しました。', isConnected: false },
      { status: 200 } // 未連携画面を壊さないよう200で返します
    );
  }
}
