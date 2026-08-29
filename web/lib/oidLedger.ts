"use client";

// OID 관리대장 — 업체 + index 로 보는 OID 이력 (코드 관리 정보 탭)
//
// OID = **index 만 갖는 코드**다. 외부 코드를 우리 펜으로 읽으려고 만든 방식이라,
// 우리 펜으로 OID 책을 찍으면 **코드 값이 1개만** 나온다. 총량이 **약 6만 개**뿐이라
// 책의 양이 많지 않으면 **book 으로 코드를 나누지 않는다**.
//
// 대장 관리 방식(기존 이력 기준)
//  - 업체 구분에는 S/O 를 써 왔다. (예: 한솔교육 S3/O25 — 분량이 적어 book 미분할)
//  - 분량이 늘어난 업체만 book 번호로 나눴고, 그 **book 번호가 곧 OID index** 로 보인다. (예: 웅진 B431~464)
//  → 그래서 이 대장은 **업체 + index** 로 모아 보고, 좌표(S/O·Book)는 함께 표시한다.
//    좌표 기준 조회는 SOBP 맵의 종류 필터 **[OID]** 로 한다 `PC-035`. (옛 IDS 표기 = OID 동일)

import data from "@/data/oid-data.json";

export type OidItem = { title: string; idx?: number; pages?: number; date?: string; cu?: string };
export type OidCompany = {
  company: string;          // 업체(고객사) — 대장의 관리 단위
  section: number;          // 기존 좌표 메모용
  owner: number;
  pen: string;              // S=소리펜 · W=필기펜
  indexBy: "book" | "none"; // book 번호로 index 관리 / 미분할(업체 단위)
  indexRange: [number, number] | null;
  count: number;
  sobpMemo: string;         // 기존 히스토리 좌표 메모 (관리 기준 아님)
  items: OidItem[];
};
type OidData = { total: number; companies: OidCompany[]; meta: { source: string; note: string } };

const OID = data as unknown as OidData;

export const OID_TOTAL = OID.total;                     // OID 코드 총량 (약 6만)
export const oidCompanies = (): OidCompany[] => OID.companies;
export const oidMeta = () => OID.meta;

// 사용 중인 index 개수 — book 으로 나눈 업체는 index 수, 미분할 업체는 1(업체 단위)로 센다.
export const usedIndexCount = (g: OidCompany) =>
  g.indexBy === "book" ? g.items.filter((i) => i.idx != null).length : 1;
export const totalUsedIndex = () => oidCompanies().reduce((n, g) => n + usedIndexCount(g), 0);

export const indexLabel = (g: OidCompany) =>
  g.indexBy === "book" && g.indexRange ? `${g.indexRange[0]}~${g.indexRange[1]}` : "미분할 (업체 단위)";
