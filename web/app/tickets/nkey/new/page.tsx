import TicketsView from "@/components/TicketsView";
export const metadata = { title: "N Key 생성" };
// 목록(/tickets/nkey)의 [＋ N Key 발급]으로 들어오는 등록 화면
export default function Page() {
  return <TicketsView tab="nkey" />;
}
