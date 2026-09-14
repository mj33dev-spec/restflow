-- ============================================================
-- Supabase Schema & Trigger Setup for RestFlow
-- ============================================================

-- 1. Public Profiles Table (사용자 프로필 관리)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Trigger: auth.users 회원가입 시 public.profiles에 자동 행 삽입
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 제거 후 재등록
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Collections Table (컬렉션 폴더/그룹 - 공통 변수 및 헤더 상속)
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  headers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3-1. Collection Items Table (컬렉션 하위 API 요청 항목들)
CREATE TABLE IF NOT EXISTS public.collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  url TEXT NOT NULL,
  params JSONB DEFAULT '[]'::jsonb,
  headers JSONB DEFAULT '[]'::jsonb,
  body TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. History Table (요청 기록)
CREATE TABLE IF NOT EXISTS public.history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  status INT,
  time_ms INT,
  headers JSONB,
  params JSONB,
  body TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 설정 및 권한 부여
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 누구나 본인 정보 읽기/쓰기 허용
CREATE POLICY "Public Profiles Access" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Public Collections Access" ON public.collections FOR ALL USING (true);
CREATE POLICY "Public Collection Items Access" ON public.collection_items FOR ALL USING (true);
CREATE POLICY "Public History Access" ON public.history FOR ALL USING (true);
