import { Suspense } from "react";
import { AccountNewView } from "@/components/AccountsView";
export const metadata = { title: "계정 및 App Key 등록" };
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AccountNewView />
    </Suspense>
  );
}
