import { redirect } from "next/navigation";

// 「DB 구조」 화면은 없앴다 — 옛 주소는 동작 흐름으로 `PC-239`
export default function DbPage() {
  redirect("/flow");
}
