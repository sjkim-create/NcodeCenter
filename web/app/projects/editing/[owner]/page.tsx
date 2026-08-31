import { Suspense } from "react";
import EditingDetailView from "@/components/EditingDetailView";

export const metadata = { title: "편집 프로젝트 상세" };

// ?c={고객사명} 로 고객사를 식별한다(같은 owner 를 여러 고객사가 쓸 수 있음) `PC-045`
export default function Page() {
  return (
    <Suspense>
      <EditingDetailView />
    </Suspense>
  );
}
