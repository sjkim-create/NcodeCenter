import { CompanyFormView } from "@/components/CompaniesView";
export const metadata = { title: "고객사 상세 · 수정" };
// 고객사 id 를 경로로 받는다 — 목록에서 행을 누르면 들어온다.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CompanyFormView companyId={Number(id)} />;
}
