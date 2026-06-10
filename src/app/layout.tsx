import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "ZERO Sync | SNS・Googleビジネスプロフィール同時投稿",
  description: "Instagram、Facebook、Googleビジネスプロフィールに1つの管理画面から同時に投稿できる都城ドライビングスクール専用の同時投稿管理ツールです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}

