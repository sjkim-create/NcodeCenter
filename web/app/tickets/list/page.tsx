import { redirect } from "next/navigation";
// 옛 "Key 발급 정산" 화면 — N Key 발급 목록으로 합쳐졌다. 기존 링크·북마크 보존용.
export default function Page() {
  redirect("/tickets/nkey");
}
