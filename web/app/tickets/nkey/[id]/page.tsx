import { redirect } from "next/navigation";
// 발급 상세 · 정산은 N Key 관리 3단 화면의 오른쪽 칸에서 연다 `PC-149` — 옛 링크(?tab=bill 포함)는 그대로 넘긴다
export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  redirect(`/tickets/nkey?t=${encodeURIComponent(id)}${tab === "bill" ? "&tab=bill" : ""}`);
}
