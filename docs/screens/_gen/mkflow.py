# -*- coding: utf-8 -*-
"""동작 흐름 HTML 생성 — docs/NcodeCenter-Flow.html

소스: docs/NcodeCenter-Flow.md 의 mermaid 블록
용도: ① 브라우저에서 흐름 검토  ② 각 그림을 Figma 로 붙여넣기

Figma 붙여넣기용 처리 3가지 (페이지의 [SVG 복사] 가 복사 직전에 수행)
    1. htmlLabels:false  — 라벨을 <text> 로. 켜면 <foreignObject> 라 Figma 에서 글자가 사라진다
    2. 스타일 인라인      — <style> 클래스 규칙을 각 요소의 속성으로. Figma 의 CSS 해석이 불완전하다
    3. 화살촉 굽기        — <marker> 를 실제 폴리곤으로. Figma 는 marker 를 지원하지 않아 화살촉이 없어진다

    python mkflow.py
"""
import io, os, re, json

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(DOCS, 'NcodeCenter-Flow.md')
OUT = os.path.join(DOCS, 'NcodeCenter-Flow.html')

MERMAID_CDN = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js'
NUM = '①②③④⑤⑥⑦⑧⑨'


def blocks(md):
    """(제목, mermaid 소스) 목록 — 제목은 블록 직전의 ## 머리말"""
    out = []
    for m in re.finditer(r'```mermaid\n(.*?)```', md, re.S):
        heads = re.findall(r'^## (.+)$', md[:m.start()], re.M)
        out.append((heads[-1] if heads else '흐름', m.group(1).rstrip()))
    return out


def slug(title):
    """파일 저장용 이름 — '② 코드 할당 — SOB-01 → SOB-02' → '02-코드-할당'"""
    n = re.match(r'^\s*([' + NUM + r'])', title)
    idx = NUM.find(n.group(1)) + 1 if n else 0
    body = re.sub(r'^\s*[' + NUM + r']\s*', '', title).split('—')[0].strip()
    body = re.sub(r'[^0-9A-Za-z가-힣]+', '-', body).strip('-')
    return '%02d-%s' % (idx, body) if idx else body


PAGE = u'''<!doctype html>
<meta charset="utf-8">
<title>NcodeCenter — 동작 흐름</title>
<script src="%(cdn)s"></script>
<style>
  :root{ --bg:#f7f8fa; --card:#fff; --line:#e3e6ec; --ink:#1f2430; --dim:#6b7280; --key:#2f5fb3; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
       font:14px/1.7 "Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif}
  header{padding:28px 32px 20px;background:var(--card);border-bottom:1px solid var(--line)}
  h1{margin:0 0 10px;font-size:20px}
  .lead{color:var(--dim);max-width:860px}
  .lead b{color:var(--ink)}
  .steps{margin:14px 0 0;padding:0 0 0 18px;color:var(--dim);max-width:860px}
  .steps li{margin:3px 0}
  main{padding:24px 32px 60px;display:flex;flex-direction:column;gap:20px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
  .bar{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--line)}
  .bar h2{margin:0;font-size:15px;font-weight:600;flex:1}
  button{font:inherit;font-size:13px;padding:5px 12px;border:1px solid var(--line);
         background:#fff;border-radius:6px;cursor:pointer;color:var(--ink)}
  button:hover{border-color:var(--key);color:var(--key)}
  .fig{padding:18px 16px;overflow-x:auto;text-align:center}
  .fig svg{max-width:100%%;height:auto}
  #toast{position:fixed;left:50%%;bottom:28px;transform:translateX(-50%%);background:#1f2430;color:#fff;
         padding:9px 18px;border-radius:20px;opacity:0;transition:.2s;pointer-events:none;font-size:13px;z-index:20}
  #toast.on{opacity:1}
  footer{padding:0 32px 40px;color:var(--dim);font-size:13px;max-width:860px;line-height:1.9}
  code{background:#eef1f6;padding:1px 5px;border-radius:4px;font-size:12px}
</style>

<header>
  <h1>NcodeCenter — 동작 흐름</h1>
  <div class="lead">
    소스는 <code>docs/NcodeCenter-Flow.md</code> 다. 이 파일은 <b>보기용 + Figma 붙여넣기용</b>이고,
    흐름을 고칠 때는 <b>MD 를 고치고 <code>python docs/screens/_gen/mkflow.py</code></b> 를 다시 돌린다.
  </div>
  <ol class="steps">
    <li><b>[SVG 복사]</b> — Figma 가 못 읽는 부분을 복사 직전에 손봐서 클립보드에 넣는다.</li>
    <li>Figma 에서 <b>Ctrl+V</b> — 벡터 그룹으로 들어온다. 글자는 편집 가능한 텍스트 레이어다.</li>
    <li>색·폰트는 Figma 에서 CI 에 맞춰 바꾼다.</li>
  </ol>
</header>

<main id="main"></main>
<div id="toast"></div>

<footer>
  <b>복사할 때 하는 일 3가지</b> — 그냥 SVG 를 뽑아 붙이면 Figma 에서 깨지기 때문이다.<br>
  ① 라벨을 <code>&lt;text&gt;</code> 로 — 기본값 <code>&lt;foreignObject&gt;</code> 는 Figma 에서 <b>글자가 사라진다</b><br>
  ② <code>&lt;style&gt;</code> 의 색·굵기를 각 요소 속성으로 인라인 — Figma 의 CSS 해석이 불완전하다<br>
  ③ 화살촉 <code>&lt;marker&gt;</code> 를 실제 폴리곤으로 — Figma 는 marker 미지원이라 <b>화살촉이 없어진다</b>
</footer>

<script>
window.__D = %(data)s;

mermaid.initialize({
  startOnLoad:false, htmlLabels:false, securityLevel:'loose',
  flowchart:{ htmlLabels:false, curve:'basis', useMaxWidth:false, nodeSpacing:45, rankSpacing:55 },
  sequence:{ useMaxWidth:false },
  themeVariables:{ fontFamily:'Pretendard, Apple SD Gothic Neo, Malgun Gothic, sans-serif', fontSize:'14px' }
});

const toast = (m) => {
  const t = document.getElementById('toast');
  t.textContent = m; t.classList.add('on');
  clearTimeout(window.__tt); window.__tt = setTimeout(() => t.classList.remove('on'), 1800);
};

/* ② Figma 는 <style> 의 클래스 규칙을 온전히 읽지 못한다 → 계산된 값을 속성으로 박는다 */
const PROPS = ['fill','stroke','stroke-width','stroke-dasharray','stroke-linecap','stroke-linejoin',
               'opacity','fill-opacity','stroke-opacity','font-family','font-size','font-weight',
               'font-style','text-anchor','dominant-baseline'];
function inlineStyles(root){
  root.querySelectorAll('*').forEach(el => {
    if (el.tagName === 'style') return;
    const cs = getComputedStyle(el);
    PROPS.forEach(p => {
      const v = (cs.getPropertyValue(p) || '').trim();
      if (!v || v === 'normal' || v === 'auto') return;
      el.setAttribute(p, v);
    });
  });
}

/* ③ Figma 는 <marker> 를 버린다 → 화살촉을 실제 폴리곤으로 그려 붙인다 */
function bakeArrowheads(root){
  const SZ = 9, HW = 3.6;
  root.querySelectorAll('[marker-end],[marker-start]').forEach(el => {
    const tag = el.tagName.toLowerCase();
    let pts = null;
    try {
      if (tag === 'path' && el.getTotalLength) {
        const L = el.getTotalLength();
        if (!L) return;
        pts = { end:[el.getPointAtLength(L), el.getPointAtLength(Math.max(0, L - 4))],
                start:[el.getPointAtLength(0), el.getPointAtLength(Math.min(L, 4))] };
      } else if (tag === 'line') {
        const n = a => parseFloat(el.getAttribute(a) || 0);
        pts = { end:[{x:n('x2'),y:n('y2')}, {x:n('x1'),y:n('y1')}],
                start:[{x:n('x1'),y:n('y1')}, {x:n('x2'),y:n('y2')}] };
      }
    } catch(e) { return; }
    if (!pts) return;

    const color = el.getAttribute('stroke') || getComputedStyle(el).stroke || '#333';
    ['end','start'].forEach(side => {
      if (!el.hasAttribute('marker-' + side)) return;
      const mid = (String(el.getAttribute('marker-' + side)).match(/#([^)]+)/) || [])[1] || '';
      const tip = pts[side][0], back = pts[side][1];

      /* 마커가 다 화살촉인 건 아니다 — autonumber 는 순번 동그라미를 marker-start 로 붙인다.
         화살촉으로 그리면 선 양끝에 삼각형이 생긴다 */
      if (/sequencenumber/i.test(mid)) {
        const src = root.querySelector('#' + mid + ' circle');
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', tip.x.toFixed(2));
        c.setAttribute('cy', tip.y.toFixed(2));
        c.setAttribute('r', src ? (src.getAttribute('r') || 6) : 6);
        c.setAttribute('fill', src ? (src.getAttribute('fill') || color) : color);
        el.parentNode.insertBefore(c, el.nextSibling);   /* 숫자 text 는 뒤에 있어 위로 온다 */
        el.removeAttribute('marker-' + side);
        return;
      }
      if (!/arrow|head|cross|point/i.test(mid)) { el.removeAttribute('marker-' + side); return; }

      const a = Math.atan2(tip.y - back.y, tip.x - back.x);
      const p = (d, w) => [tip.x - Math.cos(a)*d + Math.cos(a + Math.PI/2)*w,
                           tip.y - Math.sin(a)*d + Math.sin(a + Math.PI/2)*w];
      const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      tri.setAttribute('points', [[tip.x, tip.y], p(SZ, HW), p(SZ, -HW)]
                                   .map(q => q[0].toFixed(2) + ',' + q[1].toFixed(2)).join(' '));
      tri.setAttribute('fill', color);
      tri.setAttribute('stroke', 'none');
      el.parentNode.insertBefore(tri, el.nextSibling);
      el.removeAttribute('marker-' + side);
    });
  });
}

function exportSvg(i){
  const live = document.querySelector('#fig' + i + ' svg');
  if (!live) return '';
  const box = live.viewBox.baseVal;
  const el = live.cloneNode(true);
  const d = window.__D[i];
  /* 계산값은 문서에 붙어 있어야 읽히므로, 복제본을 화면 밖에 잠깐 두고 처리한다 */
  const hold = document.createElement('div');
  hold.style.cssText = 'position:absolute;left:-99999px;top:0';
  hold.appendChild(el);
  document.body.appendChild(hold);
  inlineStyles(el);
  bakeArrowheads(el);
  document.body.removeChild(hold);

  /* 순번 숫자를 맨 나중에 그리게 옮긴다 — SVG 는 뒤에 온 것이 위에 그려지므로,
     방금 구운 순번 동그라미가 숫자를 덮는 것을 막는다 */
  el.querySelectorAll('.sequenceNumber').forEach(t => t.parentNode.appendChild(t));

  /* 스타일을 다 인라인했으니 <style> 은 죽은 규칙이다 — 지운다.
     루트 id 가 그대로면 Figma 레이어 이름이 'm0' 이 되므로 뜻이 있는 이름으로 바꾼다 */
  el.querySelectorAll('style').forEach(s => s.remove());
  el.setAttribute('id', d.slug);
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  t.textContent = d.title;
  el.insertBefore(t, el.firstChild);

  el.removeAttribute('style');
  if (box && box.width) {
    el.setAttribute('width', Math.round(box.width));
    el.setAttribute('height', Math.round(box.height));
  }
  el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(el);
}

async function copySvg(i){
  const s = exportSvg(i);
  if (!s) { toast('그림을 찾지 못했습니다'); return; }
  try {
    await navigator.clipboard.writeText(s);            /* 대개 여기서 끝난다 */
    toast('복사했습니다 · Figma 에서 Ctrl+V');
    return;
  } catch(e) { /* 아래로 */ }
  try {
    const ta = document.createElement('textarea');     /* 구형·file:// 대비 */
    ta.value = s;
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) { toast('복사했습니다 · Figma 에서 Ctrl+V'); return; }
  } catch(e) { /* 아래로 */ }
  /* 브라우저가 클립보드를 막으면 파일로 떨군다 — Figma 로 끌어다 놓으면 된다 */
  saveSvg(i, window.__D[i].slug);
  toast('복사가 막혀 파일로 저장했습니다 · Figma 로 끌어다 놓으세요');
}

function saveSvg(i, name){
  const s = exportSvg(i);
  if (!s) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([s], {type:'image/svg+xml'}));
  a.download = name + '.svg';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(name + '.svg 저장');
}

(async () => {
  const main = document.getElementById('main');
  for (let i = 0; i < window.__D.length; i++) {
    const d = window.__D[i];
    const card = document.createElement('section');
    card.className = 'card';
    card.innerHTML =
      '<div class="bar"><h2></h2>' +
      '<button data-act="copy">SVG 복사</button>' +
      '<button data-act="save">SVG 저장</button></div>' +
      '<div class="fig" id="fig' + i + '"></div>';
    card.querySelector('h2').textContent = d.title;
    card.querySelector('[data-act=copy]').onclick = () => copySvg(i);
    card.querySelector('[data-act=save]').onclick = () => saveSvg(i, d.slug);
    main.appendChild(card);
    try {
      const out = await mermaid.render('m' + i, d.src);
      document.getElementById('fig' + i).innerHTML = out.svg;
    } catch(e) {
      document.getElementById('fig' + i).textContent = '렌더 실패: ' + e;
    }
  }
})();
</script>
'''


def main():
    md = io.open(SRC, encoding='utf-8').read()
    data = [{'title': t, 'slug': slug(t), 'src': s} for t, s in blocks(md)]
    html = PAGE % {'cdn': MERMAID_CDN,
                   'data': json.dumps(data, ensure_ascii=False, indent=1)}
    old = io.open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else None
    if old == html:
        print('  NcodeCenter-Flow.html  변화 없음 (%d개)' % len(data))
        return
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(html)
    print('  NcodeCenter-Flow.html  갱신 - %d' % len(data))
    for d in data:
        print('    - %s.svg' % d['slug'])


if __name__ == '__main__':
    main()
