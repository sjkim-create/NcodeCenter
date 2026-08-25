// 편집 프로젝트에서 사용자가 추가한 고객사(엑셀 시드에 없는) — localStorage 보관
export type EditCustomer = { customer: string; owner: string; codeKinds: string[] };

const KEY = "ncc-edit-customers-v1";

export function loadCustomCustomers(): EditCustomer[] {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as EditCustomer[]) : []; }
  catch { return []; }
}
export function saveCustomCustomers(list: EditCustomer[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* */ }
}
