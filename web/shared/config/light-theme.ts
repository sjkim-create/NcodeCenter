import type { LightTheme } from "@neolab/neoui";

/**
 * neoui 라이트 테마 — `npx @neolab/neoui init` 로 생성됨. **Figma 컬러칩과 1:1**.
 *
 * 아래 값을 서비스 브랜드 칩으로 교체하세요. brand/grey/semantic 은 칩 전량이 **필수**입니다
 * (누락 시 컴파일 에러 — 색을 추측하지 않습니다). 배경 위 전경색(on*)과 다크 테마는
 * neoui 가 자동 처리하므로 지정하지 않아도 됩니다.
 *
 * 다크 테마는 neoui 내장값을 사용합니다. 필요하면 darkTheme 을 별도 정의해
 * <NeoThemeProvider theme={lightTheme} darkTheme={darkTheme}> 로 전달하세요.
 */
// NcodeCenter 브랜드 팔레트(브랜드 가이드): Primary #5f8ff0 · Cyan #7bcdf1 · Success #8ec674 · Warning #f2b350 · Danger #ef7d74 · Info #5cb4e6
export const lightTheme: LightTheme = {
    brand: {
        primary: "#5F8FF0",
        primaryDark: "#4B7BE0",
        primaryDarker: "#3A66C8",
        primaryLight: "#DCE7FB",
        primaryLighter: "#F0F5FE",
        secondary: "#7BCDF1",
        secondaryDark: "#5CB4E6",
        secondaryDarker: "#3D96CE",
        secondaryLight: "#DBF0FB",
        secondaryLighter: "#F0F9FD",
    },
    grey: {
        lightest: "#F6F7F9",
        lighter: "#E5E7EB",
        light: "#D1D5DB",
        base: "#9CA3AF",
        dark: "#6B7280",
        darker: "#4B5563",
        darkest: "#1F2937",
    },
    semantic: {
        success: "#8EC674", successDark: "#6FB152", successLight: "#A9D593", successBg: "#F3F9EF", successBorder: "#D3E9C4",
        warning: "#F2B350", warningDark: "#E09A2E", warningLight: "#F6C878", warningBg: "#FDF7EC", warningBorder: "#FAE4BE",
        error: "#EF7D74", errorDark: "#E05B50", errorLight: "#F4A19A", errorBg: "#FDF1F0", errorBorder: "#F9CFCB",
        info: "#5CB4E6", infoDark: "#3D96CE", infoLight: "#85C9EE", infoBg: "#EEF7FC", infoBorder: "#C6E5F6",
    },
    // 특정 role 만 고정하고 싶을 때(선택). 미지정 role 은 위 칩에서 별칭으로 파생됩니다.
    // bg: { disabled: "#EDF0F4" },
    // fg: { disabled: "#ADBDCC" },
    // stroke: { focus: "#3B82F6" },
};
