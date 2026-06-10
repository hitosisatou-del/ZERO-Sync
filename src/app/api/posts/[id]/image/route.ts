import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const resolvedParams = await params;
    const postId = resolvedParams.id;
    
    // DBから投稿情報を取得
    const postData = await DBService.getPostById(postId);
    if (!postData || !postData.post || !postData.post.image_url) {
      return new Response('Image not found', { status: 404 });
    }

    const imageUrl = postData.post.image_url;

    // Base64データURLの場合はバイナリに変換して返す
    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return new Response('Invalid image data format', { status: 400 });
      }

      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      return new Response(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, must-revalidate',
        },
      });
    }

    // すでに通常のURLの場合はそのURLへリダイレクト
    return NextResponse.redirect(imageUrl);
  } catch (error: any) {
    console.error('Error serving image:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
