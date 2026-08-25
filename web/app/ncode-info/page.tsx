import { redirect } from "next/navigation";

// Ncode 정보 → 정보(탭 통합, /info)로 이동
export default function Page() {
  redirect("/info");
}
