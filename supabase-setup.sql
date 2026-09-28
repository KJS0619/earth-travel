-- visited_countries 테이블 생성
CREATE TABLE IF NOT EXISTS visited_countries (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  code TEXT NOT NULL,
  ko TEXT NOT NULL,
  en TEXT NOT NULL,
  flag TEXT NOT NULL,
  continent TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  year TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(device_id, code)
);

-- RLS 활성화
ALTER TABLE visited_countries ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기/쓰기 가능 (anon key 사용)
CREATE POLICY "Allow all operations" ON visited_countries
  FOR ALL USING (true) WITH CHECK (true);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_visited_countries_device_id ON visited_countries(device_id);

-- Realtime 활성화 (Supabase Dashboard에서 해야 함)
-- Table: visited_countries -> Enable Realtime
