"use client";

import React, { useEffect, useRef } from "react";

export const BLUE = "#5f8ff0";

// 내용 길이에 따라 높이가 늘어나는 입력창 (스크롤 대신). Enter=제출, Shift+Enter=줄바꿈
export function AutoTextarea({ value, onChange, onSubmit, placeholder, style }: {
  value: string; onChange: (v: string) => void; onSubmit?: () => void; placeholder?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref} rows={1} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit?.(); } }}
      style={{ ...S.input, resize: "none", overflow: "hidden", lineHeight: 1.5, minHeight: 36, ...style }}
    />
  );
}

export function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ fontSize: 11, color: "#6b7280" }}>{label}</label>
      {children}
    </div>
  );
}

export function Modal({ title, wide, width, onClose, children }: { title: string; wide?: boolean; width?: number; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: width ?? (wide ? 660 : 460) }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
          <button onClick={onClose} style={{ ...S.linkBtn, fontSize: 16 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const S: Record<string, React.CSSProperties> = {
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 },
  primary: { background: BLUE, color: "#fff", border: 0, borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  ghost: { background: "#fff", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 9, padding: "9px 16px", fontSize: 13, cursor: "pointer" },
  danger: { background: "#dc2626", color: "#fff", border: 0, borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  linkBtn: { background: "none", border: 0, color: BLUE, cursor: "pointer", fontSize: 12.5, padding: "2px 6px" },
  smallBtn: { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
  th: { textAlign: "left", padding: "10px 12px", color: "#6b7280", fontWeight: 600, background: "#fafbfc", fontSize: 11.5 },
  td: { padding: "10px 12px", verticalAlign: "top" },
  tag: { fontSize: 11, background: "#eef2f7", color: "#475569", borderRadius: 5, padding: "2px 7px" },
  toast: { background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: 9, padding: "9px 14px", fontSize: 12.5, marginBottom: 12 },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 },
  modal: { background: "#fff", borderRadius: 14, padding: "18px 20px", maxWidth: "94vw", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.25)" },
  input: { width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, background: "#fff", boxSizing: "border-box" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
};
