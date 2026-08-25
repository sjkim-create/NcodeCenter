import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import AuthProvider from "@/components/AuthProvider";
import StyledRegistry from "@/components/StyledRegistry";

export const metadata: Metadata = {
  title: {
    default: "NcodeCenter | Ncode 자동관리",
    template: "%s | NcodeCenter",
  },
  description: "Ncode 자동관리 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      {/* suppressHydrationWarning — 브라우저 확장(ColorZilla 등)이 <body>에 속성을 주입해
          서버/클라이언트 HTML이 달라지는 것을 무시한다. 앱 코드와 무관한 경고. */}
      <body suppressHydrationWarning>
        <StyledRegistry>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </StyledRegistry>
      </body>
    </html>
  );
}
