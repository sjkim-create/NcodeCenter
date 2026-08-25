-- NcodeCenter — seed: sections_dim (N코드 정보표)
-- 실행: psql "$POSTGRES_URL" -f db/seed/0001_sections_dim.sql
-- PDS2 = Gcode, PDS3 = Ncode. 값 출처: N코드 정보 화면(첨부).

INSERT INTO sections_dim (product, section, owner_max, book_max, page_max, length_mm) VALUES
  -- PDS3 (Ncode)
  ('PDS3',  0,   1023, 16383, 4095,  600),
  ('PDS3',  3,   1023,  8191,  511, 2000),
  ('PDS3',  5,    255,  4095, 4095, 1200),
  ('PDS3', 10,   1023,  4095, 1023, 2427),
  ('PDS3', 11,   1023,  8191,  511, 2000),
  ('PDS3', 14,   1023,  8191,   31, 9000),
  ('PDS3', 15,  32767,  4095,  511,  608),
  -- PDS2 (Gcode) — 5/10/11/15 은 미지원
  ('PDS2',  0, 524287,  8191, 1023,  600),
  ('PDS2',  3,   4095,  4095, 4095, 1500),
  ('PDS2', 14,   4095,  4095, 1023, 9000)
ON CONFLICT (product, section) DO UPDATE SET
  owner_max = EXCLUDED.owner_max,
  book_max  = EXCLUDED.book_max,
  page_max  = EXCLUDED.page_max,
  length_mm = EXCLUDED.length_mm;
