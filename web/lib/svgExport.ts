// mermaid SVG → Figma 에 붙일 수 있는 SVG `PC-249`
// mermaid 는 색 · 선 · 글꼴을 <style> 의 클래스 규칙(#id .node rect …)으로 준다. Figma 는 그 규칙을 읽지 못해
// 도형이 검게 채워지고 화살촉(<marker>)도 사라진다. 그래서 내보내기 전에
//   ① 계산된 스타일을 각 요소의 속성으로 박고 ② 화살촉을 실제 다각형으로 그리고 ③ <style> 을 지운다.
// docs/NcodeCenter-Flow.html(mkflow.py)의 내보내기와 같은 방식이다.

const PROPS = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin",
  "opacity", "fill-opacity", "stroke-opacity", "font-family", "font-size", "font-weight",
  "font-style", "text-anchor", "dominant-baseline"];
const NS = "http://www.w3.org/2000/svg";

function inlineStyles(root: Element) {
  root.querySelectorAll("*").forEach((el) => {
    if (el.tagName === "style") return;
    const cs = getComputedStyle(el);
    PROPS.forEach((p) => {
      const v = (cs.getPropertyValue(p) || "").trim();
      if (!v || v === "normal" || v === "auto") return;
      el.setAttribute(p, v);
    });
  });
}

// Figma 는 <marker> 를 버린다 → 화살촉을 다각형으로
function bakeArrowheads(root: Element) {
  const SZ = 9, HW = 3.6;
  root.querySelectorAll("[marker-end],[marker-start]").forEach((node) => {
    const el = node as SVGGeometryElement;
    const tag = el.tagName.toLowerCase();
    type P = { x: number; y: number };
    let pts: { end: [P, P]; start: [P, P] } | null = null;
    try {
      if (tag === "path" && el.getTotalLength) {
        const L = el.getTotalLength();
        if (!L) return;
        pts = { end: [el.getPointAtLength(L), el.getPointAtLength(Math.max(0, L - 4))],
          start: [el.getPointAtLength(0), el.getPointAtLength(Math.min(L, 4))] };
      } else if (tag === "line") {
        const n = (a: string) => parseFloat(el.getAttribute(a) || "0");
        pts = { end: [{ x: n("x2"), y: n("y2") }, { x: n("x1"), y: n("y1") }],
          start: [{ x: n("x1"), y: n("y1") }, { x: n("x2"), y: n("y2") }] };
      }
    } catch { return; }
    if (!pts) return;
    const color = el.getAttribute("stroke") || getComputedStyle(el).stroke || "#333";
    (["end", "start"] as const).forEach((side) => {
      if (!el.hasAttribute("marker-" + side)) return;
      const mid = (String(el.getAttribute("marker-" + side)).match(/#([^)]+)/) || [])[1] || "";
      if (!/arrow|head|cross|point/i.test(mid)) { el.removeAttribute("marker-" + side); return; }
      const [tip, back] = pts![side];
      const a = Math.atan2(tip.y - back.y, tip.x - back.x);
      const p = (d: number, w: number) => [tip.x - Math.cos(a) * d + Math.cos(a + Math.PI / 2) * w,
        tip.y - Math.sin(a) * d + Math.sin(a + Math.PI / 2) * w];
      const tri = document.createElementNS(NS, "polygon");
      tri.setAttribute("points", [[tip.x, tip.y], p(SZ, HW), p(SZ, -HW)].map((q) => q[0].toFixed(2) + "," + q[1].toFixed(2)).join(" "));
      tri.setAttribute("fill", color);
      tri.setAttribute("stroke", "none");
      el.parentNode?.insertBefore(tri, el.nextSibling);
      el.removeAttribute("marker-" + side);
    });
  });
}

/** 화면에 그려진 mermaid SVG 를 Figma 용 문자열로 — 색 · 화살촉을 속성으로 박고 <style> 을 지운다 */
export function exportFigmaSvg(live: SVGSVGElement, name: string, title: string): string {
  const box = live.viewBox?.baseVal;
  const el = live.cloneNode(true) as SVGSVGElement;
  // 계산값은 문서에 붙어 있어야 읽힌다 — 복제본을 화면 밖에 잠깐 둔다(루트 id 가 같아 mermaid 규칙이 그대로 걸린다)
  const hold = document.createElement("div");
  hold.style.cssText = "position:absolute;left:-99999px;top:0";
  hold.appendChild(el);
  document.body.appendChild(hold);
  inlineStyles(el);
  bakeArrowheads(el);
  document.body.removeChild(hold);
  el.querySelectorAll("style").forEach((s) => s.remove());
  el.setAttribute("id", name);   // Figma 레이어 이름
  // 배경은 흰색 — 투명으로 두지 않는다 `PC-250`
  const bg = document.createElementNS(NS, "rect");
  bg.setAttribute("x", String(box?.x ?? 0)); bg.setAttribute("y", String(box?.y ?? 0));
  bg.setAttribute("width", String(box?.width || "100%")); bg.setAttribute("height", String(box?.height || "100%"));
  bg.setAttribute("fill", "#ffffff"); bg.setAttribute("stroke", "none");
  el.insertBefore(bg, el.firstChild);
  const t = document.createElementNS(NS, "title");
  t.textContent = title;
  el.insertBefore(t, el.firstChild);
  el.removeAttribute("style");
  el.removeAttribute("class");
  if (box && box.width) {
    el.setAttribute("width", String(Math.round(box.width)));
    el.setAttribute("height", String(Math.round(box.height)));
  }
  el.setAttribute("xmlns", NS);
  return new XMLSerializer().serializeToString(el);
}
