# -*- coding: utf-8 -*-
"""PRD Sync(Figma 플러그인)용 마크다운 생성 — docs/figma/prd/

두 곳에서 모은다.
    docs/screens/_gen/p_*.py  → 화면 개요 · 상태 구성 · 상태별 변화
    docs/prd/*.md             → 기능 개요 · 화면 흐름 · 정책 · 사용법 · 연결 화면 · 문서 이력
                                (문서 이력까지 넣어야 PRD 를 고칠 때마다 이 파일도 함께 갱신된다 `PC-078`)
화면 정의서(HTML)와 같은 소스를 쓰므로 HTML 과 MD 가 어긋나지 않는다.

플러그인이 읽는 형식
    **화면 ID**: SOB-01
    ## 2. 화면 구성          → 프레임 왼쪽 카드 (첫 상태 프레임에만)
    ## 3. 상태별 변화        → 프레임 오른쪽 카드
    ### SOB-01: S1 제목      → 프레임 이름의 상태 ID 와 매칭

플러그인은 위 두 ## 머리말만 읽고 나머지 ## 절은 버린다. 그래서 PRD 절은
`## 1. 기능 개요` 가 아니라 「화면 구성」 안의 `### 기능 개요` 로 낮춰 넣는다.

    python mkmd.py
"""
import io, os, re, sys, importlib, html as _html

HERE = os.path.dirname(os.path.abspath(__file__))
SCREENS = os.path.dirname(HERE)
DOCS = os.path.dirname(SCREENS)
# 플러그인 폴더 드롭다운이 '/prd' 로 끝나는 경로만 보여준다 → docs/figma/prd
OUT = os.path.join(DOCS, 'figma', 'prd')

sys.path.insert(0, HERE)
import shell                                  # noqa: E402
from build import MODULES                     # noqa: E402

ACT_HEAD = ('요소', '액션', '결과 · 이동', '메시지 · 비고')

ROOT = os.path.dirname(DOCS)

# 손으로 쓴 PRD(docs/prd)에서 가져와 「화면 구성」 카드에 실을 절.
# 플러그인은 '화면 구성' 을 포함한 ## 머리말 아래만 왼쪽 카드로 붙이므로
# 이 절들은 ## 이 아니라 ### 로 낮춰 그 안에 넣는다.
PRD_SECTIONS = ('기능 개요', '화면 흐름', '정책', '사용법', '연결 화면', '문서 이력')
# 문서 이력은 맨 뒤로 보낸다 — 카드를 열자마자 변경 표부터 보이지 않게 `PC-078`
LAST_SECTIONS = ('문서 이력',)


def demote(body):
    """PRD 본문의 머리말을 한 단계 낮춘다 — ### 4.1 → #### 4.1.

    ### 로 두면 플러그인이 별도 카드로 쪼개므로, #### 이하로 낮춰
    상위 절 카드 안의 그룹 제목(**▶ …**)이 되게 한다.
    """
    out, fence = [], False
    for ln in body.split('\n'):
        if ln.lstrip().startswith('```'):
            fence = not fence
        elif not fence:
            m = re.match(r'^(#{3,5})(\s)', ln)
            if m:
                ln = '#' + ln
        out.append(ln)
    return '\n'.join(out)


def prd_sections(prd_rel):
    """docs/prd/*.md 에서 PRD_SECTIONS 에 해당하는 ## 절을 [(제목, 본문)] 로."""
    path = os.path.join(ROOT, prd_rel.replace('/', os.sep))
    if not os.path.exists(path):
        return []
    src = io.open(path, encoding='utf-8').read()
    # ## N. 제목 단위로 자른다
    parts = re.split(r'^##\s+(\d+)\.\s*(.+?)\s*$', src, flags=re.M)[1:]
    found = []
    for i in range(0, len(parts) - 2, 3):
        title, body = parts[i + 1], parts[i + 2]
        if not any(k in title for k in PRD_SECTIONS):
            continue
        body = re.sub(r'^\s*---\s*$', '', body, flags=re.M).strip()
        if body:
            found.append((title, demote(body)))
    return found


def fid(sid):
    """Figma 상태 ID — 두 자리로 맞춘다.

    플러그인의 상태 매칭이 부분 일치(경계 없음)라 'S1' 이 'S10'~'S17' 에도 걸린다.
    'S01' 처럼 자리를 맞추면 겹치지 않는다. 화면 정의서의 S1 = 여기 S01.
    """
    m = re.match(r'^S(\d+)$', str(sid))
    return 'S%02d' % int(m.group(1)) if m else str(sid)


def md(src, cell=False):
    """정의서 조각(HTML) → 마크다운. cell=True 면 표 한 칸 안에서 쓸 형태."""
    if src is None:
        return ''
    s = str(src)
    s = re.sub(r'<br\s*/?>', ' · ' if cell else chr(10)*2, s)
    s = re.sub(r'</?(b|strong)>', '**', s)
    s = re.sub(r'</?(s|del)>', '~~', s)
    s = re.sub(r'<code>(.*?)</code>', r'`\1`', s, flags=re.S)
    s = re.sub(r'<[^>]+>', '', s)
    s = _html.unescape(s)
    s = s.replace('|', '·')                   # 표 셀 깨짐 방지
    s = re.sub(r'\*\*\s*\*\*', '', s)          # 빈 강조 제거
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(chr(10) + '{3,}', chr(10) * 2, s)
    return s.strip()


def acts_table(actions):
    if not actions:
        return ''
    rows = ['| %s |' % ' | '.join(ACT_HEAD),
            '|%s' % ('---|' * len(ACT_HEAD))]
    for a in actions:
        cells = [md(c, cell=True) or '—' for c in a]
        cells += ['—'] * (len(ACT_HEAD) - len(cells))
        rows.append('| %s |' % ' | '.join(cells[:len(ACT_HEAD)]))
    return '\n'.join(rows)


def build_md(code, info):
    name, intro, boards = info['name'], info['intro'], info['boards']
    prd_link = info['prd']   # 저장소 기준 경로 (플러그인이 링크를 지우므로 문자열로)

    out = ['# %s · %s' % (code, name), '',
           '**화면 ID**: %s' % code, '',
           '> 원본 — 화면 정의서 `docs/screens/` · PRD `%s`' % prd_link,
           '> 화면 구성·상태는 화면 정의서에서, 기능 개요·흐름·정책·사용법·연결 화면·문서 이력은 '
           'PRD 에서 **자동으로 모아** 만든다. 이 파일을 직접 고치지 말 것.',
           '', '---', '',
           '## 2. 화면 구성', '',
           '### 개요', '', md(intro), '']

    # 손으로 쓴 PRD 의 기능 개요 · 흐름 · 정책 · 사용법 · 연결 화면 (+ 문서 이력은 맨 뒤) `PC-078`
    secs = prd_sections(prd_link)
    head = [s for s in secs if not any(k in s[0] for k in LAST_SECTIONS)]
    tail = [s for s in secs if any(k in s[0] for k in LAST_SECTIONS)]
    for title, body in head + tail:
        out += ['### %s' % title, '', body, '']

    tags = [b[2] for b in boards if b[2]]
    if tags:
        seen, uniq = set(), []
        for t in tags:
            if t not in seen:
                seen.add(t)
                uniq.append(t)
        out += ['### 상태 구성', '',
                '이 화면은 **%d개 상태**로 나뉜다. 구분: %s'
                % (len(boards), ' · '.join(uniq)), '',
                '| 상태 | Figma 프레임 | 제목 | 구분 |', '|---|---|---|---|']
        for sid, title, tag, _n, _f, _a in boards:
            out.append('| `%s` | `%s:%s` | %s | %s |'
                       % (sid, code, fid(sid), md(title, cell=True),
                          md(tag, cell=True) or '—'))
        out.append('')

    out += ['---', '', '## 3. 상태별 변화', '']
    for sid, title, tag, note, _frame, actions in boards:
        out.append('### %s: %s %s' % (code, fid(sid), md(title)))
        out.append('')
        out.append('*화면 정의서 상태 `%s`*' % sid)
        out.append('')
        if tag:
            out.append('**구분** — %s' % md(tag))
            out.append('')
        if note:
            out.append(md(note))
            out.append('')
        t = acts_table(actions)
        if t:
            out.append(t)
            out.append('')
    return '\n'.join(out).rstrip() + '\n'


def write_if_changed(path, text):
    if os.path.exists(path) and io.open(path, encoding='utf-8').read() == text:
        return False
    io.open(path, 'w', encoding='utf-8').write(text)
    return True


def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    for mod, _fn in MODULES:
        importlib.import_module(mod).build()   # shell.COLLECTED 채움

    frames, changed = [], 0
    for mod, fn in MODULES:
        m = sys.modules[mod]
        info = shell.COLLECTED[m.CODE]
        base = fn[:-5]                          # .html 제거
        path = os.path.join(OUT, base + '.md')
        ch = write_if_changed(path, build_md(m.CODE, info))
        changed += ch
        print('  %-8s 상태 %2d개  %-34s %s'
              % (m.CODE, len(info['boards']), base + '.md', '갱신' if ch else '변화 없음'))
        frames.append((m.CODE, m.NAME, info['boards']))

    # 프레임 이름 목록
    lines = ['# Figma 프레임 이름 규칙', '',
             '`PRD Sync` 플러그인은 **프레임 이름**에서 화면 ID 와 상태 ID 를 읽는다.',
             '아래 이름을 그대로 쓰면 각 프레임 옆에 해당 상태의 설명이 붙는다.', '',
             '```', 'SOB-01:S01 기본 — PDS3 · 상태 전체',
             '  └────┘ └┘', '  화면 ID  상태 ID', '```', '',
             '- 콜론 뒤 공백은 있어도 되고 없어도 된다 (`SOB-01: S1` 도 인식).',
             '- 대괄호 형태 `[SOB-01:S1] …` 도 인식한다.',
             '- **각 화면의 S01 프레임 왼쪽**에만 「화면 구성」 카드가 추가로 붙는다.',
             '- 상태 번호는 **두 자리**다 — 화면 정의서의 `S1` 이 여기서는 `S01`.',
             '  플러그인의 상태 매칭이 부분 일치라 `S1` 로 두면 `S10`~`S17` 까지 함께 걸린다.', '',
             '---', '']
    total = 0
    for code, name, boards in frames:
        lines += ['## %s · %s (%d)' % (code, name, len(boards)), '', '```']
        for sid, title, _t, _n, _f, _a in boards:
            lines.append('%s:%s %s' % (code, fid(sid), md(title, cell=True)))
            total += 1
        lines += ['```', '']
    lines.append('전체 **%d개 프레임**' % total)
    fp = os.path.join(OUT, 'FRAME-NAMES.md')
    changed += write_if_changed(fp, '\n'.join(lines) + '\n')
    print('  %-8s %-46s %s' % ('', 'FRAME-NAMES.md', '갱신'))
    print('  ── 상태 %d개 · 갱신 %d개' % (total, changed))


if __name__ == '__main__':
    main()
