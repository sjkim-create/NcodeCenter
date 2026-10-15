import { Suspense } from "react";
import TicketsView from "@/components/TicketsView";
export const metadata = { title: "N Key 관리" };
// N Key 관리 = 「N Key 고객사 | 발급 티켓 | 발급 상세·정산」 3단 한 화면 `PC-149`.
// ?co= 고객사 · ?t= 발급 id(&tab=bill) · ?new=1 발급 폼 — useSearchParams 때문에 Suspense 로 감싼다.
export default function Page() {
  return (
    <Suspense>
      <TicketsView tab="list" />
    </Suspense>
  );
}
