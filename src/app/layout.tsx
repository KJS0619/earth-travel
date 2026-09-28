import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Earth Travel - 크루즈 항로 & 가본 나라 깃발 여권",
  description: "세계 크루즈 항로 트래커와 가본 나라 깃발 여권을 관리하는 인터랙티브 지도 앱",
  keywords: ["크루즈", "여행", "지도", "Leaflet", "세계여행", "cruise", "travel", "passport"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-slate-950">{children}</body>
    </html>
  );
}
