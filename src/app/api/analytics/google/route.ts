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

    const performanceData = await getGoogleBusinessPerformance(
      googleAccount.access_token,
      googleAccount.external_account_id || undefined
    );

    return NextResponse.json({
      isConnected: true,
      ...performanceData
    });
  } catch (err: any) {
    console.error('Analytics API error:', err);
    return NextResponse.json(
      { error: err.message || 'インサイトデータの取得中にエラーが発生しました。' },
      { status: 500 }
    );
  }
}
