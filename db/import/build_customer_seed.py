# ownership-data.json(엑셀 파생) → 고객사/프로젝트/업무로그 시드 생성
# 실제 account(업체명) + SOBP(section/owner/book) 참조
import json, sys, os
sys.stdout.reconfigure(encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "web", "data", "ownership-data.json")
OUT = os.path.join(HERE, "..", "..", "web", "data", "seed-customers.json")

data = json.load(open(SRC, encoding="utf-8"))

# account -> list of records(+section)
by_acc = {}
for sec in data["sections"]:
    s = sec["section"]
    for r in sec.get("records", []):
        acc = (r.get("account") or "").strip()
        if not acc:
            continue
        by_acc.setdefault(acc, []).append({**r, "section": s})

def service_of(name):
    n = name.lower()
    if "네오노트" in name or "neonote" in n: return "NEONOTE"
    if "caster" in n: return "CASTERN"
    if "아이글" in name or "aigle" in n: return "AIGLE"
    if "form" in n or "폼솔" in name: return "FORMSOLUTION"
    return "NONE"

def codes_of(r):
    bs, be = r.get("book_start"), r.get("book_end")
    if bs is not None and be is not None:
        return max(1, be - bs + 1)
    return 1

# 레코드 많은 순 상위 계정만 (테스트용 적정 규모)
accounts = sorted(by_acc.items(), key=lambda kv: -len(kv[1]))[:10]

companies, projects, logs = [], [], []
cid = pid = lid = 0
for acc, recs in accounts:
    cid += 1
    companies.append({
        "id": cid, "name": acc, "manager": "", "contact": "", "address": "",
        "bizNo": "", "bankName": "", "accountNo": "", "docs": [],
    })
    # 계정의 레코드를 섹션별 프로젝트로 (최대 3개 섹션)
    secs = {}
    for r in recs:
        secs.setdefault(r["section"], []).append(r)
    for si, (s, srecs) in enumerate(sorted(secs.items())[:3]):
        pid += 1
        issued = []
        for bi, r in enumerate(srecs[:6]):  # 프로젝트당 최대 6블록
            issued.append({
                "id": bi + 1, "date": "2026-03-01", "codes": codes_of(r),
                "section": r["section"], "owner": r.get("owner") or 0,
                "bookStart": r.get("book_start") or 0, "bookEnd": r.get("book_end") or 0,
                "pageStart": 0, "pageEnd": 0,
            })
        st = srecs[0].get("status", "")
        projects.append({
            "id": pid, "name": f"{acc} · Sec{s}", "companyId": cid,
            "service": service_of(acc), "grade": "", "issued": issued,
        })
        # 프로젝트 시드 로그 1건 (상태 기반)
        lid += 1
        logs.append({
            "id": 1000 + lid, "no": si + 1, "companyId": cid, "projectId": pid,
            "date": "2026-03-05", "kind": "처리" if st == "ACTIVE" else "요청",
            "content": f"Sec{s} {st} 블록 {len(issued)}건 확인",
            "author": "김직원",
        })
    # 고객사 공통 로그 1건 (no는 프로젝트 로그 다음 번호)
    lid += 1
    logs.append({
        "id": 1000 + lid, "no": len([l for l in logs if l["companyId"] == cid]) + 1,
        "companyId": cid, "projectId": None, "date": "2026-03-02", "kind": "메모",
        "content": f"{acc} 계정 · 총 {len(recs)}블록 보유(엑셀 참조)", "author": "이영업",
    })

out = {"companies": companies, "projects": projects, "logs": logs}
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"companies={len(companies)} projects={len(projects)} logs={len(logs)}")
print("accounts:", ", ".join(a for a, _ in accounts))
