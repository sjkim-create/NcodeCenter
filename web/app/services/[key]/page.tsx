import MenuPlaceholder from "@/components/MenuPlaceholder";
import ServiceCustomersView from "@/components/ServiceCustomersView";
import { SERVICE_MENUS } from "@/lib/menu";
import type { ServiceType } from "@/lib/customerData";

export const metadata = { title: "서비스 관리" };

// 서비스별 관리 화면.
// 화면이 아직 없는 서비스라도 **SOBP 맵에서 그 서비스로 지정한 고객사 목록**은 보여 준다 `PC-057`.
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
    <>
      <ServiceCustomersView service={svc.service as ServiceType} title={`${svc.label} · 고객사`} />
      <MenuPlaceholder
        title={svc.label}
        desc={svc.desc}
        features={svc.features}
        note={`코드 할당은 [SOBP 맵 ▸ 직접 코드 할당]에서 사용 서비스를 '${svc.label.replace(" 서비스 관리", "")}'로 지정하면 이 서비스의 관리 대상이 됩니다.`}
      />
    </>
  );
}
