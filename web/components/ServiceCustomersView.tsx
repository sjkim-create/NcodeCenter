"use client";

// 서비스별 고객사 — **고객사 관리**에서 **사용 서비스**로 지정한 고객사를 그 서비스 화면으로 불러온다 `PC-076`
//   casterN 은 [편집 프로젝트]가 그 역할을 하고, 이 화면은 나머지 서비스(폼솔루션 등)를 맡는다.
import Link from "next/link";
import { useMemo } from "react";
import { S } from "./ui";
import { Sc } from "./sobp";
import { useStore } from "@/lib/store";
import { codeKind, kindMeta } from "@/lib/codeKind";
import { serviceLabel, projectCodes, type ServiceType } from "@/lib/customerData";
import { customersOfService } from "@/lib/serviceCustomers";

export default function ServiceCustomersView({ service, title }: { service: ServiceType; title: string }) {
  const { companies, projects } = useStore();
  const rows = useMemo(() => customersOfService(service, companies, projects), [service, companies, projects]);

  return (
    <div style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 15 }}>{title}</b>
        <span style={{ ...S.tag, background: "#eef6ff", color: "#2563eb", fontWeight: 700 }}>{rows.length}곳</span>
        <span style={{ fontSize: 11.5, color: "#9ca3af" }}>
고객사 관리에서 <b>사용 서비스 = {serviceLabel(service)}</b> 로 지정한 고객사입니다
        </span>
      </div>

      <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
        <table style={{ ...S.table, minWidth: 720 }}>
          <thead>
            <tr>{["고객사", "할당 좌표 (S/O)", "코드 프로젝트", "발급 규모", ""].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(({ company, projects: ps, sobp }) => (
              <tr key={company.id} style={{ borderTop: "1px solid #eef0f4" }}>
                <td style={{ ...S.td, fontWeight: 600, textAlign: "left" }}>{company.name}</td>
                <td style={{ ...S.td, textAlign: "left" }}>
                  <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                    {sobp.slice(0, 6).map((c, i) => (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {c.k && <span style={{ ...S.tag, fontSize: 9, background: kindMeta(codeKind(c.k, c.s)).bg, color: kindMeta(codeKind(c.k, c.s)).color, fontWeight: 700 }}>{kindMeta(codeKind(c.k, c.s)).short}</span>}
                        <Sc k="S" c="#5f8ff0" v={c.s} />
                        <Sc k="O" c="#14b8a6" v={c.o} />
                      </span>
                    ))}
                    {sobp.length > 6 && <span style={{ fontSize: 11, color: "#9ca3af" }}>외 {sobp.length - 6}건</span>}
                  </span>
                </td>
                <td style={S.td}>{ps.length}</td>
                <td style={{ ...S.td, fontFamily: "ui-monospace,monospace" }}>{ps.reduce((n, p) => n + projectCodes(p), 0).toLocaleString()}</td>
                <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <Link href={`/projects?q=${encodeURIComponent(company.name)}`} style={{ ...S.linkBtn, textDecoration: "none" }}>코드 프로젝트</Link>
                  <Link href="/ownership" style={{ ...S.linkBtn, textDecoration: "none", marginLeft: 6 }}>SOBP 맵</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#9ca3af", padding: 30, lineHeight: 1.8 }}>
                아직 이 서비스로 지정된 고객사가 없습니다.<br />
                <b>고객사 관리 ▸ 사용 서비스</b> 에서 <b>{serviceLabel(service)}</b> 를 체크하면 여기에 나옵니다 <code>PC-076</code>.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
