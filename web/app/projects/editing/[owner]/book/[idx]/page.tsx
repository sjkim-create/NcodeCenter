import { Suspense } from "react";
import EditingDetailView from "@/components/EditingDetailView";
export const metadata = { title: "교재(책) 편집" };
// idx = "new"(교재 추가) 또는 rows 인덱스(교재 수정). 모달이 아니라 별도 페이지다.
export default async function Page({ params }: { params: Promise<{ owner: string; idx: string }> }) {
  const { owner, idx } = await params;
  return (
    <Suspense>
      <EditingDetailView owner={decodeURIComponent(owner)} bookIdx={idx} />
    </Suspense>
  );
}
