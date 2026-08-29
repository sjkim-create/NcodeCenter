import { Suspense } from "react";
import { TicketDetailView } from "@/components/TicketsView";
export const metadata = { title: "발급 상세 · 수정" };
// 발급 id 를 경로로 받는다 — Key 관리 목록의 발급번호·발급내용에서 링크한다.
// 목록의 [정산] 은 ?tab=bill 로 들어온다 → useSearchParams 때문에 Suspense 로 감싼다.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <TicketDetailView ticketId={Number(id)} />
    </Suspense>
  );
}
