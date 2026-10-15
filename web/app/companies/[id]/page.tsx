import { CompanyFormView } from "@/components/CompaniesView";
export const metadata = { title: "고객사 상세 · 수정" };
// 고객사 id 를 경로로 받는다 — 목록에서 행을 누르면 들어온다.
// 가입 승인 직후에는 ?email= 로 SSO 이메일을 넘겨 계정 추가 칸에 미리 넣는다 `PC-133`
export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string; sec?: string }>;
}) {
  const { id } = await params;
  const { email, sec } = await searchParams;   // sec=acc — 등록 화면에서 계정과 함께 등록한 뒤 서비스 계정을 연다 `PC-142`
  return <CompanyFormView companyId={Number(id)} prefillEmail={email ?? ""} initialSec={sec ?? ""} />;
}
