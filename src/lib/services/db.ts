import { adminDb, isFirebaseConfigured } from '../firebase/admin';

// インメモリのモックデータベース型定義（既存コードとの互換性維持）
export interface Post {
  id: string;
  title: string | null;
  base_text: string;
  instagram_text: string | null;
  facebook_text: string | null;
  google_business_text: string | null;
  link_url: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  scheduled_at?: string | null;
}

export interface PostResult {
  id: string;
  post_id: string;
  platform: 'instagram' | 'facebook' | 'google_business_profile';
  status: 'pending' | 'success' | 'failed' | 'scheduled';
  external_post_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectedAccount {
  id: string;
  platform: 'instagram' | 'facebook' | 'google_business_profile';
  account_name: string | null;
  external_account_id: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// 初期モックデータ (都城ドライビングスクール専用のサンプル)
let mockPosts: Post[] = [
  {
    id: 'post-1',
    title: '夏の免許取得キャンペーン開始！',
    base_text: '【夏の免許取得キャンペーン開始！】\n本日より、学生の皆様を応援する夏休み特別キャンペーンがスタートします！短期集中プランや、友達紹介での割引特典など盛りだくさん。都城ドライビングスクールで、この夏一生ものの運転免許を手に入れませんか？詳細はウェブサイトをチェック！ #都城 #教習所 #免許取得',
    instagram_text: '【夏の免許取得キャンペーン開始！】\n本日より、学生の皆様を応援する夏休み特別キャンペーンがスタートします！短期集中プランや、友達紹介での割引特典など盛りだくさん。都城ドライビングスクールで、この夏一生ものの運転免許を手に入れませんか？詳細はプロフィールリンクからウェブサイトをチェック！\n\n#都城 #教習所 #免許取得 #都城ドライビングスクール #免許 #夏休み #教習 #車好きな人と繋がりたい',
    facebook_text: '【夏の免許取得キャンペーン開始！】\n本日より、学生の皆様を応援する夏休み特別キャンペーンがスタートします！\n短期集中プランや、友達紹介での割引特典など盛りだくさん。都城ドライビングスクールで、この夏一生ものの運転免許を手に入れませんか？\n\n▼ キャンペーン詳細・お申し込みはこちら\nhttps://example.com/summer-campaign',
    google_business_text: '【都城ドライビングスクール】夏の免許取得キャンペーン開始！\n本日より学生向け夏休み特別キャンペーンがスタート。短期集中プランや紹介割引などお得な特典をご用意しています。この夏、一生ものの免許を手に入れませんか？',
    link_url: 'https://example.com/summer-campaign',
    image_url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=800&auto=format&fit=crop',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'post-2',
    title: '新しい教習車が納車されました！',
    base_text: '都城ドライビングスクールに新しい教習車が仲間入りしました！最新の安全機能を備えたスタイリッシュな車両で、より快適で安全な教習をサポートします。みなさん、新しい車での教習をぜひ楽しみにしてくださいね！',
    instagram_text: '都城ドライビングスクールに新しい教習車が仲間入りしました！✨\n最新の安全機能を備えたスタイリッシュな車両で、より快適で安全な教習をサポートします。🚘\nみなさん、新しい車での教習をぜひ楽しみにしてくださいね！\n\n#都城 #教習所 #都城ドライビングスクール #新車 #教習車 #安全運転 #プリウス',
    facebook_text: '都城ドライビングスクールに新しい教習車が仲間入りしました！\n最新の安全機能を備えたスタイリッシュな車両で、より快適で安全な教習をサポートします。みなさん、新しい車での教習をぜひ楽しみにしてくださいね！',
    google_business_text: '【都城ドライビングスクール】新しい教習車が納車されました！最新の安全機能を備えた快適な教習車で、皆様の運転免許取得をしっかりサポートします。ご予約お待ちしております！',
    link_url: null,
    image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=800&auto=format&fit=crop',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  }
];

let mockPostResults: PostResult[] = [
  {
    id: 'result-1',
    post_id: 'post-1',
    platform: 'instagram',
    status: 'success',
    external_post_id: 'ig_post_12345',
    error_message: null,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'result-2',
    post_id: 'post-1',
    platform: 'facebook',
    status: 'success',
    external_post_id: 'fb_post_67890',
    error_message: null,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'result-3',
    post_id: 'post-1',
    platform: 'google_business_profile',
    status: 'failed',
    external_post_id: null,
    error_message: 'Google Business Profile API: Location verification is required for this action.',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'result-4',
    post_id: 'post-2',
    platform: 'instagram',
    status: 'success',
    external_post_id: 'ig_post_99999',
    error_message: null,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'result-5',
    post_id: 'post-2',
    platform: 'facebook',
    status: 'success',
    external_post_id: 'fb_post_99999',
    error_message: null,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  }
];

let mockConnectedAccounts: ConnectedAccount[] = [
  {
    id: 'acc-1',
    platform: 'instagram',
    account_name: '都城ドライビングスクール (@miyakonojo_ds)',
    external_account_id: '17841400000000000',
    access_token: 'encrypted_dummy_token',
    refresh_token: null,
    token_expires_at: new Date(Date.now() + 3600000 * 24 * 60).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'acc-2',
    platform: 'facebook',
    account_name: '都城ドライビングスクール Facebookページ',
    external_account_id: '100063900000000',
    access_token: 'encrypted_dummy_token',
    refresh_token: null,
    token_expires_at: new Date(Date.now() + 3600000 * 24 * 60).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

// DBアクセスクラス (Firestore ＆ MockDB ハイブリッド)
export class DBService {
  /**
   * 投稿一覧を所得
   */
  static async getPosts(): Promise<{ posts: Post[]; results: PostResult[] }> {
    if (!isFirebaseConfigured() || !adminDb) {
      const posts = [...mockPosts].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return { posts, results: mockPostResults };
    }

    try {
      const snapshot = await adminDb.collection('posts').orderBy('created_at', 'desc').get();
      const posts: Post[] = [];
      const results: PostResult[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const postId = doc.id;

        posts.push({
          id: postId,
          title: data.title || null,
          base_text: data.base_text,
          instagram_text: data.instagram_text || null,
          facebook_text: data.facebook_text || null,
          google_business_text: data.google_business_text || null,
          link_url: data.link_url || null,
          image_url: data.image_url || null,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
          scheduled_at: data.scheduled_at || null,
        });

        // results オブジェクトを展開してフラットな配列にマッピング
        if (data.results) {
          Object.keys(data.results).forEach((platform) => {
            const res = data.results[platform];
            results.push({
              id: `${postId}_${platform}`,
              post_id: postId,
              platform: platform as any,
              status: res.status || 'pending',
              external_post_id: res.external_post_id || null,
              error_message: res.error_message || null,
              created_at: res.created_at || data.created_at || new Date().toISOString(),
              updated_at: res.updated_at || data.updated_at || new Date().toISOString(),
            });
          });
        }
      });

      return { posts, results };
    } catch (e) {
      console.warn('Firestore fetch failed, falling back to mock DB:', e);
      if (isFirebaseConfigured() && adminDb) {
        throw e;
      }
      return { posts: mockPosts, results: mockPostResults };
    }
  }

  /**
   * 特定の投稿と結果を取得
   */
  static async getPostById(id: string): Promise<{ post: Post; results: PostResult[] } | null> {
    if (!isFirebaseConfigured() || !adminDb) {
      const post = mockPosts.find((p) => p.id === id);
      if (!post) return null;
      const results = mockPostResults.filter((r) => r.post_id === id);
      return { post, results };
    }

    try {
      const doc = await adminDb.collection('posts').doc(id).get();
      if (!doc.exists) return null;

      const data = doc.data()!;
      const post: Post = {
        id: doc.id,
        title: data.title || null,
        base_text: data.base_text,
        instagram_text: data.instagram_text || null,
        facebook_text: data.facebook_text || null,
        google_business_text: data.google_business_text || null,
        link_url: data.link_url || null,
        image_url: data.image_url || null,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        scheduled_at: data.scheduled_at || null,
      };

      const results: PostResult[] = [];
      if (data.results) {
        Object.keys(data.results).forEach((platform) => {
          const res = data.results[platform];
          results.push({
            id: `${doc.id}_${platform}`,
            post_id: doc.id,
            platform: platform as any,
            status: res.status || 'pending',
            external_post_id: res.external_post_id || null,
            error_message: res.error_message || null,
            created_at: res.created_at || data.created_at || new Date().toISOString(),
            updated_at: res.updated_at || data.updated_at || new Date().toISOString(),
          });
        });
      }

      return { post, results };
    } catch (e) {
      console.warn('Firestore getPostById failed, falling back to mock DB:', e);
      if (isFirebaseConfigured() && adminDb) {
        throw e;
      }
      const post = mockPosts.find((p) => p.id === id);
      if (!post) return null;
      const results = mockPostResults.filter((r) => r.post_id === id);
      return { post, results };
    }
  }

  /**
   * 新規投稿の作成
   */
  static async createPost(
    postData: Omit<Post, 'id' | 'created_at' | 'updated_at'> & { scheduled_at?: string | null },
    platforms: Array<'instagram' | 'facebook' | 'google_business_profile'>
  ): Promise<Post> {
    const nowStr = new Date().toISOString();
    const isScheduled = !!postData.scheduled_at;
    const initialStatus = isScheduled ? 'scheduled' : 'pending';

    if (!isFirebaseConfigured() || !adminDb) {
      const newPost: Post = {
        ...postData,
        id: `post-${Date.now()}`,
        created_at: nowStr,
        updated_at: nowStr,
        scheduled_at: postData.scheduled_at || null,
      };
      mockPosts.push(newPost);

      platforms.forEach((platform) => {
        mockPostResults.push({
          id: `result-${Date.now()}-${platform}`,
          post_id: newPost.id,
          platform,
          status: initialStatus,
          external_post_id: null,
          error_message: null,
          created_at: nowStr,
          updated_at: nowStr,
        });
      });
      return newPost;
    }

    try {
      // プラットフォームごとの結果マップの初期値を作成
      const resultsMap: Record<string, any> = {};
      platforms.forEach((platform) => {
        resultsMap[platform] = {
          status: initialStatus,
          external_post_id: null,
          error_message: null,
          created_at: nowStr,
          updated_at: nowStr,
        };
      });

      const docRef = await adminDb.collection('posts').add({
        title: postData.title !== undefined ? postData.title : null,
        base_text: postData.base_text,
        instagram_text: postData.instagram_text !== undefined ? postData.instagram_text : null,
        facebook_text: postData.facebook_text !== undefined ? postData.facebook_text : null,
        google_business_text: postData.google_business_text !== undefined ? postData.google_business_text : null,
        link_url: postData.link_url !== undefined ? postData.link_url : null,
        image_url: postData.image_url !== undefined ? postData.image_url : null,
        created_at: nowStr,
        updated_at: nowStr,
        results: resultsMap,
        scheduled_at: postData.scheduled_at !== undefined ? postData.scheduled_at : null,
      });

      return {
        ...postData,
        id: docRef.id,
        created_at: nowStr,
        updated_at: nowStr,
        scheduled_at: postData.scheduled_at !== undefined ? postData.scheduled_at : null,
      };
    } catch (e) {
      console.warn('Firestore createPost failed, falling back to mock DB:', e);
      if (isFirebaseConfigured() && adminDb) {
        throw e;
      }
      const newPost: Post = {
        ...postData,
        id: `post-${Date.now()}`,
        created_at: nowStr,
        updated_at: nowStr,
        scheduled_at: postData.scheduled_at || null,
      };
      mockPosts.push(newPost);
      platforms.forEach((platform) => {
        mockPostResults.push({
          id: `result-${Date.now()}-${platform}`,
          post_id: newPost.id,
          platform,
          status: initialStatus,
          external_post_id: null,
          error_message: null,
          created_at: nowStr,
          updated_at: nowStr,
        });
      });
      return newPost;
    }
  }

  /**
   * 投稿結果の更新
   */
  static async updatePostResult(
    postId: string,
    platform: 'instagram' | 'facebook' | 'google_business_profile',
    updateData: {
      status: 'pending' | 'success' | 'failed';
      external_post_id?: string | null;
      error_message?: string | null;
    }
  ): Promise<void> {
    const nowStr = new Date().toISOString();

    if (!isFirebaseConfigured() || !adminDb) {
      const result = mockPostResults.find((r) => r.post_id === postId && r.platform === platform);
      if (result) {
        result.status = updateData.status;
        result.external_post_id = updateData.external_post_id !== undefined ? updateData.external_post_id : result.external_post_id;
        result.error_message = updateData.error_message !== undefined ? updateData.error_message : result.error_message;
        result.updated_at = nowStr;
      } else {
        mockPostResults.push({
          id: `result-${Date.now()}-${platform}`,
          post_id: postId,
          platform,
          status: updateData.status,
          external_post_id: updateData.external_post_id || null,
          error_message: updateData.error_message || null,
          created_at: nowStr,
          updated_at: nowStr,
        });
      }
      return;
    }

    try {
      const docRef = adminDb.collection('posts').doc(postId);
      const updateObj: Record<string, any> = {
        updated_at: nowStr,
      };
      
      // ネストされたオブジェクトの特定要素をドット記法で更新
      updateObj[`results.${platform}.status`] = updateData.status;
      updateObj[`results.${platform}.updated_at`] = nowStr;

      if (updateData.external_post_id !== undefined) {
        updateObj[`results.${platform}.external_post_id`] = updateData.external_post_id;
      }
      if (updateData.error_message !== undefined) {
        updateObj[`results.${platform}.error_message`] = updateData.error_message;
      }

      await docRef.update(updateObj);
    } catch (e) {
      console.warn('Firestore updatePostResult failed, falling back to mock DB:', e);
      if (isFirebaseConfigured() && adminDb) {
        throw e;
      }
      const result = mockPostResults.find((r) => r.post_id === postId && r.platform === platform);
      if (result) {
        result.status = updateData.status;
        result.external_post_id = updateData.external_post_id !== undefined ? updateData.external_post_id : result.external_post_id;
        result.error_message = updateData.error_message !== undefined ? updateData.error_message : result.error_message;
        result.updated_at = nowStr;
      }
    }
  }

  /**
   * 連携済みアカウント一覧を取得
   */
  static async getConnectedAccounts(): Promise<ConnectedAccount[]> {
    if (!isFirebaseConfigured() || !adminDb) {
      return mockConnectedAccounts;
    }

    try {
      const snapshot = await adminDb.collection('connected_accounts').get();
      const accounts: ConnectedAccount[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        accounts.push({
          id: doc.id,
          platform: data.platform as any,
          account_name: data.account_name || null,
          external_account_id: data.external_account_id || null,
          access_token: data.access_token,
          refresh_token: data.refresh_token || null,
          token_expires_at: data.token_expires_at || null,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        });
      });
      return accounts;
    } catch (e) {
      console.warn('Firestore getConnectedAccounts failed, falling back to mock DB:', e);
      if (isFirebaseConfigured() && adminDb) {
        throw e;
      }
      return mockConnectedAccounts;
    }
  }

  /**
   * アカウント連携の保存 (UPSERT)
   */
  static async saveConnectedAccount(
    accountData: Omit<ConnectedAccount, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ConnectedAccount> {
    const nowStr = new Date().toISOString();
    const newAccount: ConnectedAccount = {
      ...accountData,
      id: accountData.platform, // platform をIDにする
      created_at: nowStr,
      updated_at: nowStr,
    };

    if (!isFirebaseConfigured() || !adminDb) {
      const index = mockConnectedAccounts.findIndex((a) => a.platform === accountData.platform);
      if (index !== -1) {
        mockConnectedAccounts[index] = {
          ...mockConnectedAccounts[index],
          ...accountData,
          updated_at: nowStr,
        };
        return mockConnectedAccounts[index];
      } else {
        mockConnectedAccounts.push(newAccount);
        return newAccount;
      }
    }

    try {
      const docRef = adminDb.collection('connected_accounts').doc(accountData.platform);
      await docRef.set({
        platform: accountData.platform,
        account_name: accountData.account_name !== undefined ? accountData.account_name : null,
        external_account_id: accountData.external_account_id !== undefined ? accountData.external_account_id : null,
        access_token: accountData.access_token,
        refresh_token: accountData.refresh_token !== undefined ? accountData.refresh_token : null,
        token_expires_at: accountData.token_expires_at !== undefined ? accountData.token_expires_at : null,
        created_at: nowStr,
        updated_at: nowStr,
      }, { merge: true });

      return newAccount;
    } catch (e) {
      console.warn('Firestore saveConnectedAccount failed, falling back to mock DB:', e);
      if (isFirebaseConfigured() && adminDb) {
        throw e;
      }
      const index = mockConnectedAccounts.findIndex((a) => a.platform === accountData.platform);
      if (index !== -1) {
        mockConnectedAccounts[index] = {
          ...mockConnectedAccounts[index],
          ...accountData,
          updated_at: nowStr,
        };
        return mockConnectedAccounts[index];
      } else {
        mockConnectedAccounts.push(newAccount);
        return newAccount;
      }
    }
  }

  /**
   * アカウント連携解除
   */
  static async disconnectAccount(platform: 'instagram' | 'facebook' | 'google_business_profile'): Promise<void> {
    if (!isFirebaseConfigured() || !adminDb) {
      mockConnectedAccounts = mockConnectedAccounts.filter((a) => a.platform !== platform);
      return;
    }

    try {
      await adminDb.collection('connected_accounts').doc(platform).delete();
    } catch (e) {
      console.warn('Firestore disconnectAccount failed, falling back to mock DB:', e);
      if (isFirebaseConfigured() && adminDb) {
        throw e;
      }
      mockConnectedAccounts = mockConnectedAccounts.filter((a) => a.platform !== platform);
    }
  }

  /**
   * 投稿とその結果を削除
   */
  static async deletePost(id: string): Promise<{ success: boolean; post?: Post; results?: PostResult[] }> {
    const nowStr = new Date().toISOString();

    if (!isFirebaseConfigured() || !adminDb) {
      const postIndex = mockPosts.findIndex((p) => p.id === id);
      if (postIndex === -1) return { success: false };
      const [deletedPost] = mockPosts.splice(postIndex, 1);
      const deletedResults = mockPostResults.filter((r) => r.post_id === id);
      mockPostResults = mockPostResults.filter((r) => r.post_id !== id);
      return { success: true, post: deletedPost, results: deletedResults };
    }

    try {
      const docRef = adminDb.collection('posts').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return { success: false };

      const data = doc.data()!;
      const post: Post = {
        id: doc.id,
        title: data.title || null,
        base_text: data.base_text,
        instagram_text: data.instagram_text || null,
        facebook_text: data.facebook_text || null,
        google_business_text: data.google_business_text || null,
        link_url: data.link_url || null,
        image_url: data.image_url || null,
        created_at: data.created_at || nowStr,
        updated_at: data.updated_at || nowStr,
      };

      const results: PostResult[] = [];
      if (data.results) {
        Object.keys(data.results).forEach((platform) => {
          const res = data.results[platform];
          results.push({
            id: `${doc.id}_${platform}`,
            post_id: doc.id,
            platform: platform as any,
            status: res.status || 'pending',
            external_post_id: res.external_post_id || null,
            error_message: res.error_message || null,
            created_at: res.created_at || data.created_at || nowStr,
            updated_at: res.updated_at || data.updated_at || nowStr,
          });
        });
      }

      await docRef.delete();
      return { success: true, post, results };
    } catch (e) {
      console.warn('Firestore deletePost failed, falling back to mock DB:', e);
      if (isFirebaseConfigured() && adminDb) {
        throw e;
      }
      const postIndex = mockPosts.findIndex((p) => p.id === id);
      if (postIndex === -1) return { success: false };
      const [deletedPost] = mockPosts.splice(postIndex, 1);
      const deletedResults = mockPostResults.filter((r) => r.post_id === id);
      mockPostResults = mockPostResults.filter((r) => r.post_id !== id);
      return { success: true, post: deletedPost, results: deletedResults };
    }
  }
}
