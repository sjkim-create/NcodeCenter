"use client";

// Next.js App Router용 styled-components SSR 레지스트리 + NEO UI 테마 주입.
// styled-components 는 SSR 시 서버에서 모은 스타일을 <head>에 삽입해야 하이드레이션이 깨지지 않는다.
import { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { ServerStyleSheet, StyleSheetManager } from "styled-components";
import { NeoThemeProvider } from "@neolab/neoui";
import { lightTheme } from "@/shared/config/light-theme";

export default function StyledRegistry({ children }: { children: React.ReactNode }) {
  const [sheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement();
    sheet.instance.clearTag();
    return <>{styles}</>;
  });

  const app = <NeoThemeProvider theme={lightTheme} mode="light">{children}</NeoThemeProvider>;

  // 클라이언트에서는 레지스트리 없이 그대로 (스타일은 이미 head에 있음)
  if (typeof window !== "undefined") return app;
  return <StyleSheetManager sheet={sheet.instance}>{app}</StyleSheetManager>;
}
