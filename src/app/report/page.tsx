import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "集客・投稿成果レポート（共有用）",
  description: "社員向けに共有するレポート専用ページです。認証は不要です。",
};

export default function ReportPage() {
  // サーバーサイドで /analytics にリダイレクト
  redirect("/analytics");
  return null; // クライアント側は何も描画しません
}
