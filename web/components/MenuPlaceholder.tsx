export default function MenuPlaceholder({
  title, desc, features, note,
}: {
  title: string;
  desc: string;
  features: string[];
  note?: string;
}) {
  return (
    <div style={{ padding: "22px", maxWidth: 900 }}>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "22px 24px" }}>
        <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "#5f8ff0", background: "#e8f3ff", borderRadius: 6, padding: "3px 9px" }}>
          구성 예정 (스펙 확정됨)
        </div>
        <h1 style={{ fontSize: 20, margin: "12px 0 4px" }}>{title}</h1>
        <p style={{ color: "#6b7280", fontSize: 14, marginTop: 0 }}>{desc}</p>

        <div style={{ fontSize: 12, color: "#9ca3af", margin: "18px 0 8px", fontWeight: 600 }}>주요 기능</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#374151", fontSize: 14, lineHeight: 1.9 }}>
          {features.map((f, i) => <li key={i}>{f}</li>)}
        </ul>

        {note && (
          <div style={{ marginTop: 18, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12.5, color: "#92400e" }}>
            {note}
          </div>
        )}
      </div>
    </div>
  );
}
