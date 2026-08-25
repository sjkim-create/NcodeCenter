"use client";

// 편집 프로젝트 전용 데이터셋
// - 원장 = [데이터확인용]NcodeCenter_편집현황 파일(ed 플래그)
// - 소리펜/필기펜 목록만 있는 업체(= SOBP 코드만 발급, 편집 작업 아님)는 여기서 제외
//   (SOBP 맵·코드 프로젝트에서는 그대로 검색됨)
import data from "@/data/editing-detail.json";

type Row = { o: number; k: string; pg?: number; bytes?: number; sm?: number[]; pm?: number[]; m?: string; ed?: boolean; src?: string };
type Cust = { customer: string; owner: string; owners?: number[]; codeKinds: string[]; books: number; pages: number;
  symbols: number; soundSymbols: number; penSymbols: number; sizeMB: number; withSymbolBooks?: number;
  topMethods?: [string, number][]; bookRows?: Row[] };

const RAW = data as unknown as { summary: { customers: number; books: number; pages: number; symbols: number; sizeGB: number }; customers: Cust[] };

// 빌드 시점에 편집현황 장부 행만 담아 생성 → 런타임 필터 불필요
export const EDIT_CUSTOMERS: Cust[] = RAW.customers;

export const EDIT_SUMMARY = RAW.summary;
