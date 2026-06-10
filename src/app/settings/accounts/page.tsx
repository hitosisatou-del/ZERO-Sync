import React from 'react';
import { DBService } from '@/lib/services/db';
import AccountsClient from './AccountsClient';

// キャッシュ無効化
export const revalidate = 0;

export default async function AccountsPage() {
  const accounts = await DBService.getConnectedAccounts();

  return (
    <AccountsClient 
      initialAccounts={accounts} 
    />
  );
}
