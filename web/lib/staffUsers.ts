// 사용자·권한(내부 직원) 등록 명단 — 발급인(코드 할당자) 선택 등에 사용
// DB 연결 시 staff_users 테이블로 승격
export type StaffUser = { id: string; name: string; role: "ADMIN" | "STAFF"; department?: string };

export const STAFF_USERS: StaffUser[] = [
  { id: "sj.kim@neolab.net", name: "김순정", role: "ADMIN", department: "서비스기획팀" },
  // 시험용 직원(STAFF) — nkey(HLP) 대장의 담당자 이름. 이메일은 예시라 실제 계정으로 바꿔야 한다 `PC-297`
  { id: "staff.choi@neolab.net", name: "최승혁", role: "STAFF", department: "-" },
  { id: "staff.hwanghj@neolab.net", name: "황효정", role: "STAFF", department: "-" },
  { id: "staff.hwanglp@neolab.net", name: "황락평", role: "STAFF", department: "-" },
  { id: "staff.kimde@neolab.net", name: "김다은", role: "STAFF", department: "-" },
];
