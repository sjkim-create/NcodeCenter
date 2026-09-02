"use client";

// 사용 서비스별 고객사 — **고객사 관리에서 지정한 사용 서비스** 가 기준이다 `PC-076`
//   (이전에는 SOBP 맵의 좌표별 지정을 썼다 `PC-057` — 좌표에 붙어 있어 실제 고객사와 어긋났다)
//   · casterN  → 편집 프로젝트(편집 고객사 추가 후보)
//   · 폼솔루션  → 폼솔루션 서비스 관리
//   · 아무것도 고르지 않음 → SDK 연동(코드만 할당) · 서비스 화면 없음

import { companyUsesService, companyServices, type Company, type Project, type ServiceType } from "./customerData";

export type ServiceCustomer = {
  company: Company;
  projects: Project[];
  sobp: { k: string; s: number; o: number }[];   // 그 고객사가 가진 좌표
};

export function customersOfService(
  service: ServiceType,
  companies: Company[],
  projects: Project[],
): ServiceCustomer[] {
  const byCo = new Map<number, Project[]>();
  for (const p of projects) byCo.set(p.companyId, [...(byCo.get(p.companyId) ?? []), p]);
  const out: ServiceCustomer[] = [];
  for (const company of companies) {
    if (!companyUsesService(company, service)) continue;
    const ps = byCo.get(company.id) ?? [];
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

// 그 고객사의 사용 서비스 — 계정 등록의 **인증 서비스** 자동 체크에 쓴다 `PC-076`
export function servicesOfCompany(companyId: number, companies: Company[]): ServiceType[] {
  return companyServices(companies.find((c) => c.id === companyId));
}
