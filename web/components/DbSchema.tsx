import { TABLES, RELATIONS, GROUPS, type Table } from "@/lib/dbSchema";

export default function DbSchema() {
  return (
    <div style={{ padding: "18px 20px", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 18, margin: 0 }}>NcodeCenter — DB 구조</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
        `docs/NcodeCenter-DB.md` 기준. 도메인 계층{" "}
        <b>업체(customers) ─&lt; Owner(프로젝트) ─&lt; Book(상품) ─&lt; Page</b> · 코드 상태{" "}
        <b>할당됨 / 미발급</b> (예약 개념 폐기).
      </p>

      {/* 도메인 계층 하이라이트 */}
      <div style={S.hier}>
        {[
          ["업체", "customers", "ACCOUNT"],
          ["Owner", "allocations.owner", "프로젝트/제품라인"],
          ["Book", "allocations.book", "상품/교재 · 제품(PDS2/3)"],
          ["Page", "allocations.page", "페이지"],
        ].map(([k, t, d], i, arr) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={S.hierBox}>
              <div style={{ fontWeight: 700 }}>{k}</div>
              <code style={{ fontSize: 11 }}>{t}</code>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{d}</div>
            </div>
            {i < arr.length - 1 && <span style={{ color: "#9ca3af", fontSize: 18 }}>▸</span>}
          </div>
        ))}
      </div>

      {GROUPS.map((g) => (
        <section key={g} style={{ marginTop: 20 }}>
          <h2 style={S.groupH}>{g}</h2>
          <div style={S.grid}>
            {TABLES.filter((t) => t.group === g).map((t) => (
              <TableCard key={t.name} t={t} />
            ))}
          </div>
        </section>
      ))}

      <section style={{ marginTop: 22 }}>
        <h2 style={S.groupH}>관계 (FK)</h2>
        <ul style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.8, columns: 2 }}>
          {RELATIONS.map((r, i) => (
            <li key={i}>
              <code>{r.from}</code> → <code>{r.to}</code>
              {r.note ? <span style={{ color: "#9ca3af" }}> ({r.note})</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TableCard({ t }: { t: Table }) {
  const highlight = t.name === "allocations";
  return (
    <div style={{ ...S.card, ...(highlight ? S.cardHi : {}) }}>
      <div style={S.cardHead}>
        <code style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</code>
        <span style={{ fontSize: 11, color: "#6b7280" }}>{t.label}</span>
      </div>
      {t.note && <div style={{ fontSize: 11, color: "#6b7280", padding: "0 10px 6px" }}>{t.note}</div>}
      <table style={S.tbl}>
        <tbody>
          {t.columns.map((c) => (
            <tr key={c.name}>
              <td style={S.kcell}>
                {c.key === "PK" && <span style={{ ...S.badge, background: "#fde68a", color: "#92400e" }}>PK</span>}
                {c.key === "FK" && <span style={{ ...S.badge, background: "#bfdbfe", color: "#1e40af" }}>FK</span>}
              </td>
              <td style={S.ncell}><code>{c.name}</code></td>
              <td style={S.tcell}>{c.type}</td>
              <td style={S.notecell}>{c.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  hier: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12, padding: 12, background: "#fff", border: "1px solid #e2e5ea", borderRadius: 10 },
  hierBox: { background: "#f8fafc", border: "1px solid #e2e5ea", borderRadius: 8, padding: "8px 12px", minWidth: 120 },
  groupH: { fontSize: 13, color: "#6b7280", margin: "0 0 10px", borderBottom: "1px solid #e2e5ea", paddingBottom: 6 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, alignItems: "start" },
  card: { background: "#fff", border: "1px solid #e2e5ea", borderRadius: 10, overflow: "hidden" },
  cardHi: { border: "2px solid #2563eb", boxShadow: "0 0 0 3px rgba(37,99,235,.08)" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "9px 10px", background: "#f8fafc", borderBottom: "1px solid #e2e5ea" },
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  kcell: { width: 26, padding: "3px 4px", textAlign: "center", verticalAlign: "top" },
  ncell: { padding: "3px 4px", whiteSpace: "nowrap" },
  tcell: { padding: "3px 6px", color: "#6b7280", whiteSpace: "nowrap" },
  notecell: { padding: "3px 6px", color: "#9ca3af", fontSize: 11 },
  badge: { fontSize: 9, fontWeight: 700, borderRadius: 3, padding: "1px 3px" },
};
