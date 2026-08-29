import { redirect } from "next/navigation";

// 코드 관리 정보/발급 구조 → 탭 통합(/info)
export default function Page() {
  redirect("/info");
}
