import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DBService } from '@/lib/services/db';

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'この操作を行う権限がありません。' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'メールアドレスが指定されていません。' }, { status: 400 });
    }

    const ownerEmail = 'hitosi.satou@gmail.com';
    if (email.toLowerCase() === ownerEmail.toLowerCase()) {
      return NextResponse.json({ error: 'オーナー管理者は削除できません。' }, { status: 400 });
    }

    await DBService.deleteUserRole(email.trim().toLowerCase());
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in /api/settings/users/delete:', error);
    return NextResponse.json(
      { error: error.message || 'ユーザーの削除に失敗しました。' },
      { status: 500 }
    );
  }
}
