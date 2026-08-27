# -*- coding: utf-8 -*-
"""PRD ↔ 화면정의서(HTML) 상태 대응 검사.

기준 순서: JSX(실물 화면) → PRD 정정 → PRD 상태 목록으로 HTML 생성.
이 스크립트는 마지막 고리를 검사한다 — PRD 표의 '화면' 열(S1, S2 …)과
HTML 의 상태 보드가 1:1 로 맞는지.

    python check.py            전체
    python check.py SOB-01     한 화면만
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCREENS = os.path.dirname(HERE)
PRDDIR = os.path.join(os.path.dirname(SCREENS), 'prd')

sys.path.insert(0, HERE)
from build import MODULES  # noqa: E402

# PRD 표의 '화면' 열에 쓰인 상태 번호만 잡는다.
# Section 번호(S0·S14 처럼 본문에 섞인 것)와 구분하려고 셀 경계/구분점을 요구한다.
PAT = re.compile(r'(?:\| |\(|· )(S\d+)(?= [·|)]|\)|\s*\||$)', re.M)


def states_of_html(path):
    h = io.open(path, encoding='utf-8').read()
    out = []
    for m in re.finditer(r'<section class="board" id="(S\d+)".*?<h3[^>]*>(.*?)</h3>', h, re.S):
        title = re.sub(r'<[^>]+>', ' ', m.group(2))
        title = re.sub(r'\s+', ' ', title).strip()
        out.append((m.group(1), title))
    if not out:
        out = [(x, '') for x in re.findall(r'id="(S\d+)"', h)]
    return out


def check(code, html_name):
    hp = os.path.join(SCREENS, html_name)
    prd = None
    for f in os.listdir(PRDDIR):
        if f.startswith(code + '_'):
            prd = os.path.join(PRDDIR, f)
            break
    hs = states_of_html(hp)
    hids = [i for i, _ in hs]
    if not prd:
        print('  %-7s PRD 없음' % code)
        return False
    p = io.open(prd, encoding='utf-8').read()
    pids = sorted(set(PAT.findall(p)), key=lambda x: int(x[1:]))
    if not pids:
        print('  %-7s ⚠  PRD 에 화면 상태 번호가 없음 — 미연결 (HTML %d상태)' % (code, len(hids)))
        return False
    only_h = [x for x in hids if x not in pids]
    only_p = [x for x in pids if x not in hids]
    if not only_h and not only_p:
        print('  %-7s ✅ %2d상태 일치' % (code, len(hids)))
        return True
    print('  %-7s ❌ HTML %d / PRD %d' % (code, len(hids), len(pids)))
    if only_h:
        d = dict(hs)
        for x in only_h:
            print('           PRD 미인용  %-4s %s' % (x, d.get(x, '')))
    if only_p:
        print('           HTML 없음   %s' % ' '.join(only_p))
    return False


def main():
    want = sys.argv[1] if len(sys.argv) > 1 else None
    ok = bad = 0
    print('PRD ↔ 화면정의서 상태 대응')
    for mod, fn in MODULES:
        code = fn.split('_')[0]
        if want and code != want:
            continue
        if check(code, fn):
            ok += 1
        else:
            bad += 1
    print('  ── 일치 %d · 미연결/불일치 %d' % (ok, bad))


if __name__ == '__main__':
    main()
