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
    if (!postData || !postData.post || !postData.post.media_url) {
      return new Response('Image not found', { status: 404 });
    }

    const mediaUrl = postData.post.media_url;
    const mediaType = postData.post.media_type;

    // 動画の場合はそのままプロキシ（変換不要）
    if (mediaType === 'video') {
      const videoResponse = await fetch(mediaUrl);
      if (!videoResponse.ok) {
        return new Response('Failed to fetch video', { status: videoResponse.status });
      }
      const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
      const arrayBuffer = await videoResponse.arrayBuffer();
      return new Response(Buffer.from(arrayBuffer), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, must-revalidate',
        },
      });
    }

    // 画像データの取得
    let imageBuffer: Buffer;

    if (mediaUrl.startsWith('data:')) {
      // Base64データURLの場合
      const matches = mediaUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return new Response('Invalid image data format', { status: 400 });
      }
      imageBuffer = Buffer.from(matches[2], 'base64');
    } else {
      // 通常のURL（Firebase Storage等）の場合
      try {
        const imageResponse = await fetch(mediaUrl);
        if (!imageResponse.ok) {
          console.error(`Failed to fetch image from URL: ${mediaUrl}. HTTP Status: ${imageResponse.status}`);
          return new Response('Failed to fetch original image', { status: imageResponse.status });
        }
        const arrayBuffer = await imageResponse.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
      } catch (e) {
        console.error('Error fetching external image:', e);
        return NextResponse.redirect(mediaUrl);
      }
    }

    // sharpでJPEGに変換（Instagram/Facebook Graph API互換性のため）
    try {
      const sharp = (await import('sharp')).default;
      const jpegBuffer = await sharp(imageBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();

      return new Response(jpegBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, must-revalidate',
        },
      });
    } catch (sharpError) {
      // sharpが使えない場合はそのまま返す
      console.error('Sharp conversion failed, returning original:', sharpError);
      return new Response(new Uint8Array(imageBuffer), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, must-revalidate',
        },
      });
    }
  } catch (error: any) {
    console.error('Error serving image:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
