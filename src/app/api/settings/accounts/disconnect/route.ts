import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') as 'instagram' | 'facebook' | 'google_business_profile' | null;

    if (!platform) {
      return NextResponse.json({ error: 'プラットフォームが指定されていません。' }, { status: 400 });
    }

    await DBService.disconnectAccount(platform);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in disconnect API:', error);
    return NextResponse.json({ error: error.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
