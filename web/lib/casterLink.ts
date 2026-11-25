// casterN 연동 값 — 자동으로 채워지지만 직접 등록도 할 수 있다 `PC-361`
// - 직접 넣은 칸은 `man` 에 칸 이름을 남긴다(화면에 「직접」 표시).
// - casterN 에서 자동 값이 들어오면 **자동 값이 우선**한다 — 직접 넣은 값을 덮어쓰고 그 칸의 「직접」 표시를 지운다.
// - 교재(기본 코드) 행과 확장 코드 기록(ExtSlot)이 같은 칸 이름을 쓴다.

export type CnKey = "pj" | "f" | "bytes" | "nmod" | "src" | "d";
export type CnValues = { pj?: string; f?: string; bytes?: number; nmod?: string; src?: string; d?: string; man?: CnKey[] };

export const CN_FIELDS: { key: CnKey; label: string; span: number; type: "text" | "number" | "date" | "src"; mono?: boolean }[] = [
  // 프로젝트명(.nproj) 입력란은 두지 않는다 `PC-369` — casterN 에서 들어온 값(pj)은 데이터에 그대로 남는다
  { key: "f", label: "ncp2 파일명", span: 2, type: "text", mono: true },
  { key: "bytes", label: "ncp2 파일 크기 (byte)", span: 1, type: "number", mono: true },
  { key: "nmod", label: "ncp2 최종수정 (완료 필수)", span: 1, type: "date", mono: true },
  { key: "src", label: "편집 유형", span: 1, type: "src" },
  { key: "d", label: "최초 등록일", span: 1, type: "date", mono: true },
];
/** 편집 유형 — 유입 경로 `PC-284` */
export const CN_SOURCES = ["casterN 마스터 계정", "Resource Studio"];

/** 직접 입력 — 값을 넣고 그 칸을 「직접」으로 표시한다 */
export function setManual<T extends CnValues>(v: T, key: CnKey, value: string | number | undefined): T {
  const man = new Set(v.man ?? []);
  man.add(key);
  return { ...v, [key]: value, man: [...man] };
}

/** 자동 연동 — 들어온 칸은 **자동 값이 우선**(직접 넣은 값을 덮어쓰고 「직접」 표시를 지운다) */
export function applyAutoLink<T extends CnValues>(v: T, incoming: Partial<Record<CnKey, string | number>>): T {
  const keys = Object.keys(incoming) as CnKey[];
  const man = (v.man ?? []).filter((k) => !keys.includes(k));
  return { ...v, ...incoming, man: man.length ? man : undefined };
}
