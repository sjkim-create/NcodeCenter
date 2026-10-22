import { CompaniesWorkspace } from "@/components/CompaniesWorkspace";
export const metadata = { title: "고객사 등록" };
// [＋ 고객사 등록] — 3단 화면에서 새 고객사 입력 `PC-204`
export default function Page() {
  return <CompaniesWorkspace isNew />;
}
