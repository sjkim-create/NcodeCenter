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
      <Section title="코드 종류 — 좌표(SOBP)의 속성">
        <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "#374151", lineHeight: 1.7 }}>
          <b>좌표(SOBP)가 먼저</b>입니다. Section·Owner·Book·Page 로 코드를 지정하고, 그 좌표가 어떤 체계인지를
          <b> 코드 종류</b>로 구분합니다. 좌표는 유일하므로 <b>코드 중복은 성립하지 않고</b>, 해당 좌표가
          PDS2·PDS3·PDS4·OID 중 무엇인지만 가리면 됩니다.
        </p>
        <table style={{ ...S.table }}>
          <thead><tr>{["표기", "약칭", "설명"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>PDS3 (N3C6)</td><td style={{ ...td, fontWeight: 700, color: "#2563eb" }}>Ncode</td><td style={td}>N3C6의 <b>N</b>을 따서 Ncode. 현행 주력 코드.</td></tr>
            <tr><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>PDS2 (G3C6)</td><td style={{ ...td, fontWeight: 700, color: "#92400e" }}>Gcode</td><td style={td}>G3C6의 <b>G</b>를 따서 Gcode. 구형/호환 코드.</td></tr>
            <tr><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>PDS4 (S-code)</td><td style={{ ...td, fontWeight: 700, color: "#7c3aed" }}>Scode</td><td style={td}><b>Section 44</b> 로 발급된 좌표를 PDS4(S-code)로 구분합니다.</td></tr>
            <tr><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>OID</td><td style={{ ...td, fontWeight: 700, color: "#0f766e" }}>인덱스</td><td style={td}><b>index만 갖는 코드</b> — 외부 코드를 <b>우리 펜으로 읽을</b> 목적으로 만든 방식. 옛 <b>IDS(A코드)</b> 표기도 <b>같은 것</b>으로 본다.</td></tr>
          </tbody>
        </table>
        <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", lineHeight: 1.7 }}>
          같은 <b>S/O</b> 는 <b>PDS2·PDS3·PDS4 중 한 종류만</b> 씁니다(무겹침). OID는 index 부여라 같은 S/O 를 함께 쓸 수 있습니다.
          <br />펜 구분(<b>소리펜</b> NSP · <b>필기펜</b> NWP)도 좌표 속성이며 지도·목록에서 필터로 가릅니다.
          <br />SOBP 맵·코드 프로젝트에서 <b>PDS2 · PDS3 · PDS4 · OID</b> 로 필터해 조회합니다.
        </div>
      </Section>

      {/* OID — 좌표가 아닌 index 관리 */}
      <Section title="OID — index 전용 코드">
        <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 10, padding: "12px 14px", fontSize: 12.5, color: "#115e59", lineHeight: 1.9 }}>
          <div><b>개념</b> — OID는 <b>index만 갖는 코드</b>로, <b>외부 코드를 우리 펜으로 읽을</b> 목적으로 만든 방식입니다.</div>
          <div>OID 책을 우리 펜으로 찍으면 <b>코드 값이 1개만</b> 나옵니다.</div>
          <div>총량이 <b>약 60,000개</b>뿐이라, 책의 양이 많지 않으면 <b>book 으로 코드를 나누지 않습니다</b>.</div>
        </div>
        <table style={{ ...S.table, marginTop: 10 }}>
          <thead><tr>{["대장 관리 방식", "내용", "예"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={{ ...td, fontWeight: 700 }}>업체 구분</td><td style={td}><b>S/O</b> 로 업체를 구분해 왔습니다(관리 편의를 위한 구분이며 좌표 발급이 아닙니다).</td><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>한솔 S3/O25 · 웅진 S3/O17</td></tr>
            <tr><td style={{ ...td, fontWeight: 700 }}>book 미분할</td><td style={td}>분량이 <b>6만 페이지 미만</b>이면 book 번호로 나누지 않고 <b>업체 단위</b>로만 관리합니다.</td><td style={td}>한솔교육 · 잉글리시에그 · 헤르만헤세 등</td></tr>
            <tr><td style={{ ...td, fontWeight: 700 }}>index 관리</td><td style={td}>분량이 늘어난 업체는 <b>book 번호로 나누며, 그 번호가 곧 OID index</b> 로 보입니다.</td><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>웅진 B431~464</td></tr>
            <tr><td style={{ ...td, fontWeight: 700 }}>조회 화면</td><td style={td}>좌표 기준은 <b>SOBP 맵의 종류 필터 [OID]</b>, 업체별 index 목록은 <b>이 화면의 [OID 관리대장] 탭</b>에서 봅니다.</td><td style={td}>book 미분할 업체는 대장에서 확인</td></tr>
            <tr><td style={{ ...td, fontWeight: 700 }}>용어</td><td style={td}>옛 <b>IDS(A코드)</b> 표기는 <b>OID 와 같은 것</b>입니다. 화면·필터에서 구분하지 않습니다.</td><td style={td}>IDS = OID</td></tr>
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
            <tr><td style={{ ...td, fontWeight: 700 }}>주요 항목</td><td style={td}>회사이름 · Issued Time · Valid Until Time · Section/Owner · Book Start/Volume · Page Start/Volume · Code Type · Ticket Type · Separate Each Book</td><td style={td}>계정(ID) · 고객사 · 할당 SOBP 범위 · 만료일 · 발급 키(<code>ncc_live_…</code>)</td></tr>
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
        ⚠ Section <b>1</b>은 테스트/개발 전용으로 만들어졌고 상용 서비스로는 미출시된 코드입니다(레거시 아님). Section <b>44</b>는 <b>PDS4(S-code)</b> 로 구분합니다.
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
