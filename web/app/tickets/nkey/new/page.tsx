import { redirect } from "next/navigation";
// N Key 발급은 N Key 관리 3단 화면의 오른쪽 칸에서 한다 `PC-149`
export default function Page() {
  redirect("/tickets/nkey?new=1");
}
