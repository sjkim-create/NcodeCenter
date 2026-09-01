import { Suspense } from "react";
import { AccountDetailView } from "@/components/AccountsView";
export const metadata = { title: "계정 상세" };
// 계정 ID(email)를 경로로 받는다 — 목록/등록에서 encodeURIComponent 로 링크한다.
// ?tab=svc|key 로 첫 탭을 지정한다 `PC-067`
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <AccountDetailView accountId={decodeURIComponent(id)} />
    </Suspense>
  );
}
