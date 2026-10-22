import { CompaniesWorkspace } from "@/components/CompaniesWorkspace";

export const metadata = { title: "고객사 관리" };

// 고객사 관리 — 3단 한 화면(기본) · ?view=table 이면 기존 목록 표 `PC-204`
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <CompaniesWorkspace initialView={view === "table" ? "table" : "ws"} />;
}
