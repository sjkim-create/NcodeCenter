import { redirect } from "next/navigation";
// 계정 등록은 App Key 관리 3단 화면의 오른쪽 칸으로 옮겼다 `PC-146`
export default function Page() {
  redirect("/tickets/account?add=1");
}
