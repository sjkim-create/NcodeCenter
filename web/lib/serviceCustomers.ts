"use client";

// 사용 서비스별 고객사 — SOBP 맵(직접 코드 할당)에서 지정한 **사용 서비스** 가 기준이다 `PC-057`
//   · casterN  → 편집 프로젝트(편집 고객사 추가 후보)
//   · 폼솔루션  → 폼솔루션 서비스 관리
//   · SDK 연동 → 코드만 할당(서비스 화면 없음)
// 한 좌표에 서비스를 여러 개 지정할 수 있으므로(`PC-049`) 고객사는 여러 서비스에 걸릴 수 있다.

import { usesService, type Company, type Project, type ServiceType } from "./customerData";

export type ServiceCustomer = {
  company: Company;
  projects: Project[];
  sobp: { k: string; s: number; o: number }[];   // 그 서비스로 지정된 좌표
};

export function customersOfService(
  service: ServiceType,
  companies: Company[],
  projects: Project[],
): ServiceCustomer[] {
  const byCo = new Map<number, Project[]>();
  for (const p of projects) {
    if (!usesService(p, service)) continue;
    byCo.set(p.companyId, [...(byCo.get(p.companyId) ?? []), p]);
  }
  const out: ServiceCustomer[] = [];
  for (const [companyId, ps] of byCo) {
    const company = companies.find((c) => c.id === companyId);
    if (!company) continue;
    const seen = new Set<string>();
    const sobp: { k: string; s: number; o: number }[] = [];
    for (const p of ps) {
      for (const b of p.issued) {
        const key = `${b.kind ?? ""}/${b.section}/${b.owner}`;
        if (seen.has(key)) continue;
        seen.add(key);
        sobp.push({ k: b.kind ?? "", s: b.section, o: b.owner });
      }
    }
    sobp.sort((a, b) => a.s - b.s || a.o - b.o);
    out.push({ company, projects: ps, sobp });
  }
  return out.sort((a, b) => a.company.name.localeCompare(b.company.name, "ko"));
}

// 그 고객사가 SOBP 맵에서 지정받은 사용 서비스 목록 — 계정 등록의 사용처 자동 체크에 쓴다 `PC-057`
export function servicesOfCompany(companyId: number, projects: Project[]): ServiceType[] {
  const set = new Set<ServiceType>();
  for (const p of projects) {
    if (p.companyId !== companyId) continue;
    (p.services && p.services.length ? p.services : [p.service]).forEach((v) => set.add(v));
  }
  return [...set];
}
