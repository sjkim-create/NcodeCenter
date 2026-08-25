// 최소 ZIP(무압축·store 방식) 생성기 — 외부 라이브러리 없이 브라우저에서 zip 다운로드.
// 파일명은 UTF-8 플래그(0x0800)로 저장해 한글 이름도 탐색기에서 정상 표시된다.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type ZipEntry = { name: string; content: string };

// 여러 텍스트 파일을 하나의 zip Blob 으로 묶는다 (폴더는 name 에 "폴더/파일" 형태로 표현).
export function makeZip(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder();
  const DOS_TIME = 0;
  const DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1; // 2020-01-01
  const u16 = (v: number) => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, v & 0xffff, true); return b; };
  const u32 = (v: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v >>> 0, true); return b; };

  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const data = enc.encode(e.content);
    const crc = crc32(data);
    const size = data.length;

    // 로컬 파일 헤더 + 데이터
    const header: Uint8Array[] = [
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(DOS_TIME), u16(DOS_DATE),
      u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), nameBytes, data,
    ];
    const headerLen = header.reduce((s, a) => s + a.length, 0);
    local.push(...header);

    // 중앙 디렉터리 레코드
    central.push(
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(DOS_TIME), u16(DOS_DATE),
      u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset), nameBytes,
    );
    offset += headerLen;
  }

  const cdOffset = offset;
  const cdSize = central.reduce((s, a) => s + a.length, 0);
  const end: Uint8Array[] = [
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(cdSize), u32(cdOffset), u16(0),
  ];

  // 모든 조각을 하나의 버퍼로 합쳐 반환 (BlobPart 타입 안정)
  const parts = [...local, ...central, ...end];
  const total = parts.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const a of parts) { out.set(a, p); p += a.length; }
  return new Blob([out.buffer], { type: "application/zip" });
}
