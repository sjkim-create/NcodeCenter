# -*- coding: utf-8 -*-
"""TKT-02 계정 등록·수정 — 실제 화면 구조 그대로.

등록(/tickets/account/new) : ① 계정 정보 → ② 인증 서비스·권한 → ③ App Key(선택) → [계정 추가]
상세·수정(/tickets/account/{email}) : ①② 수정 + [저장] · ③ App Key 발급·삭제
App Key 는 계정당 1개이고 인증 서비스 전체에 공통이다 `PC-050`. 발급 시 Book Start·Book Volume 을 지정한다.
"""
from shell import page, frame
from p_tkt01 import sel, field, picker

CODE, NAME = 'TKT-02', '계정 등록·수정'
PRD = 'docs/prd/TKT-02_계정 등록·수정.md'

import io as _io
import json as _json
import os as _os

# lib/accountStore.ts CASTERN_PERMS — CasterN 사용자 권한 6종 (`PC-103` 20종 → `PC-105` 6종 복귀)
# 「App 페이지 설정」 은 뺐다 `PC-058`. 대장의 Web Caster 키는 이 6종으로 접어서 넣는다.
# 라벨 옆에 소문자 키를 붙여 보인다 `PC-106`
_KEY = '<span style="font-family:ui-monospace,monospace;font-size:11px;color:#9ca3af;font-weight:400">(%s)</span>'
PERMS = ('프로젝트 생성 ' + _KEY % 'project_new', '심볼 편집 ' + _KEY % 'symbol_edit',
         '리소스 편집 ' + _KEY % 'resource_edit', 'Ncode PDF 내보내기 ' + _KEY % 'export_ncode_pdf',
         'NCP2 내보내기 ' + _KEY % 'export_ncp2', 'App용 패키지 내보내기 ' + _KEY % 'export_app_package')

# 상세 화면의 App Key — 계정당 1개 · 인증 서비스 전체 공통 `PC-050`
#   (키, 인증 서비스, 유효, 생성일시, 범위 목록[(코드종류, 'S/O/B/P', 권수), ...])
#   한 키에 코드 범위를 **여러 개** 물릴 수 있다 `PC-103`
KEYS = (('7Kq3xF9dR2mA8pZ1vT6bN4sJ0wG5c', 'CasterN · 폼솔루션', '2027-12-31', '2026-08-20 14:02',
         [('PDS2', 'S3/O17/B400~499/P1~512', '100권')]),)
# 대장 시드 키 — 네오랩 (키 값 미기재 · 범위 6개) `PC-103`
LEDGER_KEYS = (('', 'CasterN', '무제한', '대장',
                [('PDS2', 'S0/O0~524287/B0~8191/P0~1024', '8,192권'),
                 ('PDS2', 'S3/O0~4095/B0~8191/P0~4095', '8,192권'),
                 ('PDS3', 'S0/O0~1023/B0~16384/P0~4095', '16,385권'),
                 ('PDS3', 'S3/O0~1023/B0~8191/P0~511', '8,192권'),
                 ('PDS3', 'S5/O0~255/B0~4096/P0~262143', '4,097권'),
                 ('PDS4', 'S44/O27/B0~3/P0~255', '1,024권')]),)


def acc_tabs(active='계정 정보'):
    """화면 탭 — 계정 정보 · 인증 서비스 및 권한 · App Key 발급 `PC-062` `PC-076`"""
    out = ''
    for label in ('계정 정보', '인증 서비스 및 권한', 'App Key 발급'):
        on = (label == active)
        out += ('<span style="padding:9px 16px;font-size:13px;border-bottom:2px solid %s;'
                'margin-bottom:-1px;color:%s;font-weight:%s">%s</span>'
                % ('#5f8ff0' if on else 'transparent', '#111827' if on else '#6b7280',
                   '700' if on else '400', label))
    return ('<div style="display:flex;border-bottom:1px solid #eef0f4;margin-bottom:14px">'
            '%s</div>' % out)


def step(n, title, desc=''):
    """영역 제목 — 번호를 붙이지 않는다 `PC-052`. n 은 호출부 호환용으로만 받는다."""
    d = ('<span style="font-size:11.5px;color:#9ca3af">· ' + desc + '</span>') if desc else ''
    return ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
            '<b style="font-size:13px;color:#111827">' + title + '</b>' + d + '</div>')


def tag(text, bg, fg, bold=True):
    return ('<span style="font-size:11px;background:' + bg + ';color:' + fg + ';'
            'border-radius:5px;padding:2px 7px;white-space:nowrap;'
            + ('font-weight:700' if bold else '') + '">' + text + '</span>')


def head(title, sub='', right='목록', chips=''):
    s = ('<span style="color:#9ca3af;font-weight:400;font-size:12px">· ' + sub
         + '</span>') if sub else ''
    return ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;'
            'flex-wrap:wrap"><div style="font-weight:700;font-size:14px">' + title + ' '
            + s + '</div>' + chips + '<span style="flex:1"></span>'
            '<span class="btn gho">' + right + '</span></div>')


def acct_inputs(edit=False, err=None, empty=True, seeded=False):
    """① 계정 정보 — 등록은 입력, 상세는 ID·고객사 잠금. seeded = 대장 계정(비밀번호 미저장) `PC-103`"""
    co_name = '네오랩' if seeded else '웅진씽크빅'
    id_name = 'neolab@neolab.net' if seeded else 'wj_edit@wjthinkbig.com'
    co = ('<div class="inp" style="background:#f7f8fa;color:#6b7280">' + co_name + '</div>'
          if edit else sel('- 선택 -' if empty else '웅진씽크빅', ph=empty))
    idc = ('<div class="inp" style="background:#f7f8fa;color:#6b7280;'
           'font-family:ui-monospace,monospace">' + id_name + '</div>' if edit
           else '<div class="inp' + (' err' if err == 'id' else '') + '">'
                + ('wj_edit' if err == 'id' else
                   ('<span style="color:#9ca3af">user@company.com</span>' if empty
                    else 'wj_edit@wjthinkbig.com')) + '</div>')
    if seeded:      # 대장 계정 — 비밀번호는 저장소에 두지 않았다 `PC-103`
        pwd = '<span style="color:#9ca3af">대장 참조 (저장소에 두지 않음)</span>'
    else:
        pwd = ('••••••••••' if (edit or not empty) and err != 'pw'
               else '<span style="color:#9ca3af">비밀번호 미요청 시 임의 생성</span>')
    nm = ('' if seeded else '웅진 편집팀' if edit or not empty else '')
    addr = '' if seeded else ('경기도 파주시 회동길 20' if edit or not empty else '')
    home = '' if seeded else ('https://www.wjthinkbig.com' if edit or not empty else '')
    out = ('<div class="g2">'
           + field('회사정보 (고객사)', co, not edit)
           + field('NAME (담당자/사용자명)', '<div class="inp">' + nm + '</div>')
           + field('ID (EMAIL)', idc, not edit)
           + field('PWD' if seeded else 'PWD *',
                   '<div style="display:flex;gap:6px">'
                   '<div class="inp' + (' err' if err == 'pw' else '')
                   + '" style="flex:1">' + pwd + '</div>'
                   '<div class="btn sm" style="white-space:nowrap">임의 생성</div></div>',
                   not seeded)
           + field('ADDR (주소)', '<div class="inp">' + addr + '</div>')
           + field('HOMEPAGE', '<div class="inp">' + home + '</div>'))
    if edit:        # 사용기간 — 대장의 「사용기간」 `PC-103` (상세에만)
        out += (field('사용기간 시작', '<div class="inp ph">yyyy-mm-dd</div>')
                + field('사용기간 끝',
                        '<div style="display:flex;gap:8px;align-items:center">'
                        '<div class="inp" style="opacity:' + ('.5' if seeded else '1') + '">'
                        + ('yyyy-mm-dd' if seeded else '2027-12-31') + '</div>'
                        '<label style="font-size:12.5px;color:#374151;display:flex;'
                        'align-items:center;gap:4px;white-space:nowrap">'
                        '<input type="checkbox"' + (' checked' if seeded else '') + '> 무제한'
                        '</label></div>'))
    return out + '</div>'


def book_fields(start='400', vol='100'):
    """App Key 발급 범위 — Book Start · Book Volume(권수) `PC-050`"""
    return (field('Start Book · 1~501', '<div class="inp">%s</div>' % start)
            + field('Book 볼륨 (권) · 최대 %d' % (501 - int(start) + 1),
                    '<div class="inp">%s</div>' % vol))


def until_field(unlimited=True):
    return field('만료일 (기간)',
                 '<div style="display:flex;gap:8px;align-items:center">'
                 '<div class="inp" style="opacity:' + ('.5' if unlimited else '1') + '">'
                 + ('yyyy-mm-dd' if unlimited else '2027-12-31') + '</div>'
                 '<label style="font-size:12.5px;color:#374151;display:flex;'
                 'align-items:center;gap:4px;white-space:nowrap">'
                 '<input type="checkbox"' + (' checked' if unlimited else '') + '> 무제한'
                 '</label></div>')


PT_BG = {'PDS2': ('#fef3c7', '#92400e'), 'PDS3': ('#eef6ff', '#2563eb'), 'PDS4': ('#f3e8ff', '#7e22ce')}


def key_rows(keys=None):
    """발급 내역 — 키 한 줄 + 그 키에 물린 **코드 범위 목록** `PC-103`"""
    rows = ''
    for k, svc, until, at, ranges in (KEYS if keys is None else keys):
        key_html = ('<code>' + k + '…</code>' if k
                    else tag('키 미기재', '#fef3c7', '#92400e'))   # 대장에 키 값이 없다 `PC-103`
        at_html = (tag('대장', '#f0fdfa', '#0f766e') if at == '대장' else '<code>' + at + '</code>')
        lines = ''
        for pt, sobp, books in ranges:
            bg, fg = PT_BG.get(pt, PT_BG['PDS3'])
            lines += ('<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
                      + tag(pt + ' ' + sobp, bg, fg, False).replace('<span style="',
                          '<span style="font-family:ui-monospace,monospace;', 1)
                      + '<span>' + books + '</span><span style="flex:1"></span>'
                      + ('<span class="lnk" style="color:#dc2626">범위 삭제</span>'
                         if len(ranges) > 1 else '') + '</div>')
        rows += ('<div style="border:1px solid #eef0f4;border-radius:9px;padding:8px 10px;'
                 'font-size:11.5px;color:#6b7280">'
                 '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
                 + key_html + '<span>' + svc + '</span><span>유효 ' + until + '</span>'
                 '<span style="flex:1"></span>' + at_html
                 + '<span class="lnk" style="color:#dc2626">키 삭제</span></div>'
                 '<div style="display:flex;flex-direction:column;gap:4px;margin-top:6px">'
                 + lines + '</div></div>')
    return ('<div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">'
            + rows + '</div>')


def result_box():
    return ('<div style="margin-top:12px;background:#fffbeb;border:1px solid #fde68a;'
            'border-radius:10px;padding:12px 14px">'
            '<div style="font-size:12px;color:#92400e;font-weight:700;margin-bottom:6px">'
            '발급 완료 — App Key (서비스 DB 등록됨)</div>'
            '<div style="font-size:12.5px;color:#111827;line-height:1.9">'
            '<div>계정 ID: <code>wj_edit@wjthinkbig.com</code></div>'
            '<div>PWD: <code>Kq7mZ2xR4a</code></div>'
            '<div style="display:flex;gap:8px;align-items:center">App Key: '
            '<code style="flex:1;word-break:break-all">'
            '7Kq3xF9dR2mA8pZ1vT6bN4sJ0wG5c</code>'
            '<div class="btn sm">전체 복사</div></div></div></div>')


# ── 등록 화면 ──────────────────────────────────────────────────────


# 고르는 인증 서비스는 2종뿐 — 0개 선택이 곧 SDK 연동(코드만 할당) `PC-076`
SERVICES = (('CasterN', 'casterN 서비스를 사용하기 위한 계정과 App Key 를 발급하여, 발급된 계정으로 '
             'CasterN 서비스를 직접 사용하는 고객사', True),     # `PC-104`
            ('폼솔루션', '폼솔루션 서비스 · 계정 로그인', False))


def svc_tabs(picked=('CasterN',), tab='CasterN', panel=''):
    """② 인증 서비스 · 권한 — 탭 바 + 현재 탭 패널. 조건이 아래로 쌓이지 않는다 `PC-076`"""
    bar = ''
    for name, _desc, ready in SERVICES:
        on = (name == tab)
        got = (name in picked)
        badge = ('<span style="font-size:10px;background:#fff7ed;color:#c2410c;'
                 'border-radius:5px;padding:1px 6px;font-weight:700;margin-left:4px">'
                 '준비중</span>') if not ready else ''
        bar += ('<div style="flex:1;padding:9px 10px;font-size:12.5px;text-align:center;'
                'white-space:nowrap;border-bottom:2px solid %s;background:%s;color:%s;%s">'
                '<span style="color:%s;font-weight:700">%s</span> %s%s</div>'
                % ('#5f8ff0' if on else 'transparent', '#fff' if on else 'transparent',
                   '#111827' if on else '#6b7280', 'font-weight:700' if on else '',
                   '#047857' if got else '#d1d5db', '✓' if got else '○', name, badge))
    return ('<div style="border:1px solid #eef0f4;border-radius:10px;overflow:hidden">'
            '<div style="display:flex;border-bottom:1px solid #eef0f4;background:#fafbfc">'
            '%s</div><div style="padding:12px 14px">%s</div></div>' % (bar, panel))


def svc_panel(name, on, ready, inner=''):
    desc = dict((n, d) for n, d, _ in SERVICES)[name]
    chk = ('<label style="display:flex;align-items:center;gap:7px;font-size:12.5px">'
           '<input type="checkbox"%s> <b style="color:%s">%s</b>'
           '<span style="color:#9ca3af;font-size:11.5px">· %s</span></label>'
           % (' checked' if on else '', '#1d4ed8' if on else '#374151', name, desc))
    if not on:
        body = ('<div style="font-size:11.5px;color:#9ca3af">인증 서비스로 선택하면 '
                '이 서비스의 조건을 설정할 수 있습니다.</div>')
    elif not ready:
        body = ('<div style="font-size:12px;color:#9ca3af;line-height:1.6;'
                'border:1px solid #eef0f4;background:#fafbfc;border-radius:9px;'
                'padding:10px 12px"><b style="color:#c2410c">준비중</b> — 이 서비스의 '
                '권한·설정 항목은 아직 정의되지 않았습니다. 인증 서비스 연동만 등록됩니다.</div>')
    else:
        body = inner          # 파란 안내 상자는 뺐다 `PC-107` — 뜻은 체크박스 옆 설명으로만
    return chk + '<div style="margin-top:10px">%s</div>' % body


def perms_only(selected=None):
    """CasterN 사용자 권한 6종 `PC-105`"""
    sel_set = set(PERMS if selected is None else selected)
    cells = ''
    for p in PERMS:
        on = p in sel_set
        cells += ('<div style="display:flex;align-items:center;gap:7px;border:1px solid '
                  + ('#c7ddff' if on else '#eef0f4') + ';background:'
                  + ('#f7faff' if on else '#fff') + ';border-radius:9px;padding:8px 10px;'
                  'font-size:12.5px"><span style="width:13px;height:13px;border-radius:3px;'
                  'border:1px solid ' + ('#2563eb' if on else '#cbd5e1') + ';background:'
                  + ('#2563eb' if on else '#fff') + ';color:#fff;font-size:9px;'
                  'display:grid;place-items:center">' + ('✓' if on else '') + '</span>'
                  '<span style="color:' + ('#1d4ed8' if on else '#374151') + ';'
                  + ('font-weight:700' if on else '') + '">' + p + '</span></div>')
    n = len(sel_set)
    title = ('<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px">'
             '사용자 권한 <span style="font-weight:400;color:#9ca3af">'
             '· 개별 또는 모두 선택</span></div>')
    bar = ('<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
           '<span style="font-size:11.5px;color:#6b7280">선택 ' + str(n) + ' / 6</span>'
           '<span style="flex:1"></span><div class="btn sm">'
           + ('모두 해제' if n == 6 else '모두 선택') + '</div></div>')
    return (title + bar + '<div style="display:grid;grid-template-columns:repeat(3,1fr);'
            'gap:6px">' + cells + '</div>')


def range_note(start='400', vol='100'):
    end = int(start) + int(vol) - 1
    return ('<div style="font-size:11.5px;color:#6b7280;margin-top:6px">'
            '발급 범위 <b>PDS2 S3/O17/B%s~%d</b> · %s권 '
            '<span style="color:#9ca3af">(할당 B1~501)</span></div>' % (start, end, vol))


def appkey_block(mode='new', withkey=False, rng='closed', issued=False, has=True):
    """③ App Key — 인증 서비스 전체 공통 · 계정당 1개 `PC-050`. 탭 밖에 둔다."""
    if mode == 'new':
        chk = ('<label style="display:flex;align-items:center;gap:7px;font-size:12.5px;'
               'color:#374151"><input type="checkbox"' + (' checked' if withkey else '')
               + '> 이 계정에 <b>App Key도 함께 발급</b>합니다 '
                 '<span style="color:#9ca3af">· 인증 서비스 전체 공통 · 계정당 1개 · 선택</span>'
                 '</label>')
        if not withkey:
            return chk
        return (chk + '<div style="margin-top:10px">' + picker(rng)
                + '<div style="display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:12px;'
                  'margin-top:12px">' + book_fields() + until_field() + '</div>'
                + (range_note() if rng != 'closed' else '') + '</div>')
    if has:      # 이미 발급된 키가 있는 계정 — 새 키는 못 만들고 **코드 범위를 더 물린다** `PC-103`
        return ('<div style="font-size:11.5px;color:#6b7280;margin-bottom:5px">코드 범위 추가 — '
                'SOBP 맵에서 발급된 S / O <span style="color:#9ca3af">(고르면 Book 범위가 따라옵니다)'
                '</span></div>' + picker(rng)
                + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;'
                  'margin-top:12px">' + book_fields()
                + field('Start Page', sel('1 (기본)')) + field('Page 볼륨', '<div class="inp">512</div>')
                + '</div><div style="display:flex;align-items:center;gap:10px;margin-top:10px">'
                + ('<span style="font-size:11.5px;color:#6b7280">추가 범위 <b>PDS2 S3/O17/B400~499</b> '
                   '· 100권 · <b>P1~512</b></span>' if rng != 'closed' else '')
                + '<span style="flex:1"></span><div class="btn '
                + ('pri' if rng != 'closed' else 'dis') + '">범위 추가</div></div>')
    btn = ('<div style="display:grid;grid-template-columns:1fr 1fr 1.4fr auto;gap:12px;'
           'align-items:end;margin-top:12px">' + book_fields() + until_field()
           + '<div class="btn ' + ('pri' if rng != 'closed' else 'dis')
           + '">App Key 발급</div></div>')
    return (picker(rng) + btn + (range_note() if rng != 'closed' else '')
            + (result_box() if issued else ''))


def key_history(broken=False, seeded=False):
    """③ App Key 발급 내역 — 조회·삭제·범위 삭제. seeded = 대장 키(네오랩) `PC-103`"""
    rows = key_rows(LEDGER_KEYS if seeded else None)
    if broken:
        rows = rows.replace('CasterN', 'CasterN</span> '
                            '<span style="font-size:11px;background:#fef2f2;color:#b91c1c;'
                            'border-radius:5px;padding:2px 7px;font-weight:700">연동 끊김',
                            1)
    return ('<div style="margin-top:18px;border-top:1px solid #eef0f4;padding-top:14px">'
            + step(4, 'App Key 발급 내역', '발급된 키 1개')
            + '<div style="margin-bottom:12px">' + appkey_block('edit', has=True)
            + '</div>'
            + rows + '</div>')


def new_form(picked=('CasterN',), tab='CasterN', perms=None, withkey=False, rng='closed',
             err=None, empty=True, toast=None):
    inner = perms_only(perms)          # App Key 는 탭 밖 ③ 단계 `PC-050`
    panel = svc_panel(tab, tab in picked,
                      dict((n, r) for n, _d, r in SERVICES)[tab], inner)
    body = (head('계정 등록', '') + acc_tabs('계정 정보')
            + '<div style="font-size:11.5px;color:#9ca3af;margin-bottom:12px">'
              '한 고객사에 계정을 <b>여러 개</b> 등록할 수 있습니다(개수 제한 없음). '
              'App Key 는 <b>계정당 1개</b>이며 <b>인증 서비스 전체에 공통</b>으로 쓰입니다 '
              '<code>PC-050</code>.</div>'
            + step(1, '계정 정보', '서비스 로그인 계정') + acct_inputs(err=err, empty=empty)
            + '<div style="margin-top:16px">'
            + step(3, '인증 서비스 · 권한', '탭에서 서비스를 고르고 · 서비스마다 조건이 다릅니다')
            + '<div style="font-size:10.5px;color:#9ca3af;margin-bottom:6px;line-height:1.5">'
              '인증 서비스는 <b>중복 선택</b>할 수 있습니다. 여러 서비스를 선택하면 '
              '<b>한 계정으로 각 서비스에 로그인</b>합니다. 선택 <b>'
            + str(len(picked)) + '</b> / 3</div>'
            + svc_tabs(picked, tab, panel) + '</div>'
            + '<div style="margin-top:18px;border-top:1px solid #eef0f4;padding-top:14px">'
            + step(2, 'App Key 발급', '인증 서비스 전체 공통 · 계정당 1개 · 선택')
            + appkey_block('new', withkey, rng) + '</div>'
            + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">'
              '<div class="btn gho">취소</div><div class="btn pri">계정 추가</div></div>')
    if toast:
        body += ('<div style="margin-top:10px;font-size:12.5px;color:#dc2626;'
                 'text-align:right">' + toast + '</div>')
    return '<div style="max-width:900px"><div class="card"><div class="bd">' + body \
           + '</div></div></div>'


def edit_form(picked=('CasterN',), tab='CasterN', perms=None, rng='closed', issued=False,
              toast=None, broken=False, seeded=False):
    inner = perms_only(perms)          # App Key 는 탭 밖 ③ 단계 `PC-050`
    panel = svc_panel(tab, tab in picked,
                      dict((n, r) for n, _d, r in SERVICES)[tab], inner)
    chips = ('<code style="font-size:12.5px;color:#374151">'
             + ('neolab@neolab.net' if seeded else 'wj_edit@wjthinkbig.com') + '</code>'
             + tag('네오랩' if seeded else '웅진씽크빅', '#f3f4f6', '#6b7280', False)
             + (tag('대장', '#f0fdfa', '#0f766e') if seeded else ''))
    body = (head('계정 상세 · 수정', '', '목록', chips) + acc_tabs('계정 정보')
            + step(1, '계정 정보', 'ID(email) · 고객사는 변경할 수 없습니다')
            + acct_inputs(edit=True, seeded=seeded)
            + '<div style="margin-top:16px">'
            + step(2, '인증 서비스 · 권한', '탭에서 서비스를 고르고 · 서비스마다 조건이 다릅니다')
            + '<div style="font-size:10.5px;color:#9ca3af;margin-bottom:6px;line-height:1.5">'
              'App Key 는 <b>인증 서비스 전체에 공통</b>이라 인증 서비스를 바꿔도 키는 그대로입니다 '
              '<code>PC-050</code>. 선택 <b>' + str(len(picked)) + '</b> / 3</div>'
            + svc_tabs(picked, tab, panel) + '</div>'
            + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">'
              '<div class="btn gho" style="color:#dc2626;border-color:#fecaca">계정 삭제'
              '</div><div class="btn pri">저장</div></div>')
    if toast:
        body += ('<div style="margin-top:10px;font-size:12.5px;color:#047857;'
                 'text-align:right">' + toast + '</div>')
    body += key_history(broken, seeded)
    return '<div style="max-width:900px"><div class="card"><div class="bd">' + body \
           + '</div></div></div>'


def scr_new(h=1250, **kw):
    return frame('TKT-01', '계정 등록', new_form(**kw), height=h)


def scr_edit(h=1500, **kw):
    return frame('TKT-01', '계정 상세 · 수정', edit_form(**kw), height=h)


def dlg(title, msg, ok='확인', danger=True):
    return ('<div class="ovl"><div class="mdl" style="width:480px">'
            '<div class="mh"><div class="mt">%s</div><div class="mx">✕</div></div>'
            '<div style="font-size:13px;color:#374151;line-height:1.8">%s</div>'
            '<div class="mf"><div class="btn gho">취소</div>'
            '<div class="btn %s">%s</div></div></div></div>'
            % (title, msg, 'dgr' if danger else 'pri', ok))


NAV = [('[목록] · [취소]', '클릭', '<code>TKT-01</code>', '계정 목록으로 돌아간다'),
       ('사이드바 [Key 관리]', '클릭', '<code>TKT-03</code>', '발급·정산 목록')]


def build():
    B = []

    B.append((
        'S1', '계정 등록 — 진입', '기본',
        '등록은 <b>2단계</b>다 — ① 계정 정보 → ② <b>인증 서비스</b>·권한 <code>PC-076</code>. '
        '⚠ 옛 ③ App Key 단계는 폐기되어 <b>CasterN 탭 안</b>으로 들어갔다. '
        '인증 서비스는 고른 고객사의 <b>사용 서비스</b>(<code>MEM-02</code>)대로 자동 체크되고, '
        'CasterN 이 켜지면 권한은 <b>6종 모두 선택</b>된 상태로 시작한다 <code>PC-105</code>.',
        scr_new(),
        [('① 회사정보', '선택', 'ADDR 자동 입력', '<code>MEM-01</code> 등록 고객사'),
         ('① ID (EMAIL)', '입력', '이메일 형식', '전체에서 <b>유일</b>'),
         ('① PWD [임의 생성]', '클릭', '10자리 자동', '비밀번호 미요청 고객사'),
         ('② 탭 바', '조회', '서비스 <b>2종</b>', '선택된 서비스에 <b>✓</b> · 준비중 표기 <code>PC-076</code>'),
         ('② CasterN 권한', '기본', '<b>7 / 6</b>', '모두 선택된 상태'),
         ('[계정 추가]', '클릭', '<code>TKT-01</code>', '목록으로 이동')] + NAV))

    B.append((
        'S2', '인증 서비스 중복 선택', '분기',
        '<b>인증 서비스 = 외부 고객사가 우리 서비스 어디에 로그인하나</b> <code>PC-076</code> — '
        '고객사 관리의 <b>사용 서비스</b>(우리가 그 고객사를 어느 서비스로 다루나)와는 다른 값이다. '
        '<b>중복 선택</b>이며, 여러 서비스를 골라도 조건이 아래로 쌓이지 않고 '
        '<b>탭을 바꿔야</b> 그 서비스의 조건이 나온다. '
        '<b>0개를 골라도 정상</b>이다 — 그때는 <b>SDK 연동 (코드만 할당)</b> 으로 App Key 만 발급한다.',
        scr_new(picked=('CasterN', '폼솔루션'), tab='CasterN'),
        [('탭 바', '조회', '✓ CasterN · ✓ 폼솔루션', '선택 <b>2 / 2</b>'),
         ('탭 클릭', '클릭', '해당 서비스 조건', '한 번에 한 서비스만 보인다'),
         ('0개 선택', '—', '<b>SDK 연동 (코드만 할당)</b>',
          '제목 옆에 그대로 표기된다 — 오류가 아니라 정상 상태 <code>PC-076</code>'),
         ('로그인 범위', '—', '—', '<b>한 계정으로 각 서비스에 로그인</b>한다'),
         ('선택 안 한 서비스', '—', '조건 저장 안 함', '뺀 서비스의 조건은 버린다')]))

    B.append((
        'S3', 'CasterN 탭 — 권한 개별 선택', '분기',
        '권한은 <b>6종</b>을 개별로 켜고 끈다 <code>PC-105</code>(`PC-103` 의 20종 그룹 표시는 되돌렸다). '
        '선택 수가 <b>선택 {n} / 6</b> 로 표시되고 버튼 라벨이 <b>[모두 선택]</b> ⇄ <b>[모두 해제]</b> 로 바뀐다. '
        '권한 0개로 저장해도 되며 목록에는 <b>미지정</b>으로 나온다. '
        '대장 계정의 Web Caster 권한 키는 이 6종으로 접어서 들어온다(리소스 Add·Delete·DragDrop → 리소스 편집).',
        scr_new(perms=PERMS[:3], h=1200),
        [('권한 항목', '클릭', '개별 on/off', ''),
         ('선택 수', '표시', '<b>선택 3 / 6</b>', ''),
         ('[모두 선택]', '클릭', '6개 일괄', '전부 선택되면 <b>[모두 해제]</b> 로 바뀐다'),
         ('권한 0개', '저장', '허용', '<code>TKT-01</code> 목록에 <b>미지정</b>')]))

    B.append((
        'S4', '폼솔루션 · SDK 탭 — 준비중', '변형',
        '조건이 정의된 서비스는 <b>CasterN 뿐</b>이다. 나머지 탭은 인증 서비스로 선택해도 '
        '<b>준비중</b> 안내만 나오고 지정할 항목이 없다. 인증 서비스로 선택하지 않은 탭은 '
        '<b>인증 서비스로 선택하면 이 서비스의 조건을 설정할 수 있습니다.</b> 로 비어 있다.',
        scr_new(picked=('CasterN', '폼솔루션'), tab='폼솔루션', h=900),
        [('폼솔루션 탭', '조회', '<b>준비중</b>',
          '<b>이 서비스의 권한·설정 항목은 아직 정의되지 않았습니다. '
          '인증 서비스 연동만 등록됩니다.</b>'),
         ('SDK 탭', '조회', '동일', '준비중'),
         ('미선택 탭', '조회', '—',
          '<b>인증 서비스로 선택하면 이 서비스의 조건을 설정할 수 있습니다.</b>'),
         ('App Key', '표시', '<b>없음</b>', 'CasterN 탭에만 있다')]))

    B.append((
        'S5', '③ App Key 함께 발급', '분기',
        'App Key 는 그 계정의 <b>인증 서비스 전체에 공통</b>으로 쓰이고 <b>계정당 1개</b>다 '
        '<code>PC-050</code>. 그래서 탭 안이 아니라 <b>③ 단계</b>로 따로 둔다. '
        '체크하면 할당된 SOBP 범위와 <b>Book Start · Book Volume(권수)</b> · 만료일이 열린다.',
        scr_new(withkey=True, rng='open', h=1500),
        [('[App Key도 함께 발급]', '체크', '범위·Book·만료 표시', '선택 사항'),
         ('할당된 SOBP 범위', '선택', '순번 + S·O·B·P', '<b>직접 입력하지 않는다</b>'),
         ('Book Start', '입력', '숫자', '할당 범위 안에서만 <code>PC-050</code>'),
         ('Book Volume (권수)', '입력', '숫자',
          '발급 권수 — <b>Book End = Start + Volume − 1</b> 로 계산해 아래에 보여 준다'),
         ('범위 없음', '—', '<code>SOB-02</code>', '코드 할당 후 재시도'),
         ('만료일', '기본', '<b>무제한</b>', '체크를 풀면 달력으로 지정'),
         ('미체크', '저장', '계정만 등록', '키는 상세에서 나중에 발급')]))

    B.append((
        'S6', '인증 서비스를 바꿔도 App Key 는 그대로', '변형',
        'App Key 는 <b>인증 서비스 전체 공통</b>이라 인증 서비스 구성을 바꿔도 키는 영향을 받지 않는다 '
        '<code>PC-050</code>. 예전의 「CasterN 전용 · 연동 끊김」 처리는 <b>폐지</b>했다.',
        scr_new(picked=('폼솔루션',), tab='CasterN', h=960),
        [('인증 서비스 구성', '변경', 'App Key 영향 없음', '키는 계정 단위로 붙는다'),
         ('③ App Key', '표시', '<b>항상 노출</b>', '탭과 무관한 단계다'),
         ('저장', '—', '가능', '계정은 고른 인증 서비스로 등록된다')]))

    B.append((
        'S7', '등록 검증 실패', '검증',
        '검사는 <b>회사 → ID 형식 → 비밀번호 → 범위 → ID 중복</b> 순서로 진행하고 '
        '하나라도 걸리면 그 자리에서 멈춘다. 메시지는 버튼 아래 한 줄로 나온다.',
        scr_new(err='id', toast='계정 ID는 이메일 형식이어야 합니다.', h=1250),
        [('① 회사 미선택', '검증', '중단', '<b>회사(고객사)를 선택하세요.</b>'),
         ('② ID 형식', '검증', '중단', '<b>계정 ID는 이메일 형식이어야 합니다.</b>'),
         ('③ 비밀번호', '검증', '중단',
          '<b>비밀번호가 필요합니다. (요청 없으면 [임의 생성])</b>'),
         ('~~인증 서비스 개수~~', '—', '<b>검사 안 함</b>',
          '<b>0개도 정상</b>이다 — SDK 연동(코드만 할당) <code>PC-076</code>. 옛 '
          '「1개 이상 선택하세요」 검증은 폐지'),
         ('④ 범위', '검증', '중단',
          '<b>할당된 SOBP 범위를 선택하세요.</b> — App Key 함께 발급일 때만'),
         ('⑤ ID 중복', '검증', '중단', '<b>이미 등록된 ID(email)입니다.</b>')]))

    B.append((
        'S8', '계정 상세 · 수정', '기본',
        'ID(email)·고객사는 <b>잠금</b>이고 나머지를 고쳐 <b>[저장]</b> 한다. '
        '②는 등록과 같은 탭 구조이며, 아래 <b>③ App Key 발급 내역</b>은 '
        '<b>조회·삭제만</b> 한다 — 발급은 ② CasterN 탭에서 한다.',
        scr_edit(),
        [('① ID · 고객사', '표시', '<b>잠금</b>', '키 연동 기준값'),
         ('② 탭 구조', '조회', '등록과 동일', 'CasterN 탭에 App Key 발급'),
         ('③ 발급 내역', '조회', '—',
          '키 앞부분 · 인증 서비스 · 유효 기한 · 생성 일시 · [키 삭제] · 그 아래 <b>코드 범위 목록</b> '
          '<code>PC-103</code>(범위가 2개 이상이면 [범위 삭제])'),
         ('[저장]', '클릭', '반영', '<b>계정 정보가 저장되었습니다.</b>'),
         ('[계정 삭제]', '클릭', '확인창', 'S11')] + NAV))

    B.append((
        'S9', '상세 — App Key 발급 완료', '분기',
        '범위를 고르고 <b>[App Key 발급]</b>(범위 선택 전에는 비활성) 하면 결과에 '
        '<b>계정 ID · PWD · App Key</b> 가 나오고 <b>[전체 복사]</b> 로 세 값을 한 번에 '
        '복사한다. 키는 아래 내역에 줄로 추가되고 <code>TKT-03</code>·<code>LOG-01</code> '
        '에 자동 기록된다.',
        scr_edit(rng='sel', issued=True, h=1750,
                 toast='App Key 발급 완료 — 계정과 연동되어 서비스 DB에 등록되었습니다.'),
        [('[App Key 발급]', '클릭', '키 생성', '범위 선택 전에는 <b>비활성</b>'),
         ('Book Start · Volume', '입력', '발급 범위 확정',
          '<b>B{Start}~{Start+Volume−1}</b> 로 발급된다 <code>PC-050</code>'),
         ('발급 결과', '표시', '—', '계정 ID · PWD · App Key'),
         ('[전체 복사]', '클릭', '복사', '<b>계정·키 정보가 복사되었습니다.</b>'),
         ('재발급', '—', '<b>불가</b>',
          '계정당 1개 — 범위를 바꾸려면 <b>키를 삭제한 뒤</b> 다시 발급한다'),
         ('자동 기록', '—', '<code>TKT-03</code> · <code>LOG-01</code>', '발급 이력·활동 로그')]))

    B.append((
        'S10', '이미 발급된 계정 — 코드 범위 추가', '분기',
        'App Key 는 <b>계정당 1개</b>다 <code>PC-050</code>. 이미 키가 있으면 발급 폼 자리에 '
        '<b>코드 범위 추가</b> 폼이 나온다 <code>PC-103</code> — 같은 키에 S/O/B/P 범위를 더 물린다'
        '(대장에서 한 계정이 PDS2·PDS3 를 함께 쓰거나 Book 구간을 여러 번 받은 경우). '
        '키 자체를 바꾸려면 <b>키를 삭제한 뒤</b> 다시 발급한다. '
        '(인증 서비스를 빼도 키 연동은 끊기지 않는다 — 「연동 끊김」 처리는 폐지)',
        scr_edit(picked=('폼솔루션',), tab='CasterN', rng='sel', h=1600),
        [('코드 범위 추가', '표시', '범위 선택 + Book·Page', '발급 폼과 같은 입력 · 만료일은 키 공통이라 없음'),
         ('[범위 추가]', '클릭', '내역에 줄 추가', '범위 선택 전에는 <b>비활성</b> · <code>LOG-01</code> 기록'),
         ('[범위 삭제]', '클릭', '그 범위만 삭제', '범위가 2개 이상일 때만 · 마지막 하나는 [키 삭제]로'),
         ('[키 삭제]', '클릭', '발급 폼 복귀', '삭제 후 새 범위로 다시 발급한다'),
         ('사용처 변경', '저장', '키 유지', '키는 인증 서비스 전체 공통이라 영향 없음')]))

    B.append((
        'S11', '계정 삭제 확인', '차단',
        '<b>[계정 삭제]</b> 는 확인을 거친다. 계정과 <b>연동된 App Key가 함께</b> 삭제된다.',
        frame('TKT-01', '계정 상세 · 수정', edit_form(), height=1500,
              overlay=dlg('계정 삭제', '이 계정과 연동 App Key를 삭제할까요?', '삭제')),
        [('[계정 삭제]', '클릭', '확인창', '<b>이 계정과 연동 App Key를 삭제할까요?</b>'),
         ('[삭제]', '클릭', '<code>TKT-01</code>', '계정 + 연동 키 삭제 후 목록으로'),
         ('[취소] · ✕', '클릭', '변경 없음', '')]))

    B.append((
        'S12', '대장 계정 상세 — 네오랩', '기본',
        '<b>개발팀 대장</b>에서 시드로 들어온 계정 <code>PC-103</code>. 제목 옆에 <b>대장</b> 배지가 붙고, '
        '<b>비밀번호는 저장하지 않았다</b> — PWD 칸은 「대장 참조」 자리표시이며 비워 둔 채 저장할 수 있다. '
        '<b>사용기간</b>은 대장의 값(무제한 또는 시작~끝)이다. App Key 발급 내역에는 대장에 키 값이 없으면 '
        '<b>키 미기재</b>, 그 아래 대장의 <b>코드 범위</b>가 모두 나온다(네오랩 = PDS2 2 · PDS3 3 · PDS4 1). '
        '위 발급 폼 자리는 S10 과 같은 <b>코드 범위 추가</b> 폼이다.',
        scr_edit(seeded=True, h=1850),
        [('대장 배지', '표시', '—', '시드 계정 · 지우면 다시 들어오지 않는다'),
         ('PWD', '표시', '「대장 참조」', '비워 둔 채 [저장] 가능 — 저장소에 평문 비밀번호를 두지 않는다'),
         ('사용기간', '표시', '대장 값', '시작 없음 · 끝 무제한'),
         ('키 미기재', '표시', '—', '대장에 App Key 값이 적혀 있지 않음 · Luginbühl 만 키 값이 있다'),
         ('코드 범위 6개', '조회', '—', 'S·O 도 구간(0~1023)으로 적힌 범위가 있다 · 권수는 대장의 수량'),
         ('Key 정보 카드', '조회', '—', '발급 티켓이 없어 <b>키 자체</b>로 채운다 — Range 1~6')] + NAV))

    intro = ('<code>TKT-01</code> 계정 목록에서 열리는 <b>등록</b>과 <b>상세·수정</b> 두 화면이다. '
             '<b>인증 서비스</b>(이 계정이 우리 서비스 어디에 로그인하나)는 <b>중복 선택</b>이며, '
             '서비스마다 지정할 조건이 달라 <b>탭</b>으로 나뉜다 <code>PC-076</code> — '
             '조건이 아래로 쌓이지 않는다. 고르는 서비스는 <b>CasterN · 폼솔루션 2종</b>이고 '
             '조건이 정의된 것은 <b>CasterN 뿐</b>이다. '
             '<b>아무것도 고르지 않으면 SDK 연동(코드만 할당)</b> 이라 App Key 만 발급한다. '
             '고객사 관리의 <b>사용 서비스</b>(우리가 그 고객사를 어느 서비스로 다루나)와는 '
             '다른 값이며, 고객사를 고르면 그 값대로 <b>자동 체크</b>된다. '
             'App Key 는 <b>계정당 1개 · 인증 서비스 전체 공통</b> <code>PC-050</code>이며 '
             '한 키에 <b>코드 범위를 여러 개</b> 물린다 <code>PC-103</code>. '
             'CasterN 권한은 <b>6종 체크</b>다 <code>PC-105</code>(대장의 Web Caster 키는 6종으로 접는다). '
             '로그인 허용 판정은 PRD §4.6.')
    return page(CODE, NAME, PRD, intro, B)
