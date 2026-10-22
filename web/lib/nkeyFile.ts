// N Key 발급 정책 · .nkey 파일 형식 `PC-219`
//
// 발급 정책
//   - 새로 발급하는 Code Type 은 PDS2 · PDS3 만(OID · PDS4 는 생성 불가 — 옛 발급분의 값은 그대로 보인다)
//   - 프로필 · 코드 타입마다 쓸 수 있는 Section 이 정해져 있다(NKEY_SECTIONS)
//   - Book 볼륨이 2 이상인데 Book 의 전체 페이지가 아니라 일부 페이지만 발급하려면 Separate Each Book 이 켜져 있어야 한다
//
// .nkey 파일 — JSON 이 아니라 한 줄에 「Key=Value」 인 텍스트(앞의 # 줄은 설명).
//   Separate Each Book 이 켜져 있고 Book 볼륨이 2 이상이면 Book 마다 .nkey 를 만들어 .zip 하나로 받는다. 그 밖에는 .nkey 1개.
export type NkeyProfile = "LEGACY" | "HYBRID";
export type NkeyType = "PDS2" | "PDS3";

/** 새로 발급할 수 있는 Code Type */
export const NKEY_TYPES: NkeyType[] = ["PDS2", "PDS3"];

/** 프로필 · 코드 타입별 사용 가능한 Section */
export const NKEY_SECTIONS: Record<NkeyProfile, Record<NkeyType, number[]>> = {
  LEGACY: { PDS2: [0, 1, 2, 3, 14], PDS3: [0, 3, 14] },
  HYBRID: { PDS2: [0, 3, 14], PDS3: [0, 3, 5, 10, 11, 14, 15] },
};
export const sectionsFor = (p: NkeyProfile, t: string): number[] =>
  (NKEY_TYPES as string[]).includes(t) ? NKEY_SECTIONS[p][t as NkeyType] : [];

/** .nkey 본문 — 「Key=Value」 텍스트 */
export function toNkey(fields: Record<string, string | number | boolean | string[]>): string {
  const lines = Object.entries(fields).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(",") : String(v)}`);
  return ["# NcodeCenter N Key ticket", ...lines, ""].join("\n");
}

/** .nkey 파싱 — 「Key=Value」 줄. # 줄 · 빈 줄은 건너뛴다. 형식이 아니면 null */
export function parseNkey(text: string): { k: string; v: string }[] | null {
  const rows: { k: string; v: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) return null;
    rows.push({ k: line.slice(0, i).trim(), v: line.slice(i + 1).trim() });
  }
  return rows.length ? rows : null;
}

// ── Section 별 프로필 · 코드 타입 활성 `PC-221`
//   표에 있는 Section 이면 그 Section 을 쓸 수 있는 프로필 · 타입만 켠다(예: S10 → HYBRID · PDS3 만).
//   표에 없는 Section 은 모두 켠다.
const KNOWN_SECTIONS = new Set(Object.values(NKEY_SECTIONS).flatMap((m) => Object.values(m).flat()));
export const isKnownSection = (s: number) => KNOWN_SECTIONS.has(s);
export const secOk = (p: NkeyProfile, t: string, s: number) =>
  (NKEY_TYPES as string[]).includes(t) && (!KNOWN_SECTIONS.has(s) || NKEY_SECTIONS[p][t as NkeyType].includes(s));
/** 이 Section 에서 프로필이 쓸 수 있는가(어느 타입이든) */
export const profileOk = (p: NkeyProfile, s: number) => NKEY_TYPES.some((t) => secOk(p, t, s));

// ── 파일명 `PC-221` — Ticket_{고객사}[_{사용고객사}]_{S}s_{O}o_{B}b_{P}p_{Page 볼륨}.nkey
//   Book 이 여러 권이면 B 자리에 {시작}-{끝} (zip 이름) · zip 안 개별 파일은 Book 하나씩
export function nkeyName(o: { co: string; cu?: string; section: number | string; owner: number | string; book: number | string; pageStart: number | string; pageVolume: number | string }, ext: "nkey" | "zip" = "nkey") {
  const safe = (x: string) => x.replace(/[\/:*?"<>|]/g, "_");
  return `Ticket_${safe(o.co)}${o.cu ? `_${safe(o.cu)}` : ""}_${o.section}s_${o.owner}o_${o.book}b_${o.pageStart}p_${o.pageVolume}.${ext}`;
}

// ── Key 정보(화면 항목) → .nkey 항목 · 내려받기 `PC-221`
//   발급할 때와 [키 다운로드](발급 기록에서 다시 받기)가 같은 함수를 쓴다.
type Params = Record<string, string | number>;
const num = (v: unknown, d = 0) => { const n = Number(String(v ?? "").replace(/[^\d-]/g, "")); return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : d; };
const yes = (v: unknown) => /^Y/i.test(String(v ?? ""));
export function nkeyFieldsOf(p: Params): Record<string, string | number | boolean | string[]> {
  const ct = String(p["Code Type"] ?? "");
  const patternType = ct === "PDS3" ? "Ncode_PDS3" : ct === "PDS2" ? "Ncode_PDS2" : ct === "PDS4" ? "Scode" : ct;
  const profile = String(p["Profile"] ?? "").split(" ")[0];
  const perms = String(p["CasterN Permissions"] ?? "").split(",").map((x) => x.trim()).filter((x) => x && x !== "-");
  return {
    companyName: String(p["Company Name"] ?? ""),
    issuedTime: String(p["Issued Time"] ?? ""),
    validUntilTime: String(p["Valid Until Time"] ?? "99999999").split(" ")[0],
    ...(p["Used Customer"] && p["Used Customer"] !== "-" ? { usedCustomer: String(p["Used Customer"]) } : {}),
    section: num(p["Section"]), owner: num(p["Owner"]), ticketVersion: num(p["Ticket Version"], 1),
    bookStart: num(p["Book Start"]), bookVolume: num(p["Book Volume"], 1),
    pageStart: num(p["Page Start"]), pageVolume: num(p["Page Volume"], 1),
    patternType, ticketType: String(p["Ticket Type"] ?? "Unlimited"), separateEachBook: yes(p["Separate Each Book"]),
    ...(profile ? { profile, codeReuse: yes(p["Code Reuse"]) } : {}),
    ...(profile === "HYBRID" ? { permissions: perms } : {}),
  };
}
/** Key 정보 → 내려받을 파일명(.nkey 또는 .zip) — 겹침 안내 등에서 티켓을 파일명으로 가리킬 때 `PC-225` */
export function nkeyFileNameOf(p: Params): string {
  const f = nkeyFieldsOf(p);
  const bs = f.bookStart as number, books = Math.max(1, f.bookVolume as number);
  const base = { co: String(f.companyName), cu: f.usedCustomer as string | undefined, section: f.section as number, owner: f.owner as number,
    pageStart: f.pageStart as number, pageVolume: f.pageVolume as number };
  const book = books === 1 ? bs : `${bs}-${bs + books - 1}`;
  return nkeyName({ ...base, book }, !!f.separateEachBook && books >= 2 ? "zip" : "nkey");
}
/** Key 정보로 .nkey 를 내려받는다 — Separate Each Book + Book 볼륨 2 이상이면 Book 마다 .nkey 를 .zip 하나로. 내려받은 파일명을 돌려준다 */
export function downloadNkey(p: Params, makeZip: (e: { name: string; content: string }[]) => Blob): string {
  const f = nkeyFieldsOf(p);
  const bs = f.bookStart as number, books = Math.max(1, f.bookVolume as number);
  const base = { co: String(f.companyName), cu: f.usedCustomer as string | undefined, section: f.section as number, owner: f.owner as number,
    pageStart: f.pageStart as number, pageVolume: f.pageVolume as number };
  const asZip = !!f.separateEachBook && books >= 2;
  const fileName = asZip ? nkeyName({ ...base, book: `${bs}-${bs + books - 1}` }, "zip") : nkeyName({ ...base, book: books === 1 ? bs : `${bs}-${bs + books - 1}` });
  const blob = asZip
    ? makeZip(Array.from({ length: books }, (_, i) => ({ name: nkeyName({ ...base, book: bs + i }), content: toNkey({ ...f, bookStart: bs + i, bookVolume: 1 }) })))
    : new Blob([toNkey(f)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
