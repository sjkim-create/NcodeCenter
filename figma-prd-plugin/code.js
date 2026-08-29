/**
 * PRD Sync Figma Plugin
 *
 * 화면 ID별 PRD 데이터를 기반으로 Figma 프레임 옆에 설명 레이어를 생성합니다.
 */

// UI 표시
figma.showUI(__html__, {
  width: 350,
  height: 480,
  themeColors: true
});

// UI에서 메시지 수신
figma.ui.onmessage = async (msg) => {

  if (msg.type === 'sync-selected') {
    await syncSelectedFrames();
  }

  if (msg.type === 'sync-all') {
    await syncAllFrames();
  }

  if (msg.type === 'sync-all-pages') {
    await syncAllPages();
  }

  if (msg.type === 'remove-all-prd') {
    await removeAllPrdLayers();
  }

  if (msg.type === 'remove-all-pages-prd') {
    await removeAllPagesPrdLayers();
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }

  // 설정 저장
  if (msg.type === 'save-settings') {
    await figma.clientStorage.setAsync('github-settings', msg.settings);
    figma.ui.postMessage({ type: 'settings-saved' });
  }

  // 설정 로드
  if (msg.type === 'load-settings') {
    const settings = await figma.clientStorage.getAsync('github-settings');
    figma.ui.postMessage({ type: 'settings-loaded', settings: settings || null });
  }
};

/**
 * 선택된 프레임에 PRD 레이어 추가
 */
async function syncSelectedFrames() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify('프레임을 선택해주세요', { error: true });
    return;
  }

  let successCount = 0;
  let skipCount = 0;

  for (const node of selection) {
    if (node.type === 'FRAME') {
      const extracted = extractScreenId(node.name);
      if (extracted) {
        const success = await createPrdLayer(node, extracted.screenId, extracted.stateId);
        if (success) successCount++;
      } else {
        // 화면 ID가 없는 프레임은 조용히 스킵
        skipCount++;
      }
    }
  }

  if (successCount > 0) {
    figma.notify(`완료: ${successCount}개 처리됨` + (skipCount > 0 ? ` (${skipCount}개 스킵)` : ''));
  } else {
    figma.notify('처리할 화면 ID가 있는 프레임이 없습니다', { error: true });
  }
  figma.ui.postMessage({ type: 'sync-complete' });
}

/**
 * 모든 프레임에 PRD 레이어 추가
 */
async function syncAllFrames() {
  // 최상위 프레임만 가져옴 (PRD 레이어 제외)
  const frames = figma.currentPage.children.filter(node => {
    if (node.type !== 'FRAME') return false;
    try { if (node.getPluginData('prd-layer')) return false; } catch (e) {}
    return true;
  });
  let successCount = 0;
  let failCount = 0;
  let total = 0;

  for (const frame of frames) {
    try {
      const extracted = extractScreenId(frame.name);
      if (extracted) {
        total++;
        figma.ui.postMessage({
          type: 'progress',
          current: total,
          screenId: extracted.screenId,
          stateId: extracted.stateId
        });

        const success = await createPrdLayer(frame, extracted.screenId, extracted.stateId);
        if (success) successCount++;
        else failCount++;
      }
    } catch (e) {
      // 노드가 삭제된 경우 스킵
      console.log('프레임 스킵:', e.message);
    }
  }

  figma.notify(`완료: ${successCount}개 성공, ${failCount}개 실패`);
  figma.ui.postMessage({ type: 'sync-complete' });
}

/**
 * 모든 페이지의 프레임에 PRD 레이어 추가
 */
async function syncAllPages() {
  let successCount = 0;
  let failCount = 0;
  let total = 0;

  for (const page of figma.root.children) {
    await figma.setCurrentPageAsync(page);
    const frames = page.children.filter(node => {
      if (node.type !== 'FRAME') return false;
      try { if (node.getPluginData('prd-layer')) return false; } catch (e) {}
      return true;
    });

    for (const frame of frames) {
      try {
        const extracted = extractScreenId(frame.name);
        if (extracted) {
          total++;
          figma.ui.postMessage({
            type: 'progress',
            current: total,
            screenId: extracted.screenId,
            stateId: extracted.stateId
          });

          const success = await createPrdLayer(frame, extracted.screenId, extracted.stateId);
          if (success) successCount++;
          else failCount++;
        }
      } catch (e) {
        console.log('프레임 스킵:', e.message);
      }
    }
  }

  figma.notify(`전체 페이지 완료: ${successCount}개 성공, ${failCount}개 실패`);
  figma.ui.postMessage({ type: 'sync-complete' });
}

// PRD 응답 대기용 Promise resolver 맵
const prdResolvers = {};

/**
 * PRD 레이어 생성 (응답까지 대기)
 */
async function createPrdLayer(frame, screenId, stateId) {
  try {
    // Promise로 응답 대기
    const resultPromise = new Promise(function (resolve) {
      prdResolvers[frame.id] = resolve;
    });

    figma.ui.postMessage({
      type: 'fetch-prd',
      screenId: screenId,
      stateId: stateId,
      frameId: frame.id,
      frameName: frame.name
    });

    await resultPromise;
    return true;
  } catch (error) {
    console.error('PRD 레이어 생성 실패:', error);
    return false;
  }
}

// 색상 정의
const COLORS = {
  white: { r: 1, g: 1, b: 1 },
  black: { r: 0.118, g: 0.118, b: 0.118 },  // #1E1E1E
  gray1: { r: 0.961, g: 0.961, b: 0.961 },  // #F5F5F5
  gray2: { r: 0.851, g: 0.851, b: 0.851 },  // #D9D9D9
  canvas: { r: 0.933, g: 0.933, b: 0.933 }, // #EEEEEE — 카드 대비용 배경
  tagRed: { r: 0.553, g: 0, b: 0.008 },     // #8D0002
};

// 레이아웃 (텍스트 resize/STRETCH 실험 금지 — 수치만 조정)
const LAYOUT = {
  minWidth: 480,
  maxCardWidth: 840, // 텍스트 위주 Description 카드
  maxTableCardWidth: 2000, // 표가 있을 때 카드 상한 (잘림 방지)
  maxTableColWidth: 400, // 긴 셀은 이 너비에서 줄바꿈
  cardGap: 12,
  framePad: 20,
  boxPad: 20,
  // Description 좌측 태그(+itemSpacing 4) 때문에 Text 영역이 좁아짐
  tagReserve: 44,
  titleSize: 18,
  bodySize: 16,
  bodyLineHeight: 155,
};

/**
 * 메인 컨테이너 프레임 생성 헬퍼
 * 내용 높이가 화면(프레임) 높이를 넘으면 2단 이상 다단으로 분배
 *
 * 분배 방식:
 * - 카드 개수 균등 아님
 * - 문서 순서 유지한 연속 구간으로 단 분할
 * - 각 단의 최대 높이가 최소가 되도록 DP (높이 균형)
 */
function buildDescriptionFrame(name, idTableValue, sections, maxHeight) {
  var MIN_WIDTH = LAYOUT.minWidth;
  var FRAME_PAD = LAYOUT.framePad;
  var CARD_GAP = LAYOUT.cardGap;
  var COL_GAP = 16;
  var MAX_COLS = 6; // 과도한 가로 확장 방지

  // 1) 프레임 생성 전에 필요한 너비를 먼저 계산
  var maxTableWidth = 0;
  for (var s = 0; s < sections.length; s++) {
    var segs = sections[s].bodySegments || [];
    for (var j = 0; j < segs.length; j++) {
      if (segs[j].type === 'table') {
        var tw = calcTableWidth(segs[j].headers, segs[j].rows);
        if (tw > maxTableWidth) maxTableWidth = tw;
      }
    }
  }
  // 카드 너비: 표가 있으면 표 내용 기준으로 넓힘 (잘림 방지)
  var minCardWidth = MIN_WIDTH - FRAME_PAD * 2;
  if (minCardWidth < 320) minCardWidth = 320;
  var rawCardWidth = maxTableWidth > 0
    ? maxTableWidth + LAYOUT.boxPad * 2 + LAYOUT.tagReserve
    : minCardWidth;
  var cardWidth = Math.max(minCardWidth, rawCardWidth);
  var cardCap = maxTableWidth > 0 ? LAYOUT.maxTableCardWidth : LAYOUT.maxCardWidth;
  cardWidth = Math.min(cardCap, cardWidth);

  // 단 1개 기준 컨텐츠 너비 = 카드 너비
  // 메인 프레임 총 너비 = 좌우 패딩 + (카드*단) + (단 간격)
  var colContentWidth = cardWidth;
  var innerWidth = cardWidth;

  // 2) 섹션 Description box 생성
  var allBoxes = [];
  for (var s = 0; s < sections.length; s++) {
    var descBox = createDescriptionBox(sections[s].tag, sections[s].title, sections[s].body, sections[s].bodySegments, innerWidth);
    allBoxes.push(descBox);
  }

  // 표 확장으로 카드가 넓어진 경우 단 너비 재계산
  for (var bw = 0; bw < allBoxes.length; bw++) {
    if (allBoxes[bw].width > colContentWidth) {
      colContentWidth = allBoxes[bw].width;
    }
  }

  // 3) 총 높이 → 필요한 단 수 (1~MAX_COLS)
  //    ※ 카드 N등분이 아니라, 화면 높이에 맞춰 "몇 단으로 나누면 세로가 들어가는지"
  var heights = [];
  var contentH = 0;
  for (var b = 0; b < allBoxes.length; b++) {
    // 측정 실패(0) 시 분배가 첫 단에 몰리는 것 방지
    var h = Math.max(allBoxes[b].height || 0, 48);
    heights.push(h + CARD_GAP);
    contentH += heights[b];
  }
  var totalH = contentH + 52; // ID 테이블

  var targetH = Math.max(maxHeight || 1, 1);
  var numCols = 1;
  if (allBoxes.length > 1 && totalH > targetH) {
    numCols = Math.ceil(totalH / targetH);
    numCols = Math.max(2, Math.min(numCols, MAX_COLS, allBoxes.length));
  }

  // 4) 문서 순서 유지 + 단 높이 균형 분할
  var columns = partitionBoxesBalanced(allBoxes, heights, numCols);
  numCols = columns.length;

  // 5) 메인 프레임 조립
  var contentRowWidth = numCols === 1
    ? colContentWidth
    : colContentWidth * numCols + COL_GAP * (numCols - 1);
  var totalFrameWidth = contentRowWidth + FRAME_PAD * 2;

  var mainFrame = figma.createFrame();
  mainFrame.name = name;
  mainFrame.setPluginData('prd-layer', 'true');
  mainFrame.layoutMode = 'VERTICAL';
  mainFrame.primaryAxisSizingMode = 'AUTO';
  mainFrame.counterAxisSizingMode = 'FIXED';
  mainFrame.resize(totalFrameWidth, 100);
  mainFrame.itemSpacing = CARD_GAP;
  mainFrame.paddingTop = FRAME_PAD;
  mainFrame.paddingBottom = FRAME_PAD;
  mainFrame.paddingLeft = FRAME_PAD;
  mainFrame.paddingRight = FRAME_PAD;
  mainFrame.fills = [{ type: 'SOLID', color: COLORS.canvas }];
  mainFrame.cornerRadius = 12;

  if (idTableValue) {
    var idRow = createIdTable(idTableValue);
    idRow.layoutAlign = 'STRETCH';
    mainFrame.appendChild(idRow);
  }

  if (numCols === 1) {
    for (var b = 0; b < columns[0].length; b++) {
      mainFrame.appendChild(columns[0][b]);
    }
    return mainFrame;
  }

  // 다단 컨테이너
  var rowFrame = figma.createFrame();
  rowFrame.name = 'Columns-' + numCols;
  rowFrame.layoutMode = 'HORIZONTAL';
  rowFrame.primaryAxisSizingMode = 'FIXED';
  rowFrame.counterAxisSizingMode = 'AUTO';
  rowFrame.layoutAlign = 'STRETCH';
  rowFrame.resize(contentRowWidth, 100);
  rowFrame.itemSpacing = COL_GAP;
  rowFrame.fills = [];
  setLayoutSizing(rowFrame, 'FIXED', 'HUG');

  for (var c = 0; c < numCols; c++) {
    var col = figma.createFrame();
    col.name = 'Col-' + (c + 1);
    col.layoutMode = 'VERTICAL';
    col.primaryAxisSizingMode = 'AUTO';
    col.counterAxisSizingMode = 'FIXED';
    col.layoutGrow = 0;
    col.resize(colContentWidth, 100);
    col.itemSpacing = CARD_GAP;
    col.fills = [];
    setLayoutSizing(col, 'FIXED', 'HUG');
    for (var i = 0; i < columns[c].length; i++) {
      columns[c][i].layoutAlign = 'STRETCH';
      col.appendChild(columns[c][i]);
    }
    rowFrame.appendChild(col);
  }

  mainFrame.appendChild(rowFrame);
  return mainFrame;
}

/**
 * 문서 순서(연속 구간)를 유지하면서 k단에 분배
 * 목표: 각 단 높이의 최댓값을 최소화 (카드 개수 균등이 아님)
 */
function partitionBoxesBalanced(boxes, heights, k) {
  var n = boxes.length;
  if (n === 0) return [];
  if (k <= 1 || n === 1) return [boxes.slice()];
  k = Math.min(k, n);

  // prefix sum
  var prefix = [0];
  for (var i = 0; i < n; i++) {
    prefix.push(prefix[i] + heights[i]);
  }
  function rangeSum(from, toInclusive) {
    return prefix[toInclusive + 1] - prefix[from];
  }

  var INF = 1e15;
  // dp[i][c] = 앞 i개 박스를 c단으로 나눌 때 가능한 "단 최대 높이"의 최솟값
  // choice[i][c] = 마지막 단의 시작 인덱스
  var dp = [];
  var choice = [];
  for (var i = 0; i <= n; i++) {
    dp[i] = [];
    choice[i] = [];
    for (var c = 0; c <= k; c++) {
      dp[i][c] = INF;
      choice[i][c] = -1;
    }
  }
  dp[0][0] = 0;

  for (var c = 1; c <= k; c++) {
    for (var i = 1; i <= n; i++) {
      // 마지막 단 = [j, i)
      // 각 단에 최소 1개씩 들어가도록 j 하한: c-1
      var jMin = c - 1;
      for (var j = jMin; j < i; j++) {
        if (dp[j][c - 1] >= INF) continue;
        var lastH = rangeSum(j, i - 1);
        var val = Math.max(dp[j][c - 1], lastH);
        if (val < dp[i][c]) {
          dp[i][c] = val;
          choice[i][c] = j;
        }
      }
    }
  }

  // 역추적
  var cuts = []; // each: { start, end } end exclusive
  var i = n;
  var c = k;
  while (c > 0 && i > 0) {
    var j = choice[i][c];
    if (j < 0) {
      // fallback: 균등 개수 분할
      return partitionBoxesByCount(boxes, k);
    }
    cuts.unshift({ start: j, end: i });
    i = j;
    c--;
  }

  var columns = [];
  for (var t = 0; t < cuts.length; t++) {
    columns.push(boxes.slice(cuts[t].start, cuts[t].end));
  }
  return columns;
}

/**
 * 폴백: 문서 순서 유지 카드 개수 균등 분할
 */
function partitionBoxesByCount(boxes, k) {
  var n = boxes.length;
  k = Math.min(k, n);
  var columns = [];
  var base = Math.floor(n / k);
  var rem = n % k;
  var idx = 0;
  for (var c = 0; c < k; c++) {
    var take = base + (c < rem ? 1 : 0);
    columns.push(boxes.slice(idx, idx + take));
    idx += take;
  }
  return columns;
}

// UI에서 PRD 내용 수신 후 레이어 생성
figma.ui.on('message', async (msg) => {
  if (msg.type === 'prd-content' || msg.type === 'prd-not-found') {
    const frameId = msg.frameId;

    // resolver 완료 처리
    var resolve = prdResolvers[frameId];

    if (msg.type === 'prd-not-found') {
      if (resolve) {
        delete prdResolvers[frameId];
        resolve();
      }
      return;
    }

    const frame = figma.getNodeById(frameId);
    if (!frame || frame.type !== 'FRAME') {
      if (resolve) {
        delete prdResolvers[frameId];
        resolve();
      }
      return;
    }

    try {
      await figma.loadFontAsync({ family: "Noto Sans KR", style: "Bold" });
      await figma.loadFontAsync({ family: "Noto Sans KR", style: "Regular" });
      await figma.loadFontAsync({ family: "Noto Sans", style: "SemiBold" });

      const extracted = extractScreenId(frame.name);
      const displayId = extracted ? (extracted.stateId ? `${extracted.screenId}:${extracted.stateId}` : extracted.screenId) : 'PRD';
      const screenSections = msg.screenSections || [];
      const stateSections = msg.stateSections || [];

      const screenId = extracted ? extracted.screenId : displayId;

      console.log(`[PRD] frame="${frame.name}" extracted=`, extracted, `screen=${screenSections.length} state=${stateSections.length} parent=${frame.parent && frame.parent.type}`);

      var targetHeight = frame.height;

      // 화면구성 레이어 (LEFT) — 초기 상태에만 생성
      if (screenSections.length > 0) {
        var leftFrame = buildDescriptionFrame(`${screenId} 공통 영역 설명`, screenId, screenSections, targetHeight);
        leftFrame.x = frame.x - leftFrame.width - 20;
        leftFrame.y = frame.y;
        frame.parent.appendChild(leftFrame);
        console.log(`[PRD] left created at (${leftFrame.x}, ${leftFrame.y}) size ${leftFrame.width}x${leftFrame.height}`);
      }

      // 상태변화 레이어 (RIGHT) — 해당 상태의 데이터
      if (stateSections.length > 0) {
        var rightFrame = buildDescriptionFrame(`${displayId} 상태 설명`, displayId, stateSections, targetHeight);
        rightFrame.x = frame.x + frame.width + 20;
        rightFrame.y = frame.y;
        frame.parent.appendChild(rightFrame);
        console.log(`[PRD] right created at (${rightFrame.x}, ${rightFrame.y}) size ${rightFrame.width}x${rightFrame.height}`);
      }

      if (screenSections.length === 0 && stateSections.length === 0) {
        figma.notify(`"${frame.name}": 매칭된 섹션 없음 (extracted=${JSON.stringify(extracted)})`, { error: true });
      } else {
        figma.notify(`"${frame.name}" PRD 레이어 생성: 좌 ${screenSections.length} / 우 ${stateSections.length}`);
      }

    } catch (error) {
      figma.notify(`레이어 생성 실패: ${error.message}`, { error: true });
    }

    if (resolve) {
      delete prdResolvers[frameId];
      resolve();
    }
  }
});

/**
 * 화면 ID 테이블 생성
 */
function createIdTable(screenId) {
  const row = figma.createFrame();
  row.name = '화면 ID';
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'FIXED';
  row.counterAxisSizingMode = 'AUTO';
  row.resize(378, 44);
  row.fills = [];
  row.strokes = [{ type: 'SOLID', color: COLORS.gray2 }];
  row.strokeWeight = 1;
  row.cornerRadius = 8;

  // Header 셀
  const headerCell = figma.createFrame();
  headerCell.name = '.Table';
  headerCell.layoutMode = 'HORIZONTAL';
  headerCell.primaryAxisSizingMode = 'FIXED';
  headerCell.counterAxisSizingMode = 'FIXED';
  headerCell.primaryAxisAlignItems = 'CENTER';
  headerCell.counterAxisAlignItems = 'CENTER';
  headerCell.resize(108, 44);
  headerCell.paddingLeft = 16;
  headerCell.paddingRight = 16;
  headerCell.fills = [{ type: 'SOLID', color: COLORS.gray1 }];

  const headerText = figma.createText();
  headerText.fontName = { family: "Noto Sans KR", style: "Bold" };
  headerText.characters = '화면 ID';
  headerText.fontSize = 16;
  headerText.fills = [{ type: 'SOLID', color: COLORS.black }];
  headerCell.appendChild(headerText);

  // Value 셀
  const valueCell = figma.createFrame();
  valueCell.name = '.Table';
  valueCell.layoutMode = 'HORIZONTAL';
  valueCell.primaryAxisSizingMode = 'FIXED';
  valueCell.counterAxisSizingMode = 'FIXED';
  valueCell.primaryAxisAlignItems = 'MIN';
  valueCell.counterAxisAlignItems = 'CENTER';
  valueCell.layoutGrow = 1;
  valueCell.resize(270, 44);
  valueCell.paddingLeft = 16;
  valueCell.paddingRight = 16;
  valueCell.fills = [{ type: 'SOLID', color: COLORS.white }];

  const valueText = figma.createText();
  valueText.fontName = { family: "Noto Sans KR", style: "Regular" };
  valueText.characters = screenId || '';
  valueText.fontSize = 16;
  valueText.fills = [{ type: 'SOLID', color: COLORS.black }];
  valueCell.appendChild(valueText);

  row.appendChild(headerCell);
  row.appendChild(valueCell);

  return row;
}

/**
 * Description 박스 생성
 * ※ 텍스트에는 기존 검증된 패턴만 사용: layoutAlign STRETCH + textAutoResize HEIGHT
 *    (resize/layoutSizing 실험 금지 — 글자 스케일 버그 유발)
 */
function createDescriptionBox(tag, title, body, bodySegments, boxWidth) {
  var boxPad = LAYOUT.boxPad;

  const box = figma.createFrame();
  box.name = 'Description';
  box.layoutMode = 'HORIZONTAL';
  box.primaryAxisSizingMode = 'FIXED';
  box.counterAxisSizingMode = 'AUTO';
  box.primaryAxisAlignItems = 'MIN';
  box.counterAxisAlignItems = 'MIN';
  box.resize(boxWidth, 100);
  box.itemSpacing = tag ? 4 : 0;
  box.paddingTop = boxPad;
  box.paddingBottom = boxPad;
  box.paddingLeft = boxPad;
  box.paddingRight = boxPad;
  box.fills = [{ type: 'SOLID', color: COLORS.white }];
  box.strokes = [{ type: 'SOLID', color: COLORS.gray2 }];
  box.strokeWeight = 1;
  box.cornerRadius = 10;

  // 섹션 번호 태그 — 제목 왼쪽 (프레임만 — 텍스트 스케일과 무관)
  if (tag) {
    box.appendChild(createTag(String(tag)));
  }

  // Text 컨테이너 생성 (원본 구조 유지)
  const textContainer = figma.createFrame();
  textContainer.name = 'Text';
  textContainer.layoutMode = 'VERTICAL';
  textContainer.primaryAxisSizingMode = 'AUTO';
  textContainer.counterAxisSizingMode = 'AUTO';
  textContainer.layoutGrow = 1;
  textContainer.itemSpacing = 10;
  textContainer.fills = [];

  // Title — 굵기·크기만 올려 계층 분리 (래핑 방식은 원본과 동일)
  const titleText = figma.createText();
  titleText.name = 'Title';
  titleText.fontName = { family: "Noto Sans KR", style: "Bold" };
  titleText.characters = title || '';
  titleText.fontSize = LAYOUT.titleSize;
  titleText.lineHeight = { value: 140, unit: 'PERCENT' };
  titleText.fills = [{ type: 'SOLID', color: COLORS.black }];
  titleText.layoutAlign = 'STRETCH';
  titleText.textAutoResize = 'HEIGHT';
  textContainer.appendChild(titleText);

  // Body — segments 기반 렌더링 (테이블 + 텍스트)
  var segments = bodySegments || [];
  if (segments.length === 0 && body) {
    segments = [{ type: 'text', content: body }];
  }

  for (var i = 0; i < segments.length; i++) {
    var seg = segments[i];
    if (seg.type === 'table') {
      // 카드 패딩 + 좌측 태그 영역 제외한 Text 컨테이너 실질 너비
      var tagReserve = tag ? LAYOUT.tagReserve : 0;
      var tableMaxW = Math.max(200, boxWidth - boxPad * 2 - tagReserve);
      var tableResult = createMdTable(seg.headers, seg.rows, tableMaxW);
      // 표가 예정보다 넓으면 카드도 따라 확장 (잘림 방지)
      if (tableResult.totalWidth > tableMaxW) {
        var grow = tableResult.totalWidth - tableMaxW;
        box.resize(box.width + grow, box.height);
        boxWidth += grow;
      }
      textContainer.appendChild(tableResult.frame);
    } else if (seg.type === 'legend') {
      textContainer.appendChild(createGroupLegend(seg.items));
    } else if (seg.type === 'groupheader') {
      textContainer.appendChild(createGroupHeader(seg.title, seg.colorIndex));
    } else if (seg.type === 'codeblock') {
      var codeFrame = createCodeBlock(seg.content);
      textContainer.appendChild(codeFrame);
    } else if (seg.type === 'blockquote') {
      var quoteFrame = createBlockquote(seg.content);
      textContainer.appendChild(quoteFrame);
    } else if (seg.type === 'divider') {
      var divider = createDivider();
      textContainer.appendChild(divider);
    } else if (seg.type === 'text' && seg.content) {
      var bodyText = createMarkdownText(seg.content);
      bodyText.layoutAlign = 'STRETCH';
      bodyText.textAutoResize = 'HEIGHT';
      textContainer.appendChild(bodyText);
    }
  }

  box.appendChild(textContainer);

  return box;
}

/**
 * 테이블 너비만 사전 계산 (Figma 노드 생성 없이)
 * — 내용 기준 폭 (긴 셀은 maxTableColWidth에서 줄바꿈 가정)
 */
function calcTableWidth(headers, rows) {
  var colCount = headers.length;
  if (colCount === 0) return 0;
  var allRows = [headers].concat(rows);
  var CELL_PAD = 16;
  var FONT_SIZE = 12;
  var MIN_W = 48;
  var COL_CAP = LAYOUT.maxTableColWidth;
  var total = 0;
  for (var c = 0; c < colCount; c++) {
    var maxW = 0;
    for (var r = 0; r < allRows.length; r++) {
      var txt = (c < allRows[r].length) ? allRows[r][c] : '';
      var plain = stripMdForMeasure(txt);
      var w = estimateTextWidth(plain, FONT_SIZE);
      if (w > maxW) maxW = w;
    }
    // 긴 텍스트는 컬럼 상한에서 줄바꿈 — 카드가 무한히 넓어지지 않음
    total += Math.min(Math.max(maxW + CELL_PAD, MIN_W), COL_CAP + CELL_PAD);
  }
  var softCap = LAYOUT.maxTableCardWidth - LAYOUT.boxPad * 2 - LAYOUT.tagReserve;
  return Math.min(total, Math.max(softCap, 200));
}

/**
 * 측정용: 마크다운 기호·백틱 제거
 */
function stripMdForMeasure(src) {
  if (!src) return '';
  return String(src)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

/**
 * 텍스트 너비 추정 (한글은 fontSize, 영문/숫자는 0.6*fontSize)
 */
function estimateTextWidth(text, fontSize) {
  var width = 0;
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i);
    if (code > 0x2E80) {
      width += fontSize;
    } else {
      width += fontSize * 0.6;
    }
  }
  return Math.ceil(width);
}

/**
 * 컬럼 너비 결정
 * — 내용이 가용 폭보다 크면 축소하지 않고 내용 폭 유지 (잘림 방지)
 * — 가용 폭이 더 넓으면 비율대로 살짝 분배
 */
function fitColWidths(idealWidths, available) {
  var colCount = idealWidths.length;
  var MIN_COL = 48;
  var i;
  if (colCount === 0) return [];

  var idealTotal = 0;
  for (i = 0; i < idealWidths.length; i++) idealTotal += idealWidths[i];
  if (idealTotal <= 0) idealTotal = colCount * MIN_COL;

  // 내용이 더 넓으면 강제 축소하지 않음 → 표/카드가 넓어짐
  if (idealTotal >= available) {
    return idealWidths.slice();
  }

  // 남는 폭을 비율대로 분배
  var widths = [];
  var grow = available / idealTotal;
  for (i = 0; i < colCount; i++) {
    widths.push(Math.floor(idealWidths[i] * grow));
  }

  var sum = 0;
  for (i = 0; i < widths.length; i++) sum += widths[i];
  var diff = available - sum;
  if (diff !== 0 && widths.length > 0) {
    var maxIdx = 0;
    for (i = 1; i < widths.length; i++) {
      if (widths[i] > widths[maxIdx]) maxIdx = i;
    }
    widths[maxIdx] = Math.max(MIN_COL, widths[maxIdx] + diff);
  }
  return widths;
}

/**
 * 마크다운 테이블 → Figma 테이블 프레임
 * maxWidth 안에 컬럼을 맞추고, 셀 텍스트는 줄바꿈
 */
function createMdTable(headers, rows, maxWidth) {
  var colCount = headers.length;
  if (colCount === 0) {
    var empty = figma.createFrame();
    empty.name = 'Table';
    empty.resize(maxWidth || 200, 1);
    empty.fills = [];
    return { frame: empty, totalWidth: maxWidth || 200 };
  }

  var allRows = [headers].concat(rows);
  var CELL_PAD = 16;
  var FONT_SIZE = 12;
  var MIN_W = 48;
  var COL_CAP = LAYOUT.maxTableColWidth;

  // 이상적(내용 기준) 컬럼 너비 — 긴 셀은 COL_CAP에서 줄바꿈
  var idealWidths = [];
  var idealTotal = 0;
  for (var c = 0; c < colCount; c++) {
    var maxW = 0;
    for (var r = 0; r < allRows.length; r++) {
      var txt = (c < allRows[r].length) ? allRows[r][c] : '';
      var w = estimateTextWidth(stripMdForMeasure(txt), FONT_SIZE);
      if (w > maxW) maxW = w;
    }
    var colW = Math.min(Math.max(maxW + CELL_PAD, MIN_W), COL_CAP + CELL_PAD);
    idealWidths.push(colW);
    idealTotal += colW;
  }

  // 카드가 준 폭보다 내용이 넓으면 내용 폭 사용 (강제 축소 금지)
  var given = Math.max(200, Math.floor(maxWidth || 0));
  var available = Math.max(given, idealTotal);

  var colWidths = fitColWidths(idealWidths, available);
  var totalWidth = 0;
  for (var c = 0; c < colWidths.length; c++) totalWidth += colWidths[c];
  // 남는 폭만 마지막 열에 흡수 (축소는 하지 않음)
  if (colWidths.length && totalWidth < available) {
    colWidths[colWidths.length - 1] += available - totalWidth;
    totalWidth = available;
  }

  var tableFrame = buildTableNodes(headers, rows, colWidths, totalWidth);
  return { frame: tableFrame, totalWidth: totalWidth };
}

/**
 * 셀 텍스트에 인라인 서식 적용
 */
function applyInlineRanges(label, ranges) {
  for (var ri = 0; ri < ranges.length; ri++) {
    var range = ranges[ri];
    if (range.start >= range.end) continue;
    try {
      if (range.style === 'bold') {
        label.setRangeFontName(range.start, range.end, { family: "Noto Sans KR", style: "Bold" });
      } else if (range.style === 'code') {
        label.setRangeFontName(range.start, range.end, { family: "Noto Sans", style: "SemiBold" });
        label.setRangeFills(range.start, range.end, [{ type: 'SOLID', color: COLORS.tagRed }]);
      } else if (range.style === 'strikethrough') {
        label.setRangeTextDecoration(range.start, range.end, 'STRIKETHROUGH');
      }
    } catch (e) { /* ignore */ }
  }
}

/**
 * 가로/세로 사이즈 모드 고정 헬퍼 (API 버전 호환)
 */
function setLayoutSizing(node, horizontal, vertical) {
  try {
    if ('layoutSizingHorizontal' in node) node.layoutSizingHorizontal = horizontal;
    if ('layoutSizingVertical' in node) node.layoutSizingVertical = vertical;
  } catch (e) { /* older runtime */ }
}

/**
 * 테이블 생성 — 고정 컬럼 그리드 (절대 좌표)
 * 행마다 auto-layout 하면 내용 길이에 따라 열 경계가 어긋남
 * → 모든 행이 동일한 colWidths[c] 좌표를 쓰도록 배치
 */
function buildTableNodes(headers, rows, colWidths, totalWidth) {
  var CELL_PAD_X = 8;
  var CELL_PAD_Y = 6;
  var FONT_SIZE = 12;
  var MIN_ROW = 28;
  var allData = [headers].concat(rows);
  var colCount = colWidths.length;

  // 1) 셀 텍스트를 선생성 → 고정 너비로 줄바꿈 → 행 높이 측정
  var cellTexts = [];
  var rowHeights = [];

  for (var r = 0; r < allData.length; r++) {
    var isHeader = (r === 0);
    cellTexts[r] = [];
    var maxH = MIN_ROW;

    for (var c = 0; c < colCount; c++) {
      var w = Math.max(24, colWidths[c]);
      var raw = (c < allData[r].length) ? allData[r][c] : '';
      var parsed = parseMarkdownInline(String(raw || ' '));

      var label = figma.createText();
      label.name = isHeader ? 'Th' : 'Td';
      label.fontName = { family: "Noto Sans KR", style: isHeader ? "Bold" : "Regular" };
      label.characters = parsed.plain || ' ';
      label.fontSize = FONT_SIZE;
      label.lineHeight = { value: 150, unit: 'PERCENT' };
      label.fills = [{ type: 'SOLID', color: COLORS.black }];
      applyInlineRanges(label, parsed.ranges);

      // 컬럼 안 텍스트 너비 고정 → 줄바꿈, 높이만 늘어남
      var textW = Math.max(12, w - CELL_PAD_X * 2);
      label.textAutoResize = 'HEIGHT';
      label.resize(textW, FONT_SIZE);

      var cellH = label.height + CELL_PAD_Y * 2;
      if (cellH > maxH) maxH = cellH;
      cellTexts[r][c] = label;
    }
    rowHeights[r] = Math.ceil(maxH);
  }

  var totalHeight = 0;
  for (var rh = 0; rh < rowHeights.length; rh++) totalHeight += rowHeights[rh];

  // 2) 테이블 프레임 + 셀을 절대 좌표로 깔기 (열 x는 모든 행 동일)
  var tableFrame = figma.createFrame();
  tableFrame.name = 'Table';
  tableFrame.layoutMode = 'NONE';
  tableFrame.resize(totalWidth, totalHeight);
  tableFrame.fills = [];
  tableFrame.clipsContent = false;

  var y = 0;
  for (var r = 0; r < allData.length; r++) {
    var isHeader = (r === 0);
    var rowH = rowHeights[r];
    var x = 0;

    for (var c = 0; c < colCount; c++) {
      var w = Math.max(24, colWidths[c]);

      var cell = figma.createRectangle();
      cell.name = isHeader ? '.ThBg' : '.TdBg';
      cell.resize(w, rowH);
      cell.x = x;
      cell.y = y;
      cell.fills = [{ type: 'SOLID', color: isHeader ? COLORS.gray1 : COLORS.white }];
      cell.strokes = [{ type: 'SOLID', color: COLORS.gray2 }];
      cell.strokeWeight = 1;
      // 안쪽 스트로크 — 셀 크기 밖으로 삐져 열 어긋남 방지
      try {
        cell.strokeAlign = 'INSIDE';
      } catch (e) { /* ignore */ }
      tableFrame.appendChild(cell);

      var label = cellTexts[r][c];
      label.x = x + CELL_PAD_X;
      label.y = y + CELL_PAD_Y;
      // 줄바꿈 너비 유지 (append 후 혹시 늘어나지 않게 재고정)
      var textW = Math.max(12, w - CELL_PAD_X * 2);
      label.textAutoResize = 'HEIGHT';
      label.resize(textW, label.height);
      tableFrame.appendChild(label);

      x += w;
    }
    y += rowH;
  }

  return tableFrame;
}

/**
 * 마크다운 텍스트 → Figma Text 노드 (볼드, 코드, 인라인 서식 처리)
 * **bold** → Bold, `code` → SemiBold + 배경색 없음(Figma 텍스트 배경 미지원이므로 색상 변경)
 */
/**
 * 마크다운 인라인 서식 파싱
 * 지원: **bold**, __bold__, *italic*, _italic_, `code`, ~~strikethrough~~
 * 반환: { plain: string, ranges: [{ start, end, style }] }
 */
function parseMarkdownInline(src) {
  // 전처리: 이미지 ![alt](url) → [alt], 링크 [text](url) → text
  src = src.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[$1]');
  src = src.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  var ranges = [];
  var plain = '';
  var i = 0;

  while (i < src.length) {
    // **bold** 또는 __bold__
    if ((src[i] === '*' && src[i + 1] === '*') || (src[i] === '_' && src[i + 1] === '_')) {
      var marker = src.substring(i, i + 2);
      var end = src.indexOf(marker, i + 2);
      if (end !== -1) {
        var start = plain.length;
        plain += src.substring(i + 2, end);
        ranges.push({ start: start, end: plain.length, style: 'bold' });
        i = end + 2;
        continue;
      }
    }
    // ~~strikethrough~~
    if (src[i] === '~' && src[i + 1] === '~') {
      var end = src.indexOf('~~', i + 2);
      if (end !== -1) {
        var start = plain.length;
        plain += src.substring(i + 2, end);
        ranges.push({ start: start, end: plain.length, style: 'strikethrough' });
        i = end + 2;
        continue;
      }
    }
    // `code`
    if (src[i] === '`') {
      var end = src.indexOf('`', i + 1);
      if (end !== -1) {
        var start = plain.length;
        plain += src.substring(i + 1, end);
        ranges.push({ start: start, end: plain.length, style: 'code' });
        i = end + 1;
        continue;
      }
    }
    // *italic* 또는 _italic_ (single)
    if (src[i] === '*' || src[i] === '_') {
      var ch = src[i];
      // 다음 글자가 공백이면 서식이 아님
      if (i + 1 < src.length && src[i + 1] !== ' ') {
        var end = src.indexOf(ch, i + 1);
        if (end !== -1 && src[end - 1] !== ' ') {
          var start = plain.length;
          plain += src.substring(i + 1, end);
          ranges.push({ start: start, end: plain.length, style: 'italic' });
          i = end + 1;
          continue;
        }
      }
    }
    plain += src[i];
    i++;
  }

  return { plain: plain, ranges: ranges };
}

/**
 * 마크다운 텍스트 → Figma Text 노드
 * **bold** → Bold 폰트
 * `code` → SemiBold + 빨간색
 * *italic* / _italic_ → Regular + 회색
 * ~~strikethrough~~ → 취소선
 */
function createMarkdownText(markdown) {
  var parsed = parseMarkdownInline(markdown);

  var textNode = figma.createText();
  textNode.name = 'Body';
  textNode.fontName = { family: "Noto Sans KR", style: "Regular" };
  textNode.characters = parsed.plain || ' ';
  textNode.fontSize = LAYOUT.bodySize;
  textNode.lineHeight = { value: LAYOUT.bodyLineHeight, unit: 'PERCENT' };
  textNode.fills = [{ type: 'SOLID', color: COLORS.black }];

  for (var r = 0; r < parsed.ranges.length; r++) {
    var range = parsed.ranges[r];
    if (range.start >= range.end) continue;

    if (range.style === 'bold') {
      textNode.setRangeFontName(range.start, range.end, { family: "Noto Sans KR", style: "Bold" });
    } else if (range.style === 'code') {
      textNode.setRangeFontName(range.start, range.end, { family: "Noto Sans", style: "SemiBold" });
      textNode.setRangeFills(range.start, range.end, [{ type: 'SOLID', color: COLORS.tagRed }]);
    } else if (range.style === 'italic') {
      textNode.setRangeFills(range.start, range.end, [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]);
    } else if (range.style === 'strikethrough') {
      textNode.setRangeTextDecoration(range.start, range.end, 'STRIKETHROUGH');
    }
  }

  return textNode;
}

/**
 * 코드블록 → 회색 배경 프레임 + 모노스페이스 텍스트
 */
function createCodeBlock(content) {
  var frame = figma.createFrame();
  frame.name = 'CodeBlock';
  frame.layoutMode = 'HORIZONTAL';
  frame.primaryAxisSizingMode = 'FIXED';
  frame.counterAxisSizingMode = 'AUTO';
  frame.layoutAlign = 'STRETCH';
  frame.resize(300, 30);
  frame.paddingTop = 12;
  frame.paddingBottom = 12;
  frame.paddingLeft = 12;
  frame.paddingRight = 12;
  frame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
  frame.cornerRadius = 4;

  var codeText = figma.createText();
  codeText.fontName = { family: "Noto Sans", style: "SemiBold" };
  codeText.characters = content || ' ';
  codeText.fontSize = 13;
  codeText.lineHeight = { value: 160, unit: 'PERCENT' };
  codeText.fills = [{ type: 'SOLID', color: COLORS.black }];
  codeText.layoutAlign = 'STRETCH';
  codeText.layoutGrow = 1;
  codeText.textAutoResize = 'HEIGHT';

  frame.appendChild(codeText);
  return frame;
}

/**
 * 인용문 → 각 줄 앞에 "│ " 를 붙여 마크다운 텍스트로 렌더링
 */
function createBlockquote(content) {
  var lines = content.split('\n');
  var prefixed = lines.map(function(l) { return '│ ' + l; }).join('\n');
  var textNode = createMarkdownText(prefixed);
  textNode.name = 'Blockquote';
  textNode.layoutAlign = 'STRETCH';
  textNode.textAutoResize = 'HEIGHT';
  return textNode;
}

const GROUP_PALETTE = [
  {
    fill: { r: 0.859, g: 0.914, b: 0.988 },
    text: { r: 0.114, g: 0.306, b: 0.847 },
    dot: { r: 0.231, g: 0.510, b: 0.965 }
  },
  {
    fill: { r: 1, g: 0.929, b: 0.835 },
    text: { r: 0.608, g: 0.306, b: 0.035 },
    dot: { r: 0.976, g: 0.451, b: 0.086 }
  },
  {
    fill: { r: 0.929, g: 0.914, b: 0.996 },
    text: { r: 0.361, g: 0.200, b: 0.737 },
    dot: { r: 0.545, g: 0.361, b: 0.965 }
  },
  {
    fill: { r: 0.863, g: 0.988, b: 0.906 },
    text: { r: 0.086, g: 0.447, b: 0.239 },
    dot: { r: 0.133, g: 0.773, b: 0.369 }
  },
  {
    fill: { r: 0.804, g: 0.945, b: 0.969 },
    text: { r: 0.086, g: 0.337, b: 0.408 },
    dot: { r: 0.078, g: 0.722, b: 0.651 }
  },
  {
    fill: { r: 0.988, g: 0.890, b: 0.925 },
    text: { r: 0.616, g: 0.169, b: 0.341 },
    dot: { r: 0.925, g: 0.282, b: 0.600 }
  }
];

function groupColor(index) {
  return GROUP_PALETTE[Math.abs(index) % GROUP_PALETTE.length];
}

function createGroupLegend(items) {
  var frame = figma.createFrame();
  frame.name = 'TabLegend';
  frame.layoutMode = 'HORIZONTAL';
  frame.primaryAxisSizingMode = 'FIXED';
  frame.counterAxisSizingMode = 'AUTO';
  frame.layoutAlign = 'STRETCH';
  frame.itemSpacing = 10;
  frame.paddingTop = 10;
  frame.paddingBottom = 10;
  frame.paddingLeft = 12;
  frame.paddingRight = 12;
  frame.fills = [{ type: 'SOLID', color: COLORS.gray1 }];
  frame.cornerRadius = 8;
  frame.resize(300, 40);
  try { frame.layoutWrap = 'WRAP'; } catch (e) { /* older runtime */ }
  setLayoutSizing(frame, 'FILL', 'HUG');

  for (var i = 0; i < (items || []).length; i++) {
    var pal = groupColor(i);
    var chip = figma.createFrame();
    chip.name = 'LegendChip';
    chip.layoutMode = 'HORIZONTAL';
    chip.primaryAxisSizingMode = 'AUTO';
    chip.counterAxisSizingMode = 'AUTO';
    chip.counterAxisAlignItems = 'CENTER';
    chip.itemSpacing = 6;
    chip.fills = [];

    var dot = figma.createEllipse();
    dot.resize(8, 8);
    dot.fills = [{ type: 'SOLID', color: pal.dot }];
    chip.appendChild(dot);

    var label = figma.createText();
    label.fontName = { family: 'Noto Sans KR', style: 'Regular' };
    label.characters = items[i] || '';
    label.fontSize = 12;
    label.fills = [{ type: 'SOLID', color: pal.text }];
    chip.appendChild(label);

    frame.appendChild(chip);
  }
  return frame;
}

function createGroupHeader(title, colorIndex) {
  var pal = groupColor(colorIndex);
  var frame = figma.createFrame();
  frame.name = 'TabGroupHeader';
  frame.layoutMode = 'HORIZONTAL';
  frame.primaryAxisSizingMode = 'FIXED';
  frame.counterAxisSizingMode = 'AUTO';
  frame.layoutAlign = 'STRETCH';
  frame.paddingTop = 8;
  frame.paddingBottom = 8;
  frame.paddingLeft = 12;
  frame.paddingRight = 12;
  frame.fills = [{ type: 'SOLID', color: pal.fill }];
  frame.cornerRadius = 6;
  frame.resize(300, 32);
  setLayoutSizing(frame, 'FILL', 'HUG');

  var label = figma.createText();
  label.fontName = { family: 'Noto Sans KR', style: 'Bold' };
  label.characters = title || '';
  label.fontSize = 14;
  label.fills = [{ type: 'SOLID', color: pal.text }];
  label.layoutGrow = 1;
  label.layoutAlign = 'STRETCH';
  label.textAutoResize = 'HEIGHT';
  frame.appendChild(label);
  return frame;
}

/**
 * 구분선 → 얇은 회색 라인
 */
function createDivider() {
  var line = figma.createRectangle();
  line.name = 'Divider';
  line.resize(300, 1);
  line.fills = [{ type: 'SOLID', color: COLORS.gray2 }];
  return line;
}

/**
 * 링크 텍스트에서 [text](url) → text 로 변환 (URL 제거)
 * parseMarkdownInline 호출 전에 전처리
 */
function stripMarkdownLinks(src) {
  // [text](url) → text
  return src.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

/**
 * Tag 생성 (섹션 번호)
 */
function createTag(tagText) {
  const tag = figma.createFrame();
  tag.name = 'Tag';
  tag.layoutMode = 'HORIZONTAL';
  tag.primaryAxisAlignItems = 'CENTER';
  tag.counterAxisAlignItems = 'CENTER';
  tag.primaryAxisSizingMode = 'AUTO';
  tag.counterAxisSizingMode = 'AUTO';
  tag.paddingTop = 3;
  tag.paddingBottom = 3;
  tag.paddingLeft = 8;
  tag.paddingRight = 8;
  tag.fills = [{ type: 'SOLID', color: COLORS.tagRed }];
  tag.cornerRadius = 6;

  const tagLabel = figma.createText();
  tagLabel.fontName = { family: "Noto Sans", style: "SemiBold" };
  tagLabel.characters = tagText || '1';
  tagLabel.fontSize = 12;
  tagLabel.fills = [{ type: 'SOLID', color: COLORS.white }];

  tag.appendChild(tagLabel);
  return tag;
}

async function removeAllPrdLayers() {
  const prdLayers = figma.currentPage.findAll(n => {
    // pluginData 기반 식별
    try {
      if (n.getPluginData('prd-layer')) return true;
    } catch (e) {
      // ignore
    }
    // 레거시 이름 패턴
    return n.name.endsWith(' 설명') ||
      n.name === 'PRD 설명' ||
      n.name.startsWith('PRD-') ||
      n.name.endsWith('. 디스크립션 영역') ||
      n.name.endsWith('. 화면구성') ||
      n.name.endsWith('. 상태변화');
  });

  for (const layer of prdLayers) {
    layer.remove();
  }

  figma.notify(`${prdLayers.length}개의 PRD 레이어가 삭제되었습니다`);
}

/**
 * 모든 페이지의 PRD 레이어 삭제
 */
async function removeAllPagesPrdLayers() {
  let totalRemoved = 0;

  for (const page of figma.root.children) {
    const prdLayers = page.findAll(n => {
      try {
        if (n.getPluginData('prd-layer')) return true;
      } catch (e) {
        // ignore
      }
      return n.name.endsWith(' 설명') ||
        n.name === 'PRD 설명' ||
        n.name.startsWith('PRD-') ||
        n.name.endsWith('. 디스크립션 영역') ||
        n.name.endsWith('. 화면구성') ||
        n.name.endsWith('. 상태변화');
    });

    for (const layer of prdLayers) {
      layer.remove();
    }
    totalRemoved += prdLayers.length;
  }

  figma.notify(`전체 페이지에서 ${totalRemoved}개의 PRD 레이어가 삭제되었습니다`);
}

/**
 * 프레임 이름에서 화면 ID와 상태 ID 추출
 * 예: "AI-01:DEFAULT 기본화면" -> { screenId: "AI-01", stateId: "DEFAULT" }
 * 예: "LGN-01 로그인" -> { screenId: "LGN-01", stateId: null }
 * 예: "[LGN-01] 로그인" -> { screenId: "LGN-01", stateId: null }
 */
function extractScreenId(frameName) {
  // 패턴: XXX-00:STATE 형태 (상태 포함) — 콜론 뒤 공백 허용
  const statePatterns = [
    /\[([A-Z]{2,4}-\d{1,2}):\s*([^\]]+?)\s*\]/,  // [AI-01:DEFAULT] / [AI-01: 기본]
    /([A-Z]{2,4}-\d{1,2}):\s*(\S+)/,              // AI-01:DEFAULT / AI-01: 기본
  ];

  for (const pattern of statePatterns) {
    const match = frameName.match(pattern);
    if (match) {
      return { screenId: match[1], stateId: match[2] };
    }
  }

  // 패턴: XXX-00 형태 (상태 없음)
  const patterns = [
    /\[([A-Z]{2,4}-\d{1,2})\]/,  // [LGN-01]
    /([A-Z]{2,4}-\d{1,2})/,      // LGN-01
  ];

  for (const pattern of patterns) {
    const match = frameName.match(pattern);
    if (match) {
      return { screenId: match[1], stateId: null };
    }
  }

  return null;
}
