import TicketsView from "@/components/TicketsView";
export const metadata = { title: "Key 관리 (N Key 발급)" };
// Key 관리 메뉴 = 발급·정산 목록. N Key 는 [＋ N Key 발급] → /tickets/nkey/new 에서,
// App Key 는 계정 발급 화면(CasterN 탭)에서 발급되며 둘 다 이 목록에 쌓인다.
export default function Page() {
  return <TicketsView tab="list" />;
}
