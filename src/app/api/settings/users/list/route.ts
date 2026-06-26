import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DBService } from '@/lib/services/db';

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'この操作を行う権限がありません。' }, { status: 403 });
    }

    const users = await DBService.getAllUserRoles();
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error in /api/settings/users/list:', error);
    return NextResponse.json(
      { error: error.message || 'ユーザー一覧の取得に失敗しました。' },
      { status: 500 }
    );
  }
}
