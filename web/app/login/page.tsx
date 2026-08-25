import { Suspense } from "react";
import LoginView from "@/components/LoginView";

export const metadata = { title: "로그인" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginView />
    </Suspense>
  );
}
