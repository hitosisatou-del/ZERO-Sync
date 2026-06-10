-- pgcrypto拡張機能の有効化（暗号化用）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========================================================
-- 1. posts テーブル
-- ========================================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    base_text TEXT NOT NULL,
    instagram_text TEXT,
    facebook_text TEXT,
    google_business_text TEXT,
    link_url TEXT,
    image_url TEXT, -- Supabase Storage上のURL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 2. post_results テーブル
-- ========================================================
CREATE TABLE IF NOT EXISTS post_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'instagram' | 'facebook' | 'google_business_profile'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'success' | 'failed'
    external_post_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_post_platform UNIQUE (post_id, platform)
);

-- ========================================================
-- 3. connected_accounts テーブル
-- ========================================================
CREATE TABLE IF NOT EXISTS connected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL UNIQUE, -- 'instagram' | 'facebook' | 'google_business_profile'
    account_name VARCHAR(255),
    external_account_id VARCHAR(255),
    access_token TEXT NOT NULL,          -- 暗号化されたアクセストークン
    refresh_token TEXT,                 -- 暗号化されたリフレッシュトークン
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- 4. トリガーによる updated_at 自動更新の設定
-- ========================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_posts_modtime ON posts;
CREATE TRIGGER update_posts_modtime BEFORE UPDATE ON posts FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_post_results_modtime ON post_results;
CREATE TRIGGER update_post_results_modtime BEFORE UPDATE ON post_results FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_connected_accounts_modtime ON connected_accounts;
CREATE TRIGGER update_connected_accounts_modtime BEFORE UPDATE ON connected_accounts FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ========================================================
-- 5. RLS (Row Level Security) の設定
-- ========================================================
-- 全テーブルのRLSを有効化
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザー（ログイン中の管理者）のみ全操作を許可するポリシー
DROP POLICY IF EXISTS "Allow authenticated users full access on posts" ON posts;
CREATE POLICY "Allow authenticated users full access on posts" 
ON posts FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users full access on post_results" ON post_results;
CREATE POLICY "Allow authenticated users full access on post_results" 
ON post_results FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users full access on connected_accounts" ON connected_accounts;
CREATE POLICY "Allow authenticated users full access on connected_accounts" 
ON connected_accounts FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
