import { Suspense } from "react";
import EditingProjectsView from "@/components/EditingProjectsView";

export const metadata = { title: "편집 프로젝트" };

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "#9ca3af" }}>불러오는 중…</div>}>
      <EditingProjectsView />
    </Suspense>
  );
}
