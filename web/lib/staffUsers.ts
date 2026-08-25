// 사용자·권한(내부 직원) 등록 명단 — 발급인(코드 할당자) 선택 등에 사용
// DB 연결 시 staff_users 테이블로 승격
export type StaffUser = { id: string; name: string; role: "ADMIN" | "STAFF"; department?: string };

export const STAFF_USERS: StaffUser[] = [
  { id: "sj.kim@neolab.net", name: "김순정", role: "ADMIN", department: "서비스기획팀" },
];
