import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DBService } from '@/lib/services/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'この操作を行う権限がありません。' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: '有効なメールアドレスを入力してください。' }, { status: 400 });
    }

    if (role !== 'admin' && role !== 'editor') {
      return NextResponse.json({ error: '無効な権限（ロール）です。' }, { status: 400 });
    }

    const ownerEmail = 'hitosi.satou@gmail.com';
    if (email.toLowerCase() === ownerEmail.toLowerCase()) {
      return NextResponse.json({ error: 'オーナー管理者の権限は変更できません。' }, { status: 400 });
    }

    await DBService.saveUserRole(email.trim().toLowerCase(), role);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in /api/settings/users/save:', error);
    return NextResponse.json(
      { error: error.message || 'ユーザー情報の保存に失敗しました。' },
      { status: 500 }
    );
  }
}
