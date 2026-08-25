// NcodeCenter — 오너코드 발급 리스트 CSV → allocations 변환/검증
// 사용: node db/import/csv-to-allocations.mjs "<csv경로>" [--sql]
// 대상 CSV: "(필기펜)NWP_Ncode_List ... - S{n}_O{n}_{고객}.csv" 형식
//  - 헤더가 여러 줄(1~4행). 데이터행 = 2번째 칸이 PDS2/PDS3 인 행.
//  - 컬럼(위치): 0 고객사, 1 코드구분(product), 2 Section, 3 Owner, 4 Book,
//                5 Start Page, 6 Total Page, 7 발급일자, 8 삭제일자, 9 교재명 ...
import { readFileSync } from 'node:fs';

// N코드 정보표 (검증용)
const DIM = {
  PDS3:{0:{owner:1023,book:16383,page:4095},3:{owner:1023,book:8191,page:511},5:{owner:255,book:4095,page:4095},
        10:{owner:1023,book:4095,page:1023},11:{owner:1023,book:8191,page:511},14:{owner:1023,book:8191,page:31},15:{owner:32767,book:4095,page:511}},
  PDS2:{0:{owner:524287,book:8191,page:1023},3:{owner:4095,book:4095,page:4095},14:{owner:4095,book:4095,page:1023}},
};

// 최소 CSV 파서 (따옴표/개행 처리)
function parseCSV(text){
  const rows=[]; let row=[], cell='', q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){cell+='"';i++;} else q=false; } else cell+=c; }
    else{
      if(c==='"') q=true;
      else if(c===','){ row.push(cell); cell=''; }
      else if(c==='\n'){ row.push(cell); rows.push(row); row=[]; cell=''; }
      else if(c==='\r'){}
      else cell+=c;
    }
  }
  if(cell.length||row.length){ row.push(cell); rows.push(row); }
  return rows;
}

const path = process.argv[2];
const emitSql = process.argv.includes('--sql');
if(!path){ console.error('사용: node csv-to-allocations.mjs "<csv경로>" [--sql]'); process.exit(2); }

const raw = readFileSync(path, 'utf8').replace(/^﻿/,'');
const rows = parseCSV(raw);

const isData = r => r[1] && /^PDS\d$/i.test(r[1].trim());
const dataRows = rows.filter(isData);

const allocs=[]; const errors=[];
for(const r of dataRows){
  const a={
    customer: (r[0]||'').trim(),
    product: r[1].trim().toUpperCase(),
    section: Number(r[2]), owner: Number(r[3]),
    book_start: Number(r[4]), book_end: Number(r[4]),
    page_start: Number(r[5]),
    page_end: Number(r[5]) + Number(r[6]) - 1,      // Start + Total - 1
    total_page: Number(r[6]),
    issued_at: (r[7]||'').trim() || null,
    deleted_at: (r[8]||'').trim() || null,
    book_name: (r[9]||'').trim(),
    source: 'IMPORT',
    status: (r[8]||'').trim() ? 'DELETED' : 'ACTIVE',
  };
  // 검증
  const d = DIM[a.product]?.[a.section];
  if(!d) errors.push(`행(book ${a.book_start}): 알 수 없는 product/section ${a.product}/${a.section}`);
  else{
    if(a.owner>d.owner) errors.push(`Owner 범위초과 ${a.owner}>${d.owner} (S${a.section})`);
    if(a.book_end>d.book) errors.push(`Book 범위초과 ${a.book_end}>${d.book}`);
    if(a.page_end>d.page) errors.push(`Page 범위초과 ${a.page_end}>${d.page} (book ${a.book_start})`);
  }
  if(!(a.page_start<=a.page_end)) errors.push(`page_start>page_end (book ${a.book_start})`);
  allocs.push(a);
}

// 요약
const byCust={}, byProdSec={};
let totalPages=0, minBook=Infinity, maxBook=-Infinity;
for(const a of allocs){
  byCust[a.customer]=(byCust[a.customer]||0)+1;
  const k=`${a.product}/S${a.section}/O${a.owner}`; byProdSec[k]=(byProdSec[k]||0)+1;
  totalPages += a.total_page; minBook=Math.min(minBook,a.book_start); maxBook=Math.max(maxBook,a.book_end);
}

console.log('=== 파싱 결과 ===');
console.log(`데이터 행: ${allocs.length}`);
console.log(`고객: ${Object.entries(byCust).map(([k,v])=>`${k}(${v})`).join(', ')}`);
console.log(`묶음(product/Section/Owner): ${Object.entries(byProdSec).map(([k,v])=>`${k}×${v}book`).join(', ')}`);
console.log(`Book 범위: ${minBook}~${maxBook}, 총 페이지: ${totalPages}`);
console.log(`발급일자: ${[...new Set(allocs.map(a=>a.issued_at))].join(', ')}`);
console.log(`상태: ${allocs.filter(a=>a.status==='ACTIVE').length} ACTIVE / ${allocs.filter(a=>a.status==='DELETED').length} DELETED`);
console.log('=== 검증 ===');
console.log(errors.length? errors.map(e=>' ⚠ '+e).join('\n') : ' ✓ 범위/무결성 오류 없음');
console.log('=== 행별 ===');
allocs.forEach(a=>console.log(` S${a.section}/O${a.owner}/B${a.book_start} · page ${a.page_start}~${a.page_end}(${a.total_page}p) · ${a.book_name} · ${a.issued_at}`));

if(emitSql){
  console.log('\n=== SQL ===');
  const cust=[...new Set(allocs.map(a=>a.customer))];
  cust.forEach(c=>console.log(`INSERT INTO customers(name,service_type,status) VALUES ('${c}','FORMSOLUTION','ACTIVE') ON CONFLICT DO NOTHING;`));
  allocs.forEach(a=>console.log(
    `INSERT INTO allocations(customer_id,product,section,owner,book_start,book_end,page_start,page_end,source,status) `+
    `SELECT id,'${a.product}',${a.section},${a.owner},${a.book_start},${a.book_end},${a.page_start},${a.page_end},'IMPORT','${a.status}' `+
    `FROM customers WHERE name='${a.customer}';`));
}
