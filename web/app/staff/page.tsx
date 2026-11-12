import UsersView from "@/components/UsersView";

export const metadata = { title: "직원 계정" };

// MEM-03 직원 계정 — ADMIN 전용 `PC-297`
export default function Page() {
  return <UsersView />;
}
