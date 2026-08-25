import { redirect } from "next/navigation";

// 업체/프로젝트 등록 → 고객사 관리 / 프로젝트 관리로 분리됨
export default function Page() {
  redirect("/projects");
}
