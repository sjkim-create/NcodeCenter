"use client";

// 펜 모델 정본 — **DB(web/data/pen-models.json) 직접 관리** `PC-325`
//
// 펜 관리대장(모델관리시트)에서 **대표모델 · 세부모델 · 구분(소리펜/필기펜/기타기기)** 만 가져온다.
// 추가·수정은 화면이 아니라 **데이터 파일(pen-models.json)을 직접 고친다** — 별도 등록 메뉴 없음.
// (옛 [코드 관리 정보 ▸ 펜 모델] 메뉴·브라우저 추가분은 폐지 `PC-325`.)
//
// 쓰임: **편집 프로젝트**에서 교재의 타입(소리펜/필기펜)을 고르면 **그 구분의 펜 모델만** 선택지로 보여 준다.

import pen from "@/data/pen-models.json";

export type PenModel = { rep: string; name: string; pen: string }; // 대표모델 · 세부모델 · 구분
const MODELS: PenModel[] = ((pen as { models?: PenModel[] }).models) ?? [];

/** 전체 펜 모델 (정본) */
export const penModelsAll = (): PenModel[] => MODELS;

/** 타입(소리펜/필기펜)에 맞는 펜 모델만 — 편집 프로젝트 선택용 `PC-325` */
export const penModelsByType = (ty: string): PenModel[] => MODELS.filter((m) => m.pen === ty);

/** 세부모델명만 (하위호환) */
export const penModelNames = (): string[] => MODELS.map((m) => m.name);

/** 세부모델 → 구분 조회 (칩/표시용) */
export const penModelGroup = (name: string): string | undefined => MODELS.find((m) => m.name === name)?.pen;
