import { NextRequest, NextResponse } from 'next/server';
import { DBService } from '@/lib/services/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Instagram対応のアスペクト比定数
const INSTAGRAM_MIN_RATIO = 0.8;  // 4:5（縦長の限界）
const INSTAGRAM_MAX_RATIO = 1.91; // 1.91:1（横長の限界）

/**
 * Instagramのアスペクト比制約に合わせて画像をセンタークロップする
 * @returns クロップ済みのバッファ、または調整不要ならnull
 */
async function adjustForInstagram(
  imageBuffer: Buffer,
  sharp: typeof import('sharp').default
): Promise<Buffer | null> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width;
  const height = metadata.height;

  if (!width || !height) return null;

  const currentRatio = width / height;

  // アスペクト比が許容範囲内ならそのまま
  if (currentRatio >= INSTAGRAM_MIN_RATIO && currentRatio <= INSTAGRAM_MAX_RATIO) {
    return null;
  }

  let newWidth = width;
  let newHeight = height;

  if (currentRatio > INSTAGRAM_MAX_RATIO) {
    // 横長すぎる → 幅を縮小（高さ基準でセンタークロップ）
    newWidth = Math.round(height * INSTAGRAM_MAX_RATIO);
    newHeight = height;
  } else if (currentRatio < INSTAGRAM_MIN_RATIO) {
    // 縦長すぎる → 高さを縮小（幅基準でセンタークロップ）
    newWidth = width;
    newHeight = Math.round(width / INSTAGRAM_MIN_RATIO);
  }

  // センタークロップの開始位置を計算
  const left = Math.round((width - newWidth) / 2);
  const top = Math.round((height - newHeight) / 2);

  console.log(`[Instagram Image Adjust] Original: ${width}x${height} (ratio: ${currentRatio.toFixed(2)}) → Cropped: ${newWidth}x${newHeight} (ratio: ${(newWidth / newHeight).toFixed(2)})`);

  const croppedBuffer = await sharp(imageBuffer)
    .extract({ left, top, width: newWidth, height: newHeight })
    .toBuffer();

  return croppedBuffer;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const resolvedParams = await params;
    const postId = resolvedParams.id;
    const platform = request.nextUrl.searchParams.get('platform');
    
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

        // 動的な動画判定 (DBのmedia_typeが欠落している古い投稿への対応)
        const contentType = imageResponse.headers.get('content-type');
        if (contentType && contentType.startsWith('video/')) {
          const arrayBuffer = await imageResponse.arrayBuffer();
          return new Response(Buffer.from(arrayBuffer), {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400, must-revalidate',
            },
          });
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

      // Instagram用：アスペクト比の自動調整（4:5〜1.91:1の範囲にセンタークロップ）
      if (platform === 'instagram') {
        const adjustedBuffer = await adjustForInstagram(imageBuffer, sharp);
        if (adjustedBuffer) {
          imageBuffer = adjustedBuffer;
        }
      }

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
