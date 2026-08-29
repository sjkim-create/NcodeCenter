# -*- coding: utf-8 -*-
"""화면 정의서 HTML 생성 — docs/screens/*.html"""
import io, os, importlib, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

# (모듈, 출력파일명) — PRD 순서
MODULES = [
    ('p_prd00', 'PRD-00_공통.html'),
    ('p_dsh01', 'DSH-01_대시보드.html'),
    ('p_mem01', 'MEM-01_고객사 관리.html'),
    ('p_mem02', 'MEM-02_고객사 등록·수정.html'),
    ('p_log01', 'LOG-01_활동 로그.html'),
    ('p_tkt01', 'TKT-04_N Key 발급.html'),
    ('p_tkt03', 'TKT-01_계정 발급.html'),
    ('p_tkt02', 'TKT-02_계정 등록·수정.html'),
    ('p_tkt04', 'TKT-03_Key 관리.html'),
    ('p_tkt05', 'TKT-05_발급 상세·수정.html'),
    ('p_tkt06', 'TKT-06_N Key 불러오기.html'),
    ('p_sob01', 'SOB-01_SOBP 맵.html'),
    ('p_sob02', 'SOB-02_직접 코드 할당.html'),
    ('p_prj01', 'PRJ-01_코드 프로젝트.html'),
    ('p_oid01', 'INF-04_OID 관리대장.html'),
    ('p_prj02w', 'PRJ-02_편집 프로젝트 목록.html'),
    ('p_prj03w', 'PRJ-03_편집 프로젝트 상세.html'),
    ('p_prj04', 'PRJ-04_교재(책) 등록·수정.html'),
    ('p_prj06', 'PRJ-06_PUI 코드.html'),
    ('p_inf01', 'INF-01_코드 관리 정보.html'),
]

INDEX_CSS = """
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:#eef1f6;color:#111827;padding:34px 30px 80px;
 font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif;font-size:13px}
h1{font-size:22px;margin:0 0 6px;letter-spacing:-.3px}
.sub{color:#64748b;font-size:13px;margin-bottom:22px;max-width:900px;line-height:1.7}
.sub code{background:#e2e8f0;border-radius:4px;padding:1px 6px;font-size:11.5px}
.grp{font-size:11px;color:#94a3b8;font-weight:800;letter-spacing:.6px;text-transform:uppercase;
 margin:26px 0 10px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px}
a.c{display:block;background:#fff;border:1px solid #dbe2ea;border-radius:12px;padding:15px 17px;
 text-decoration:none;color:inherit}
a.c:hover{border-color:#5f8ff0;box-shadow:0 6px 20px rgba(95,143,240,.16)}
a.c.todo{background:#f8fafc;border-style:dashed;color:#94a3b8;pointer-events:none}
.code{font-weight:800;font-size:12.5px;color:#5f8ff0;letter-spacing:.4px}
.nm{font-weight:700;font-size:14.5px;margin:3px 0 5px}
.st{font-size:11.5px;color:#64748b}
.badge{float:right;background:#eef2f7;color:#475569;border-radius:5px;padding:2px 7px;font-size:10.5px;font-weight:700}
.note{margin-top:30px;background:#fff;border:1px solid #dbe2ea;border-radius:12px;padding:16px 20px;
 font-size:12.5px;color:#334155;line-height:1.8;max-width:1000px}
.note b{color:#0f172a}
.note ol{margin:8px 0 0;padding-left:20px}
"""


def index(done, todo):
    def card(code, nm, states, file, ok=True):
        if ok:
            return ('<a class="c" href="%s"><span class="badge">상태 %d</span>'
                    '<div class="code">%s</div><div class="nm">%s</div>'
                    '<div class="st">%s</div></a>' % (file, states, code, nm, ', '.join(SUM[code])))
        return ('<a class="c todo"><span class="badge">예정</span>'
                '<div class="code">%s</div><div class="nm">%s</div>'
                '<div class="st">생성 예정</div></a>' % (code, nm))
    g1 = ''.join(card(*d) for d in done)
    g2 = ''.join(card(c, n, 0, '', False) for c, n in todo)
    todo_sec = ('<div class="grp">생성 예정</div><div class="cards">%s</div>' % g2) if todo else ''
    return """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NcodeCenter 화면 정의서</title><style>%s</style></head><body>
<h1>NcodeCenter 화면 정의서</h1>
<div class="sub">
IA <code>NcodeCenter_001_IA_001</code> v2.0. <b>1 화면코드 = HTML 1개</b>이며,
파일 하나에 그 화면의 <b>모든 상태</b>가 세로로 분리되어 담긴다.
각 상태 아래에는 <b>이 상태에서 가능한 액션</b> 표(요소 · 액션 · 결과/이동 · 메시지)가 붙는다.
프레임 1장 = <b>1440×900</b>이며, 화면당 프레임 높이는 내용에 따라 늘어난다.
<br><b>전체 %d개 화면 · 상태 %d장</b> — 각 화면의 상태 번호(S1, S2 …)는 같은 이름의 PRD
<code>docs/prd/</code> 의 <b>화면</b> 열과 짝을 이룬다. 개발은 <b>화면 정의서 + PRD</b> 를 함께 본다.
</div>
<div class="cards">%s</div>%s
<div class="note">
<b>보는 법</b>
<ol>
<li>상단 <b>상태 바로가기</b>로 그 화면의 상태를 오간다 — 상태 1개 = 프레임 1장(1440×900)</li>
<li>각 프레임 아래 <b>액션표</b>가 이 상태에서 가능한 조작과 그 결과·이동 화면·문구를 담는다</li>
<li>액션표의 <b>결과 · 이동</b> 열에 나오는 <code>화면코드</code>가 다음 화면이다</li>
</ol>
<b>PRD 와의 관계</b> — 이 문서는 <b>화면과 상태</b>를, PRD는 <b>기능과 정책</b>을 담당한다.
PRD 표의 <b>화면</b> 열에 적힌 상태 번호가 이 파일의 상태와 1:1로 대응한다.
</div>
</body></html>""" % (INDEX_CSS, len(done), sum(d[2] for d in done), g1, todo_sec)


SUM = {
    'PRD-00': ['로그인 5', '셸·권한 5', '모달·확인창 2', '공통 패턴 1'],
    'DSH-01': ['KPI 4 + 좌/우 360', '활동 없음', 'Section 배지 2종', 'STAFF 동일'],
    'MEM-01': ['11열 표+구분필터', '하위 필터', '결과없음', '종료 업체', '삭제 2', '초기화', '완료 알림'],
    'MEM-02': ['등록/수정', '필수 오류', '상위 회사', '전용 단가', '종료', '업무 원장 3'],
    'LOG-01': ['칩 3줄+92px 그리드', '종류 필터', '기록 없음', '전체 삭제', 'STAFF 차단'],
    'TKT-04': ['미선택', '범위 없음', '발급 준비', '범위 목록', '공통코드', '개별티켓', '사용기한', '범위 초과', '검증 7', '생성 성공'],
    'TKT-01': ['목록 8열', '계정 없음', '필터·검색', '결과 없음', '삭제 확인'],
    'TKT-02': ['등록 2단계', '사용처 중복', '권한 개별', '준비중 탭', 'App Key 선택', 'CasterN 미선택', '검증 6', '상세·수정', '키 발급', '연동 끊김', '계정 삭제'],
    'TKT-05': ['기본정보 탭', 'Key 정보 수정', '정산 미정', '정산 유료', '정산 체험', '정산 무료', '검증 내용', '검증 금액', '저장 완료', 'App Key 건', '삭제 확인', '기록 없음'],
    'TKT-03': ['목록 10열', '체험 만료·대장', '필터 3종', '정렬', '결과 없음', '이력 없음', '페이지', '삭제'],
    'TKT-06': ['항목 표시', '항목 검색', '결과 없음', '형식 오류'],
    'SOB-01': ['종류 5종 전환', '상태 필터 5', '고객사 검색', '번호 점프', '결과 없음 2', 'Owner 배지 3', 'Page 용량 2', '더 보기·툴팁', 'PDS4(S44)', 'OID 공유좌표'],
    'SOB-02': ['고객사 3단계', '사용 서비스 3종', '전용 잠금', '반대 코드 종류 선점', '공유 OWNER', '확인창 5', '할당 성공'],
    'PRJ-01': ['3단 구성', '발급 구성', '3중 필터', '공유 코드', '수정', '삭제', '결과 없음', '종료 고객사'],
    'INF-04': ['index 관리 업체', 'book 미분할', '필터·검색', '결과 없음'],
    'PRJ-02': ['좌우 구성', '코드 종류 필터', '검색', '결과 없음', '신규·삭제', '미선택', 'PRJ-05 4종', '삭제 확인'],
    'PRJ-03': ['편집·정산 2묶음', '전용 단가·할인', '기본 단가', '계산 근거', '공유 코드', '머리글 필터', '정렬 3단', '검색', '필터 해제', '페이지', '결과 없음', '초기화'],
    'PRJ-04': ['등록/수정', '완료잠금', '완료조건', '해제이력', '공유필수', '단가갱신', '필기펜', '삭제', '메모'],
    'PRJ-06': ['첫 할당 자동선택', '프로젝트·기능표', '이미지', '원본시트', '용량초과', '이미지 확대'],
    'INF-01': ['밑줄탭 · 범위표', '언어슬롯 전체', 'Cake 필터', '발급구조', '알아야할사항'],
}

TODO = []


def write_if_changed(path, text):
    """내용이 같으면 쓰지 않는다 — 수정 시각이 '실제로 바뀐 파일'만 가리키도록."""
    if os.path.exists(path) and io.open(path, encoding='utf-8').read() == text:
        return False
    io.open(path, 'w', encoding='utf-8').write(text)
    return True


def main():
    done = []
    changed = 0
    for mod, fn in MODULES:
        m = importlib.import_module(mod)
        html = m.build()
        p = os.path.join(OUT, fn)
        ch = write_if_changed(p, html)
        changed += ch
        n = html.count('<section class="board"')
        done.append((m.CODE, m.NAME, n, fn))
        print('  %-10s %-34s 상태 %2d개  %-34s %s'
              % (m.CODE, m.NAME, n, fn, '갱신' if ch else '변화 없음'))
    ch = write_if_changed(os.path.join(OUT, 'index.html'), index(done, TODO))
    changed += ch
    print('  %-10s %-34s %38s %s' % ('', 'index.html', '', '갱신' if ch else '변화 없음'))
    print('  ── 갱신 %d개 / 전체 %d개' % (changed, len(MODULES) + 1))


if __name__ == '__main__':
    main()
