import { NextRequest, NextResponse } from 'next/server';
import { SchoolContentService, SchoolContentCategory } from '@/lib/services/school-content';

export const revalidate = 0;

// GET: 一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as SchoolContentCategory | null;
    const activeOnly = searchParams.get('active') !== 'false';

    let contents;
    if (category) {
      contents = await SchoolContentService.getByCategory(category);
    } else {
      contents = await SchoolContentService.getAll(activeOnly);
    }

    return NextResponse.json({ contents });
  } catch (err: any) {
    console.error('SchoolContent GET error:', err);
    return NextResponse.json({ error: err.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

// POST: 新規作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, title, body: contentBody, source_url, is_active } = body;

    if (!category || !title || !contentBody) {
      return NextResponse.json({ error: 'category, title, body は必須です。' }, { status: 400 });
    }

    const newContent = await SchoolContentService.create({
      category,
      title,
      body: contentBody,
      source_url: source_url || null,
      is_active: is_active !== false,
    });

    return NextResponse.json({ content: newContent }, { status: 201 });
  } catch (err: any) {
    console.error('SchoolContent POST error:', err);
    return NextResponse.json({ error: err.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

// PATCH: 更新
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'id は必須です。' }, { status: 400 });
    }

    // body フィールド名の変換（API側は body、サービス側も body）
    const updated = await SchoolContentService.update(id, updateData);
    if (!updated) {
      return NextResponse.json({ error: '指定されたコンテンツが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json({ content: updated });
  } catch (err: any) {
    console.error('SchoolContent PATCH error:', err);
    return NextResponse.json({ error: err.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}

// DELETE: 削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id は必須です。' }, { status: 400 });
    }

    const success = await SchoolContentService.delete(id);
    if (!success) {
      return NextResponse.json({ error: '指定されたコンテンツが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('SchoolContent DELETE error:', err);
    return NextResponse.json({ error: err.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
