import MenuPlaceholder from "@/components/MenuPlaceholder";
import { SERVICE_MENUS } from "@/lib/menu";

export const metadata = { title: "서비스 관리" };

// 서비스별 관리 화면 — 아직 화면이 없는 서비스의 안내(예정) 페이지.
// 서비스가 구현되면 lib/menu.ts SERVICE_MENUS 의 items 에 실제 화면을 추가한다.
export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const svc = SERVICE_MENUS.find((s) => s.key === key);

  if (!svc) {
    return (
      <MenuPlaceholder
        title="서비스 관리"
        desc="등록되지 않은 서비스입니다."
        features={SERVICE_MENUS.map((s) => `${s.label}${s.ready ? "" : " (예정)"}`)}
        note="좌측 [서비스 관리]에서 서비스를 선택하세요."
      />
    );
  }

  return (
    <MenuPlaceholder
      title={svc.label}
      desc={svc.desc}
      features={svc.features}
      note={`사용 서비스는 [고객사 관리]에서 '${svc.label.replace(" 서비스 관리", "")}'로 지정합니다 (PC-076). 현재는 [코드 프로젝트]의 사용 서비스 필터로 조회할 수 있습니다.`}
    />
  );
}
