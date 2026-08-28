import { S } from "./ui";

const th: React.CSSProperties = { ...S.th, textAlign: "left" };
const td: React.CSSProperties = { ...S.td, borderTop: "1px solid #eef0f4" };

export default function NcodeInfoView({ embedded }: { embedded?: boolean } = {}) {
  return (
    <div style={{ padding: embedded ? 0 : "20px 22px", maxWidth: 1000 }}>
      <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 13 }}>
        Ncode 코드 체계·구분 참조. (출처: 오너코드_발급리스트 + 운영 정리)
      </p>

      {/* 코드 구분 */}
      <Section title="코드 구분 (PDS)">
        <table style={{ ...S.table }}>
          <thead><tr>{["표기", "약칭", "설명"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>PDS3 (N3C6)</td><td style={{ ...td, fontWeight: 700, color: "#2563eb" }}>Ncode</td><td style={td}>N3C6의 <b>N</b>을 따서 Ncode. 현행 주력 코드.</td></tr>
            <tr><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>PDS2 (G3C6)</td><td style={{ ...td, fontWeight: 700, color: "#92400e" }}>Gcode</td><td style={td}>G3C6의 <b>G</b>를 따서 Gcode. 구형/호환 코드.</td></tr>
            <tr><td style={{ ...td, color: "#9ca3af" }}>S코드</td><td style={{ ...td, color: "#9ca3af" }}>제외</td><td style={{ ...td, color: "#9ca3af" }}>NcodeCenter 관리 대상 아님.</td></tr>
          </tbody>
        </table>
      </Section>

      {/* SOBP */}
      <Section title="SOBP 계층 (코드 주소 체계)">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {[["S", "Section", "코드 대분류(구역)", "#5f8ff0"], ["O", "Owner", "소유자(업체·프로젝트)", "#14b8a6"], ["B", "Book", "책(교재) 단위", "#8b5cf6"], ["P", "Page", "페이지", "#f59e0b"]].map(([k, n, d, c]) => (
            <div key={k} style={{ flex: "1 1 180px", border: "1px solid #eef0f4", borderRadius: 10, padding: 12 }}>
              <span style={{ background: c as string, color: "#fff", fontWeight: 700, borderRadius: 6, padding: "2px 8px", fontSize: 12 }}>{k}</span>
              <span style={{ marginLeft: 8, fontWeight: 700 }}>{n}</span>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{d}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: "#374151", margin: 0 }}>한 페이지 안의 위치는 추가로 <b>X·Y 좌표</b>로 지정됩니다. 겹침 없이 발급하는 것이 최우선.</p>
      </Section>

      {/* 펜 · 산출물 */}
      <Section title="펜 구분 · 편집 산출물">
        <table style={{ ...S.table }}>
          <thead><tr>{["펜", "구분", "편집 산출물", "저장 위치"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={{ ...td, fontWeight: 700 }}>소리펜</td><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>Ncp</td><td style={td}><b>ncp2</b> (좌표 + mp3 묶음)</td><td style={td}>디바이스(소리펜)에 저장 · 넣어야 동작</td></tr>
            <tr><td style={{ ...td, fontWeight: 700 }}>필기펜</td><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>Ndp</td><td style={td}><b>nproj</b> + PDF + JPG + 썸네일 png</td><td style={td}>서버에 등록 (mp3 리소스는 디바이스)</td></tr>
          </tbody>
        </table>
      </Section>

      {/* 오너코드 발급 구조 예시 */}
      <Section title="오너코드 발급 구조 (예시)">
        <table style={{ ...S.table }}>
          <thead><tr>{["Section", "Owner", "ACCOUNT", "Book 범위", "Page", "X", "Y"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {[
              ["0", "1", "neoa", "0~999 (1,000권)", "0~1023", "0~255", "0~255"],
              ["1", "1", "neolab", "0~4,194,303 (4.19M권)", "0~255", "0~255", "0~255"],
              ["14", "1", "FisherPrice(임시)", "0~4,095 (4,096권)", "0~4,095", "0~1023", "0~1023"],
              ["3", "4", "planning", "0~16,383 (16,384권)", "0~4,095", "0~1023", "0~1023"],
              ["5", "5", "Kyeowon", "0~199 (200권)", "0~255", "0~255", "0~255"],
            ].map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j} style={{ ...td, fontFamily: j >= 3 ? "ui-monospace,monospace" : undefined, fontSize: j >= 3 ? 11.5 : 13 }}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>Section·Owner에 따라 Book/Page/X/Y 최대 차원이 다릅니다. 페이지 1장이 2.3m 이하면 overflow 없이 페이지 수만으로 발급 규모를 산정합니다.</p>
      </Section>

      {/* 티켓(키) 발급 구조 — N Key / App Key */}
      <Section title="티켓 발급 구조 — N Key vs App Key">
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#374151" }}>
          코드를 할당한 뒤 <b>사용 허가(티켓)</b>를 발급합니다. 핵심은 <b>키와 계정의 묶음 관계</b>입니다 —
          <b> App Key는 반드시 계정과 함께</b> 발급되고, <b>N Key는 계정 없이</b> 파일만으로 동작합니다.
        </p>

        {/* 사용처별 묶음 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {[
            ["오프라인 편집툴", "N Key", "계정 불필요 · 티켓 파일만 있으면 사용", "#14b8a6"],
            ["온라인(웹) 편집툴", "계정 + App Key", "계정으로 로그인 → 연동된 App Key의 SOBP로 작업", "#2563eb"],
            ["SDK 연동", "App Key", "SOBP + id/pwd 가 포함된 App Key 필요", "#d97706"],
          ].map(([use, k, d, c]) => (
            <div key={use} style={{ flex: "1 1 230px", border: "1px solid #eef0f4", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{use}</div>
              <span style={{ display: "inline-block", marginTop: 5, background: c, color: "#fff", fontWeight: 700, borderRadius: 6, padding: "2px 8px", fontSize: 12 }}>{k}</span>
              <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 5, lineHeight: 1.6 }}>{d}</div>
            </div>
          ))}
        </div>
        <table style={{ ...S.table }}>
          <thead><tr>{["구분", "N Key", "App Key"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={{ ...td, fontWeight: 700 }}>성격</td><td style={td}><b>물리적 키 발급</b> (티켓 파일)</td><td style={td}>물리 키 아님 — <b>서비스 DB에 등록</b></td></tr>
            <tr><td style={{ ...td, fontWeight: 700 }}>사용 대상</td><td style={td}><b>오프라인</b> 편집툴 사용자</td><td style={td}><b>온라인(웹)</b> 편집툴 · <b>SDK 연동</b> 고객사</td></tr>
            <tr><td style={{ ...td, fontWeight: 700 }}>전달 방식</td><td style={td}>티켓 파일을 <b>TicketFolder</b>에 생성 → nproj 폴더 또는 <code>문서 &gt; NeoLAB &gt; CodeTickets</code>에 복사</td><td style={td}>발급 즉시 <b>서비스 DB(datastore)</b>에 등록 — 별도 파일 전달 없음</td></tr>
            <tr><td style={{ ...td, fontWeight: 700 }}>계정 연동</td><td style={td}>없음 (파일만 있으면 사용)</td><td style={{ ...td, fontWeight: 700, color: "#2563eb" }}>있음 — 계정과 연동되는 것이 특징</td></tr>
            <tr><td style={{ ...td, fontWeight: 700 }}>사용 흐름</td><td style={td}>티켓 파일 배치 → 편집툴에서 파일 정보 입력 시 해당 SOBP 사용</td><td style={td}>웹: <b>발급된 계정으로 로그인</b> → 연동 App Key의 SOBP로 작업<br />SDK: <b>id/pwd + App Key</b>로 SOBP 사용</td></tr>
            <tr><td style={{ ...td, fontWeight: 700 }}>주요 항목</td><td style={td}>회사이름 · IssuedTime · ValidUntilTime · Section/Owner · BookStart/Volume · PageStart/Volume · PatternType · TicketType · Separate each book</td><td style={td}>계정(ID) · 고객사 · 할당 SOBP 범위 · 만료일 · 발급 키(<code>ncc_live_…</code>)</td></tr>
          </tbody>
        </table>

        <div style={{ marginTop: 14, fontWeight: 700, fontSize: 13, color: "#374151" }}>발급 절차</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {[
            ["1", "코드 할당", "SOBP 맵에서 고객사에 Section/Owner/Book 할당"],
            ["2", "티켓 발급 요청", "관리자가 좌측 [티켓 발급] 메뉴에서 N Key 발급 또는 계정 발급 선택"],
            ["3-A", "N Key", "티켓 파일 생성 → 사용자 PC의 CodeTickets로 복사 → 오프라인 편집툴 사용 (계정 불필요)"],
            ["3-B", "계정 발급 (계정 + App Key)", "계정 등록(회사·ID·PWD…) → App Key 발급 → 서비스 DB에 등록 → 계정으로 로그인/SDK 연동해 사용"],
          ].map(([n, t, d]) => (
            <div key={n} style={{ flex: "1 1 210px", border: "1px solid #eef0f4", borderRadius: 10, padding: 12 }}>
              <span style={{ background: n.startsWith("3") ? "#14b8a6" : "#5f8ff0", color: "#fff", fontWeight: 700, borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>{n}</span>
              <span style={{ marginLeft: 8, fontWeight: 700, fontSize: 13 }}>{t}</span>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.6 }}>{d}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, background: "#f5f9ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: "#1e3a8a", lineHeight: 1.7 }}>
          <b>계정</b> — App Key와 한 묶음으로 관리되는 로그인 정보입니다. 항목: <b>회사정보 · ID(EMAIL) · PWD · NAME · ADDR · HOMEPAGE</b>.
          고객사 관리의 정보를 불러와 등록하며, <b>App Key는 계정 없이 발급되지 않습니다</b>(발급 화면에서 계정 등록 → App Key 발급이 한 흐름).
          <div style={{ marginTop: 6 }}>
            ※ <b>비밀번호를 요청하지 않는 고객사(SDK 목적)</b>는 담당자가 <b>임의 비밀번호를 지정</b>해 계정을 만들고,
            그 <b>id/pwd + SOBP가 포함된 App Key</b>를 전달합니다.
          </div>
        </div>
      </Section>

      <div style={{ ...S.card, padding: "12px 14px", background: "#fffbeb", border: "1px solid #fde68a", fontSize: 12.5, color: "#92400e" }}>
        ⚠ Section <b>1 · 44</b>는 테스트/개발 전용으로 만들어졌고 상용 서비스로는 미출시된 코드입니다(레거시 아님).
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...S.card, padding: 16, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
