import { CompanyFormView } from "@/components/CompaniesView";
export const metadata = { title: "고객사 등록" };
// 목록(/companies)의 [＋ 고객사 등록]으로 들어오는 등록 화면
export default function Page() {
  return <CompanyFormView companyId={0} />;
}
