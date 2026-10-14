// 키 발급 고객사 표기 `PC-125`
// SOBP 맵은 **고객사 관리의 고객사**(서비스 사용 고객사)와 **티켓 고객사**(nkey(HLP) 대장 · 키 발급 대상)
// 두 명단을 함께 불러 할당한다. 이름이 같을 수 있으므로 티켓 고객사는 앞에 (K) 를 붙여 구분한다.
export const KEY_TAG = "(K)";
// 표기는 붙여 쓴다 — 예: (K)KODION `PC-127`
export const keyLabel = (name: string) => `${KEY_TAG}${name.trim()}`;
export const isKeyLabel = (s?: string) => (s ?? "").trim().startsWith(KEY_TAG);
export const keyNameOf = (s: string) => (isKeyLabel(s) ? s.trim().slice(KEY_TAG.length).trim() : s.trim());
/** 고객사 이름 비교용 — 공백·괄호 표기를 지우되 (K) 표시는 남겨, 같은 이름의 두 고객사를 다른 업체로 본다 */
export const custKey = (s?: string) =>
  (isKeyLabel(s) ? "k§" : "") + keyNameOf(s ?? "").replace(/\s+/g, "").replace(/\(.*\)/g, "").toLowerCase();
