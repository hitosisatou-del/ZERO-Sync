import { NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';

export const revalidate = 0;

export async function GET() {
  try {
    const accounts = await DBService.getConnectedAccounts();
    return NextResponse.json(accounts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
