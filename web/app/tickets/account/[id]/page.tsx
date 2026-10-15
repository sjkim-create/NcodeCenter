import { redirect } from "next/navigation";
// 계정 상세는 App Key 관리 3단 화면의 오른쪽 칸으로 옮겼다 `PC-146` — 옛 링크·북마크 보존용
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/tickets/account?acc=${encodeURIComponent(decodeURIComponent(id))}`);
}
