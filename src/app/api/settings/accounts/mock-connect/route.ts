import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';
import { encrypt } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform } = body; // 'instagram' | 'facebook' | 'google_business_profile'

    if (!platform) {
      return NextResponse.json({ error: 'プラットフォームが指定されていません。' }, { status: 400 });
    }

    let accountName = '';
    let externalAccountId = '';

    if (platform === 'instagram') {
      accountName = '都城ドライビングスクール (@miyakonojo_ds)';
      externalAccountId = '17841400000000000';
    } else if (platform === 'facebook') {
      accountName = '都城ドライビングスクール Facebookページ';
      externalAccountId = '100063900000000';
    } else if (platform === 'google_business_profile') {
      accountName = '都城ドライビングスクール 都城校 (Google店舗)';
      externalAccountId = 'locations/1234567890';
    } else {
      return NextResponse.json({ error: '無効なプラットフォームです。' }, { status: 400 });
    }

    const dummyAccessToken = `dummy_token_${platform}_${Date.now()}`;
    const encryptedToken = encrypt(dummyAccessToken);

    const account = await DBService.saveConnectedAccount({
      platform,
      account_name: accountName,
      external_account_id: externalAccountId,
      access_token: encryptedToken,
      refresh_token: encrypt(`dummy_refresh_${platform}`),
      token_expires_at: new Date(Date.now() + 3600000 * 24 * 60).toISOString(), // 60日後
    });

    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    console.error('Error in mock-connect API:', error);
    return NextResponse.json({ error: error.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
