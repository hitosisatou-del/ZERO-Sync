import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const clientId = process.env.TWITTER_CLIENT_ID;
  
  const host = request.headers.get('host') || 'zero-sync-delta.vercel.app';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/callback/twitter`;

  if (!clientId) {
    return NextResponse.json(
      { error: 'X (Twitter) OAuth credentials are not configured.' },
      { status: 500 }
    );
  }

  // X (Twitter) API v2 scopes: tweet.read, tweet.write, users.read, offline.access
  const scope = 'tweet.read tweet.write users.read offline.access';
  const state = 'twitter_state_zero_sync';
  
  // PKCE values
  const verifier = 'twitter_oauth_verifier_key_string_for_zero_sync_exactly_64_chars_long';
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  const authUrl = `https://twitter.com/i/oauth2/authorize?` + 
    `response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}` +
    `&code_challenge=${challenge}` +
    `&code_challenge_method=s256`;

  return NextResponse.redirect(authUrl);
}
