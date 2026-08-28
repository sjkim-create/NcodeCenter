import { redirect } from "next/navigation";
// 티켓 발급은 사이드바 [티켓 발급] 그룹의 3개 화면으로 나뉜다 → 첫 화면(계정 발급)으로 보낸다.
export default function Page() {
  redirect("/tickets/account");
}
