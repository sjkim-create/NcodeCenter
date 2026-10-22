"use client";

// 동작 흐름 — docs/NcodeCenter-Flow.md 의 mermaid 다이어그램 6개를 그대로 그린다 `PC-239`
// - 소스: web/data/flow-diagrams.json (docs/screens/_gen/mkflow.py 가 Flow.md 에서 뽑아 쓴다)
// - 다이어그램마다 [SVG 저장] · [SVG 복사] — 문서 · Figma 에 붙여 쓸 수 있다
// - 옛 「DB 구조」 메뉴 자리를 대신한다
import { useEffect, useRef, useState } from "react";
import diagrams from "@/data/flow-diagrams.json";
import { S } from "./ui";

type Diagram = { title: string; slug: string; src: string };
const DATA = diagrams as Diagram[];
const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js";

type Mermaid = {
  initialize: (c: object) => void;
  render: (id: string, src: string) => Promise<{ svg: string }>;
};
declare global { interface Window { mermaid?: Mermaid } }

// mermaid 를 한 번만 불러온다
let loading: Promise<Mermaid> | null = null;
function loadMermaid(): Promise<Mermaid> {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  if (loading) return loading;
  loading = new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = MERMAID_CDN;
    s.onload = () => {
      const m = window.mermaid!;
      m.initialize({
        startOnLoad: false, securityLevel: "loose",
        flowchart: { htmlLabels: false, curve: "basis", useMaxWidth: false, nodeSpacing: 45, rankSpacing: 55 },
        sequence: { useMaxWidth: false },
        themeVariables: { fontFamily: "Pretendard, Apple SD Gothic Neo, Malgun Gothic, sans-serif", fontSize: "14px" },
      });
      ok(m);
    };
    s.onerror = () => fail(new Error("mermaid 를 불러오지 못했습니다"));
    document.head.appendChild(s);
  });
  return loading;
}

export default function FlowDiagrams() {
  const [svgs, setSvgs] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    (async () => {
      try {
        const m = await loadMermaid();
        const out: Record<string, string> = {};
        for (let i = 0; i < DATA.length; i++) {
          const d = DATA[i];
          try { out[d.slug] = (await m.render(`flow-m${i}`, d.src)).svg; }
          catch (e) { out[d.slug] = `<div style="color:#b91c1c;font-size:12.5px">렌더 실패: ${String(e)}</div>`; }
          setSvgs({ ...out });
        }
      } catch (e) { setErr(String(e)); }
    })();
  }, []);

  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 2000); return () => clearTimeout(id); }, [toast]);

  const save = (d: Diagram) => {
    const svg = svgs[d.slug]; if (!svg?.startsWith("<svg")) return;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${d.slug}.svg`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copy = async (d: Diagram) => {
    const svg = svgs[d.slug]; if (!svg?.startsWith("<svg")) return;
    try { await navigator.clipboard.writeText(svg); setToast("SVG 를 복사했습니다 — Figma 에 붙여 넣을 수 있습니다."); }
    catch { setToast("복사하지 못했습니다. [SVG 저장]을 쓰세요."); }
  };

  return (
    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Ncode Center 동작 흐름</h1>
        <span style={{ fontSize: 12.5, color: "#6b7280" }}>다이어그램 {DATA.length}개 · 소스 docs/NcodeCenter-Flow.md</span>
      </div>
      {/* 카드 너비에 맞춰 줄인다(저장 · 복사는 원본 크기 그대로) */}
      <style>{`.flow-fig svg{max-width:100%;height:auto}`}</style>
      {err && <div style={{ ...S.card, padding: 14, color: "#b91c1c", fontSize: 12.5 }}>{err}</div>}
      {DATA.map((d) => (
        <div key={d.slug} id={d.slug} style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: "1px solid #eef0f4" }}>
            <b style={{ fontSize: 14, flex: 1 }}>{d.title}</b>
            <button type="button" onClick={() => copy(d)} disabled={!svgs[d.slug]} style={S.ghost}>SVG 복사</button>
            <button type="button" onClick={() => save(d)} disabled={!svgs[d.slug]} style={S.ghost}>SVG 저장</button>
          </div>
          <div style={{ padding: "18px 16px", overflowX: "auto", textAlign: "center" }}>
            {svgs[d.slug]
              ? <div className="flow-fig" dangerouslySetInnerHTML={{ __html: svgs[d.slug] }} />
              : <span style={{ fontSize: 12.5, color: "#9ca3af" }}>그리는 중…</span>}
          </div>
        </div>
      ))}
      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)", background: "#1f2430", color: "#fff", padding: "9px 18px", borderRadius: 20, fontSize: 13, zIndex: 50 }}>{toast}</div>
      )}
    </div>
  );
}
