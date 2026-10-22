// 개발팀 Caster 대장에서 **제외하는 시트(고객사)** `PC-205`
//   대장에 자료 기록만 있고 실제 App Key 를 발급하지 않은 곳 — NcodeCenter 에서는 보이지 않게 한다.
//   이 대장 때문에만 생긴 고객사(casterLedger)도 고객사 관리에서 함께 뺀다.
//   db/import/build_caster_ledger.py 의 EXCLUDE_SHEETS · build_all_sources.py 의 _CASTER_EXCLUDE 와 같아야 한다.
export const CASTER_EXCLUDED = ["영신사"];

const nz = (s?: string) => (s ?? "").replace(/\s+/g, "").toLowerCase();
export const isCasterExcluded = (company?: string) => CASTER_EXCLUDED.some((x) => nz(x) === nz(company));
