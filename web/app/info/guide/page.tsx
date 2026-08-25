import { redirect } from "next/navigation";

// 알아야 할 사항 → 탭 통합(/info)
export default function Page() {
  redirect("/info");
}
