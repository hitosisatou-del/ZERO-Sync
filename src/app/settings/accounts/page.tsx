import React from 'react';
import { DBService } from '@/lib/services/db';
import AccountsClient from './AccountsClient';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

// キャッシュ無効化
export const revalidate = 0;

export default async function AccountsPage() {
  const user = await getSessionUser();
  
  if (!user) {
    redirect('/login');
  }

  // 管理者でない場合は、アカウント連携データを一切クライアントに露出させない
  if (user.role !== 'admin') {
    return <AccountsClient initialAccounts={[]} />;
  }

  const accounts = await DBService.getConnectedAccounts();

  return (
    <AccountsClient 
      initialAccounts={accounts} 
    />
  );
}
