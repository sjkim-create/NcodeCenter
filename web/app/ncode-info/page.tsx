import { redirect } from "next/navigation";

// 코드 관리 정보 → 정보(탭 통합, /info)로 이동
export default function Page() {
  redirect("/info");
}
