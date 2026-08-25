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
      <body>
        <StyledRegistry>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </StyledRegistry>
      </body>
    </html>
  );
}
