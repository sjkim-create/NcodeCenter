"use client";

import { useState } from "react";
import { S } from "./ui";
import NcodeInfoView from "./NcodeInfoView";
import NcodeGuideView from "./NcodeGuideView";
import LangSlotView from "./LangSlotView";
import OidView from "./OidView";

// 첨부 자료(Code Info) 기준 SECTION별 코드 범위
//  · PDS2·PDS3 는 owner·bookcode·page·length(판형)
//  · PDS4(S-code)는 length 대신 **xy** 를 쓴다 `PC-042`
type Range = { owner: string; bookcode: string; page: string; length?: string; xy?: string } | null;
const SECTIONS: { s: number; pds2: Range; pds3: Range; pds4: Range }[] = [
  { s: 0, pds2: { owner: "0~524,287", bookcode: "0~8191", page: "0~1023", length: "600mm" }, pds3: { owner: "0~1023", bookcode: "0~16383", page: "0~4095", length: "600mm" } , pds4: null },
  { s: 3, pds2: { owner: "0~4095", bookcode: "0~4095", page: "0~4095", length: "1500mm" }, pds3: { owner: "0~1023", bookcode: "0~8191", page: "0~511", length: "2000mm" } , pds4: null },
  { s: 5, pds2: null, pds3: { owner: "0~255", bookcode: "0~4095", page: "0~4095", length: "1200mm" } , pds4: null },
  { s: 10, pds2: null, pds3: { owner: "0~1023", bookcode: "0~4095", page: "0~1023", length: "2427mm" } , pds4: null },
  { s: 11, pds2: null, pds3: { owner: "0~1023", bookcode: "0~8191", page: "0~511", length: "2000mm" } , pds4: null },
  { s: 14, pds2: { owner: "0~4095", bookcode: "0~4095", page: "0~1023", length: "9000mm" }, pds3: { owner: "0~1023", bookcode: "0~8191", page: "0~31", length: "9000mm" } , pds4: null },
  { s: 15, pds2: null, pds3: { owner: "0~32767", bookcode: "0~4095", page: "0~511", length: "608mm" } , pds4: null },
  // PDS4(S-code) — Section 44 `PC-042`
  { s: 44, pds2: null, pds3: null, pds4: { owner: "0~4095", bookcode: "0~255", page: "0~255", xy: "0~255" } },
];
const KEYS = ["owner", "bookcode", "page", "length"] as const;
const KEYS4 = ["owner", "bookcode", "page", "xy"] as const;

// OID 관리대장은 별도 메뉴가 아니라 이 화면의 탭으로 둔다 (PC-034)
const TABS = ["Code Info", "확장 언어 슬롯", "발급 구조", "OID 관리대장", "알아야 할 사항"];

export default function InfoView() {
  const [tab, setTab] = useState(0);
  return (
    <div style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 18 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{ ...tabBtn, ...(tab === i ? tabActive : {}) }}>{t}</button>
        ))}
      </div>

      {tab === 0 && <RangeTable />}
      {tab === 1 && <LangSlotView embedded />}
      {tab === 2 && <NcodeInfoView embedded />}
      {tab === 3 && <OidView embedded />}
      {tab === 4 && <NcodeGuideView embedded />}
    </div>
  );
}

function RangeTable() {
  return (
    <div style={{ maxWidth: 1100 }}>
      <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: 13 }}>
        SECTION별 코드 발급 범위. (owner · bookcode · page · length) — <b>PDS4(S-code)</b> 는 length 대신 <b>xy</b> 를 씁니다.
      </p>
      <div style={{ ...S.card, padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...hdr, width: 90 }}>SECTION</th>
              <th style={hdr} colSpan={2}>PDS2 (G3C6)</th>
              <th style={hdr} colSpan={2}>PDS3 (N3C6)</th>
              <th style={hdr} colSpan={2}>PDS4 (S-code)</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((sec) => (
              KEYS.map((k, ri) => (
                <tr key={sec.s + k} style={{ background: sec.s % 2 ? "#fafbfc" : "#fff", ...(ri === 0 ? { borderTop: "2px solid #e5e7eb" } : {}) }}>
                  {ri === 0 && (
                    <td rowSpan={4} style={{ textAlign: "center", fontWeight: 700, fontSize: 15, borderRight: "1px solid #eef0f4", background: "#f6f8fb" }}>{sec.s}</td>
                  )}
                  <td style={keyCell}>{k}</td>
                  <td style={valCell}>{sec.pds2 ? sec.pds2[k] : "—"}</td>
                  <td style={{ ...keyCell, borderLeft: "1px solid #eef0f4" }}>{k}</td>
                  <td style={valCell}>{sec.pds3 ? sec.pds3[k] : "—"}</td>
                  <td style={{ ...keyCell, borderLeft: "1px solid #eef0f4" }}>{KEYS4[ri]}</td>
                  <td style={valCell}>{sec.pds4 ? sec.pds4[KEYS4[ri]] : "—"}</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14, border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 10, padding: "14px 16px", fontSize: 12.5, color: "#1e3a8a", lineHeight: 1.9 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>length(판형)의 의미</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>length는 <b>코드를 입힐 수 있는 최대 크기(판형)</b>를 나타냅니다. (length ≒ 판형 크기)</li>
          <li>신규 프로젝트 시작 시 <b>향후 발매 예정 콘텐츠의 판형까지 고려</b>해 큰 사이즈가 필요하면, 그에 맞는 <b>섹션·오너를 발행</b>해 드립니다.</li>
          <li>초반에 작은 판형만 쓰다가 이후 <b>큰 판형 교구에 코드 적용</b>이 필요해지면, <b>신규 섹션의 코드를 발행</b>해 펌웨어 혹은 서비스 프로그램에 추가하여 작업합니다.</li>
          <li>따라서 <b>최대 적용 크기(판형=length)와 페이지 수를 모두 고려</b>해야 하며, <b>판형 크기에 따라 섹션이 달라집니다.</b></li>
        </ul>
        <div style={{ marginTop: 8, color: "#6b7280", lineHeight: 1.8 }}>
          ※ Section 1은 테스트/개발 전용(상용 미출시).<br />
          ※ <b>Section 44 = PDS4(S-code)</b> — owner 0~4095 · bookcode 0~255 · page 0~255 · <b>xy 0~255</b> 로 관리합니다 <code>PC-042</code>.
          PDS4 는 판형(length) 대신 <b>xy</b> 값을 가지므로 표의 마지막 행이 xy 입니다.
        </div>
      </div>
    </div>
  );
}

const hdr: React.CSSProperties = { textAlign: "center", padding: "9px 12px", background: "#eef0f4", color: "#374151", fontWeight: 700, fontSize: 12, borderBottom: "1px solid #e5e7eb" };
const keyCell: React.CSSProperties = { padding: "6px 12px", color: "#6b7280", width: 90, borderTop: "1px solid #f1f3f6" };
const valCell: React.CSSProperties = { padding: "6px 12px", fontFamily: "ui-monospace,monospace", color: "#111827", borderTop: "1px solid #f1f3f6" };
const tabBtn: React.CSSProperties = { border: 0, background: "none", padding: "10px 16px", fontSize: 13.5, color: "#6b7280", cursor: "pointer", borderBottom: "2px solid transparent", marginBottom: -1 };
const tabActive: React.CSSProperties = { color: "#2563eb", fontWeight: 700, borderBottom: "2px solid #2563eb" };
