import { Suspense } from "react";
import { AppKeyWorkspace } from "@/components/AppKeyWorkspace";
export const metadata = { title: "App Key 관리 (계정 발급)" };
// 「티켓 고객사 | 키 발급 계정 | 계정 상세」 3단 `PC-146` — ?co= 고객사 · ?acc= 계정 · ?add=1 계정 추가
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AppKeyWorkspace />
    </Suspense>
  );
}
