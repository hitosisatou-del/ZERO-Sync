import React from 'react';
import { notFound } from 'next/navigation';
import { DBService } from '@/lib/services/db';
import PostDetailClient from './PostDetailClient';

// Next.jsのキャッシュを無効化（常に最新の配信状況を取得するため）
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PostDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const data = await DBService.getPostById(id);

  if (!data) {
    notFound();
  }

  return (
    <PostDetailClient 
      post={data.post} 
      initialResults={data.results} 
    />
  );
}
