"use client";

import { useEffect, useState } from "react";
import { S } from "./ui";
import data from "@/data/pui-data.json";

type Proj = { project: string; page: string; book: string; product: string; customer: string; memo: string; dept: string; note: string };
type Func = { cat: string; sub: string; name: string; summary: string; desc: string; book: number | null; page: number | null; params: string };
type Alloc = { sheet: string; pds: string; section: number; owner: number; label: string; projects: Proj[]; funcs: Func[]; raw: string[][] };
const D = data as unknown as { allocations: Alloc[]; summary: { sheets: number; projects: number; funcs: number } };

type Img = { id: number; name: string; url: string };
const imgKey = (sheet: string) => `ncc-pui-img-${sheet}`;

export default function PuiView() {
  const [sel, setSel] = useState(D.allocations[0]?.sheet ?? "");
  const [imgs, setImgs] = useState<Img[]>([]);
  const [openImg, setOpenImg] = useState(true);
  const [openFunc, setOpenFunc] = useState(false);
  const [openRaw, setOpenRaw] = useState(false);
  const [zoom, setZoom] = useState<Img | null>(null);
  const [toast, setToast] = useState("");

  const a = D.allocations.find((x) => x.sheet === sel);

  useEffect(() => {
    try { const r = localStorage.getItem(imgKey(sel)); setImgs(r ? JSON.parse(r) : []); } catch { setImgs([]); }
  }, [sel]);
  const saveImgs = (next: Img[]) => { setImgs(next); try { localStorage.setItem(imgKey(sel), JSON.stringify(next)); } catch { setToast("저장 용량 초과 — 이미지 수를 줄여주세요."); setTimeout(() => setToast(""), 4000); } };

  const onUpload = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 8);
    let done: Img[] = [];
    let left = arr.length;
    arr.forEach((f, i) => {
      const rd = new FileReader();
      rd.onload = () => {
        done.push({ id: Date.now() + i, name: f.name, url: String(rd.result) });
        if (--left === 0) saveImgs([...imgs, ...done]);
      };
      rd.readAsDataURL(f);
    });
  };
  const delImg = (id: number) => saveImgs(imgs.filter((x) => x.id !== id));

  return (
    <div style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 12, fontSize: 12.5, color: "#6b7280" }}>
        <b style={{ fontSize: 14, color: "#111827" }}>PUI 코드 관리</b>
        <span>피지컬 조작(종이 위 컨트롤러) 프로젝트 할당 코드</span>
        <span>할당 <b style={{ color: "#111827" }}>{D.summary.sheets}</b></span>
        <span>프로젝트 <b style={{ color: "#111827" }}>{D.summary.projects}</b></span>
        <span>기능 <b style={{ color: "#2563eb" }}>{D.summary.funcs}</b></span>
      </div>

      {toast && <div style={{ ...S.toast, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>{toast}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 12, alignItems: "start" }}>
        {/* 할당 목록 */}
        <div style={{ ...S.card, padding: 8 }}>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, padding: "2px 4px 6px" }}>PUI 할당 (Section/Owner)</div>
          {D.allocations.map((x) => {
            const on = x.sheet === sel;
            return (
              <button key={x.sheet} onClick={() => setSel(x.sheet)} style={{ display: "block", width: "100%", textAlign: "left", border: `1px solid ${on ? "#93c5fd" : "#eef0f4"}`, background: on ? "#f5f9ff" : "#fff", borderRadius: 9, padding: "8px 10px", margin: "2px 0", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <b style={{ fontFamily: "ui-monospace,monospace", fontSize: 12.5, color: on ? "#1d4ed8" : "#111827" }}>S{x.section}/O{x.owner}</b>
                  <span style={{ ...S.tag, fontSize: 9 }}>{x.pds}</span>
                </div>
                {x.label && <div style={{ fontSize: 11, color: "#374151", marginTop: 2 }}>{x.label}</div>}
                <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>프로젝트 {x.projects.length} · 기능 {x.funcs.length}</div>
              </button>
            );
          })}
        </div>

        {/* 상세 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!a ? <div style={{ ...S.card, padding: 20, color: "#9ca3af" }}>할당을 선택하세요.</div> : (
            <>
              <div style={{ ...S.card, padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>S{a.section} / O{a.owner} {a.label && <span style={{ color: "#2563eb" }}>· {a.label}</span>}</div>
                <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 2 }}>{a.pds} · 시트 {a.sheet}</div>
                {/* 프로젝트(할당 코드) */}
                <div style={{ fontSize: 12.5, fontWeight: 700, margin: "14px 0 8px" }}>프로젝트 / 할당 코드 <span style={{ color: "#9ca3af", fontWeight: 400 }}>({a.projects.length})</span></div>
                {a.projects.length ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ ...S.table, textAlign: "left", minWidth: 700 }}>
                      <thead><tr>{["프로젝트", "Book", "Page", "제품", "고객사", "메모/포함기능", "부서/발급인", "비고"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {a.projects.map((p, i) => (
                          <tr key={i} style={{ borderTop: "1px solid #eef0f4" }}>
                            <td style={{ ...S.td, fontWeight: 600 }}>{p.project}</td>
                            <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", fontSize: 11.5 }}>{p.book || "-"}</td>
                            <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", fontSize: 11.5 }}>{p.page || "-"}</td>
                            <td style={S.td}>{p.product || "-"}</td>
                            <td style={S.td}>{p.customer || "-"}</td>
                            <td style={{ ...S.td, color: "#6b7280", maxWidth: 220 }}>{p.memo || "-"}</td>
                            <td style={S.td}>{p.dept || "-"}</td>
                            <td style={{ ...S.td, color: "#6b7280" }}>{p.note || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div style={{ fontSize: 12, color: "#9ca3af" }}>정규화된 프로젝트 표가 없습니다. 아래 <b>원본 시트</b>에서 확인하세요.</div>}
              </div>

              {/* 이미지 (펼침/접힘) */}
              <div style={{ ...S.card }}>
                <button onClick={() => setOpenImg((v) => !v)} style={secBtn}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>🖼 컨트롤러 이미지</span>
                  <span style={{ ...S.tag, background: imgs.length ? "#eef6ff" : "#f3f4f6", color: imgs.length ? "#2563eb" : "#9ca3af" }}>{imgs.length}</span>
                  <span style={{ color: "#9ca3af", fontSize: 11 }}>· 디자인 시안·인쇄물 이미지를 올려 보면서 작업</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#3b82f6" }}>{openImg ? "접기 ▲" : "펼치기 ▼"}</span>
                </button>
                {openImg && (
                  <div style={{ padding: "0 14px 14px" }}>
                    <label style={{ ...S.smallBtn as React.CSSProperties, display: "inline-block", cursor: "pointer" }}>
                      ＋ 이미지 업로드
                      <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => onUpload(e.target.files)} />
                    </label>
                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>브라우저에 저장 · 클릭하면 크게 보기</span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginTop: 12 }}>
                      {imgs.map((im) => (
                        <div key={im.id} style={{ border: "1px solid #eef0f4", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={im.url} alt={im.name} onClick={() => setZoom(im)} style={{ width: "100%", height: 110, objectFit: "contain", background: "#fafbfc", cursor: "zoom-in", display: "block" }} />
                          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px" }}>
                            <span style={{ fontSize: 10.5, color: "#6b7280", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{im.name}</span>
                            <button onClick={() => delImg(im.id)} style={{ ...S.linkBtn, color: "#dc2626", fontSize: 11 }}>삭제</button>
                          </div>
                        </div>
                      ))}
                      {imgs.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af", padding: 12, border: "1px dashed #e5e7eb", borderRadius: 10, gridColumn: "1/-1", textAlign: "center" }}>업로드된 이미지가 없습니다. PUI 컨트롤러 디자인/인쇄 시안을 올려보세요.</div>}
                    </div>
                  </div>
                )}
              </div>

              {/* 기능 매핑 (펼침/접힘) */}
              <div style={{ ...S.card }}>
                <button onClick={() => setOpenFunc((v) => !v)} style={secBtn}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>⚙ 기능 매핑 (Book/Page/params)</span>
                  <span style={{ ...S.tag, background: a.funcs.length ? "#eef6ff" : "#f3f4f6", color: a.funcs.length ? "#2563eb" : "#9ca3af" }}>{a.funcs.length}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#3b82f6" }}>{openFunc ? "접기 ▲" : "펼치기 ▼"}</span>
                </button>
                {openFunc && (
                  <div style={{ padding: "0 14px 14px", overflowX: "auto" }}>
                    {a.funcs.length ? (
                      <table style={{ ...S.table, textAlign: "left", minWidth: 820 }}>
                        <thead><tr>{["대구분", "소구분", "기능명", "요약", "Book", "Page", "params"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                        <tbody>
                          {a.funcs.map((f, i) => (
                            <tr key={i} style={{ borderTop: "1px solid #eef0f4" }}>
                              <td style={{ ...S.td, color: "#6b7280" }}>{f.cat}</td>
                              <td style={{ ...S.td, color: "#6b7280" }}>{f.sub}</td>
                              <td style={{ ...S.td, fontWeight: 600 }}>{f.name}</td>
                              <td style={{ ...S.td, color: "#374151", maxWidth: 240 }}>{f.summary}</td>
                              <td style={{ ...S.td, fontFamily: "ui-monospace,monospace" }}>{f.book ?? "-"}</td>
                              <td style={{ ...S.td, fontFamily: "ui-monospace,monospace" }}>{f.page ?? "-"}</td>
                              <td style={{ ...S.td, fontFamily: "ui-monospace,monospace", color: "#2563eb" }}>{f.params || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <div style={{ fontSize: 12, color: "#9ca3af" }}>이 할당에는 기능 매핑 표가 없습니다.</div>}
                  </div>
                )}
              </div>

              {/* 원본 시트 (펼침/접힘) */}
              <div style={{ ...S.card }}>
                <button onClick={() => setOpenRaw((v) => !v)} style={secBtn}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>📄 원본 시트</span>
                  <span style={{ ...S.tag }}>{a.raw.length}행</span>
                  <span style={{ color: "#9ca3af", fontSize: 11 }}>· 엑셀 원본 그대로</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#3b82f6" }}>{openRaw ? "접기 ▲" : "펼치기 ▼"}</span>
                </button>
                {openRaw && (
                  <div style={{ padding: "0 14px 14px", overflow: "auto", maxHeight: 460 }}>
                    <table style={{ ...S.table, textAlign: "left", fontSize: 11.5 }}>
                      <tbody>
                        {a.raw.map((row, i) => (
                          <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                            {row.map((c, j) => <td key={j} style={{ padding: "4px 8px", whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", color: j === 0 ? "#9ca3af" : "#374151" }}>{c}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 이미지 확대 */}
      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.75)", display: "grid", placeItems: "center", zIndex: 60, padding: 24, cursor: "zoom-out" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 12, maxWidth: "92vw", maxHeight: "92vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <b style={{ fontSize: 13 }}>{zoom.name}</b><span style={{ flex: 1 }} />
              <button onClick={() => setZoom(null)} style={S.ghost}>닫기 ✕</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom.url} alt={zoom.name} style={{ maxWidth: "88vw", maxHeight: "80vh", display: "block" }} />
          </div>
        </div>
      )}
    </div>
  );
}

const secBtn: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: 8, background: "none", border: 0, cursor: "pointer", padding: "12px 14px", textAlign: "left" };
