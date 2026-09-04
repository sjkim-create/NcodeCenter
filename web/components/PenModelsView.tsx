"use client";

// 펜 모델 관리 — 코드 관리 정보 ▸ [펜 모델] 탭 `PC-101`
//   교재(책) 등록·수정의 [펜 모델] 셀렉트가 이 목록을 그대로 쓴다.
//   각 화면에서 흩어져 늘어나던 것을 **한 곳에서 보고 고치도록** 모았다.

import { useState } from "react";
import { S } from "./ui";
import {
  usePenModels, penModelsExtra, isBuiltInPen, addPenModel, removePenModel,
  BUILT_IN_PEN_MODELS,
} from "@/lib/penModels";

export default function PenModelsView({ embedded = false }: { embedded?: boolean }) {
  const models = usePenModels();
  const extra = penModelsExtra();
  const [name, setName] = useState("");
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const say = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 2500); };

  const add = () => {
    const r = addPenModel(name);
    if (r.ok) setName("");
    say(r.ok, r.msg);
  };
  const del = (v: string) => {
    if (!confirm(`펜 모델 "${v}" 을 목록에서 지울까요?\n이미 교재에 적어 둔 값은 그대로 남습니다.`)) return;
    const r = removePenModel(v);
    say(r.ok, r.msg);
  };

  return (
    <div style={{ padding: embedded ? 0 : "18px 20px", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>펜 모델</b>
        <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }}>{models.length}종</span>
        <span style={{ fontSize: 11.5, color: "#9ca3af" }}>
          편집 프로젝트 ▸ 교재(책) 등록·수정의 <b>[펜 모델]</b> 셀렉트가 이 목록을 씁니다
        </span>
      </div>

      {/* 추가 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input style={{ ...S.input, maxWidth: 260 }} value={name} placeholder="새 펜 모델명 (예: C250)"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button onClick={add} style={S.primary}>＋ 추가</button>
        {toast && <span style={{ alignSelf: "center", fontSize: 12.5, color: toast.ok ? "#047857" : "#dc2626" }}>{toast.text}</span>}
      </div>

      {/* 목록 — 기본 / 추가분 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #eef0f4", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
            기본 <span style={{ color: "#9ca3af", fontWeight: 400 }}>· {BUILT_IN_PEN_MODELS.length}종 · 코드에서 관리</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {BUILT_IN_PEN_MODELS.map((m) => (
              <span key={m} style={{ ...S.tag, background: "#f3f4f6", color: "#6b7280" }}>{m}</span>
            ))}
          </div>
        </div>
        <div style={{ border: "1px solid #eef0f4", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
            추가한 모델 <span style={{ color: "#9ca3af", fontWeight: 400 }}>· {extra.length}종 · 이 브라우저</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {extra.length === 0 && <span style={{ fontSize: 12, color: "#9ca3af" }}>추가한 모델이 없습니다.</span>}
            {extra.map((m) => (
              <span key={m} style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", display: "inline-flex", alignItems: "center", gap: 4 }}>
                {m}
                {!isBuiltInPen(m) && (
                  <button onClick={() => del(m)} title="목록에서 삭제"
                    style={{ border: 0, background: "none", color: "#dc2626", cursor: "pointer", padding: 0 }}>✕</button>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 10, lineHeight: 1.8,
        border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 9, padding: "10px 12px" }}>
        <b>추가한 모델은 이 브라우저에만 남습니다.</b> 서버 저장소가 없어 다른 담당자 화면에는 나오지 않습니다 —
        팀 전체가 쓰려면 여기 목록을 알려 주세요. <b>기본</b> 목록에 넣어 배포하면 모두에게 반영됩니다.
        <br />교재에 이미 적어 둔 펜 모델은 목록에서 지워도 <b>그대로 남습니다</b>(기록이므로).
      </div>
    </div>
  );
}
