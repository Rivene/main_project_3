----------------------------------------------------------------
-- DROP (존재 시만)
----------------------------------------------------------------
-- BEGIN EXECUTE IMMEDIATE 'DROP TABLE documents CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
-- /
-- BEGIN EXECUTE IMMEDIATE 'DROP TABLE categories CASCADE CONSTRAINTS PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
-- /

-- BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_documents'; EXCEPTION WHEN OTHERS THEN NULL; END;
-- /
-- BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_categories'; EXCEPTION WHEN OTHERS THEN NULL; END;
-- /

----------------------------------------------------------------
-- TABLES
----------------------------------------------------------------

-- ========================================
-- 카테고리 (계층 구조)
-- ========================================
CREATE TABLE categories (
  id          NUMBER          NOT NULL,
  name        VARCHAR2(4000)  NOT NULL,   -- 카테고리명 (예: 법률/행정, 농림축수산 등)
  parent_id   NUMBER NULL,                 -- 상위 카테고리 ID (NULL이면 루트)

  CONSTRAINT categories_pk        PRIMARY KEY (id),
  CONSTRAINT categories_name_uq   UNIQUE (name),
  CONSTRAINT categories_parent_fk FOREIGN KEY (parent_id) REFERENCES categories(id)
);

COMMENT ON TABLE  categories               IS '문서 분류용 계층형 카테고리 테이블';
COMMENT ON COLUMN categories.id            IS '카테고리 고유 식별자';
COMMENT ON COLUMN categories.name          IS '카테고리명 (표시용 텍스트)';
COMMENT ON COLUMN categories.parent_id     IS '상위 카테고리 ID (NULL이면 루트)';

-- ========================================
-- 문서 메타데이터
-- ========================================
CREATE TABLE documents (
  id               NUMBER           NOT NULL,
  server_file_id   VARCHAR2(4000)   NOT NULL,   -- OCR 결과 폴더 ID (ex: out_tesseract_20251020_xxx)
  filename         VARCHAR2(4000)   NOT NULL,   -- 업로드된 원본 파일명
  title            VARCHAR2(4000),              -- 문서 제목 (요약 또는 파일명 기반)
  size_bytes       NUMBER(20,0)     DEFAULT 0,  -- 파일 크기 (바이트)
  summary_text     VARCHAR2(4000),      

  -- 결과물 상대경로 (서버: ROOT + server_file_id + rel 조합)
  merged_pdf_rel   VARCHAR2(4000)   DEFAULT 'merged.pdf',  -- 병합 PDF 상대경로
  meta_json_rel    VARCHAR2(4000)   DEFAULT 'meta.json',   -- 메타데이터 JSON 경로
  ocr_text_rel     VARCHAR2(4000)   DEFAULT 'ocr_txt/',    -- OCR 텍스트 파일 폴더
  json_rel         VARCHAR2(4000)   DEFAULT 'json/',       -- OCR JSON 폴더
  llm_rel          VARCHAR2(4000)   DEFAULT 'llm/',        -- 요약 결과 폴더

  category_id      NUMBER           NOT NULL,              -- 소속 카테고리 (FK)

  created_at       TIMESTAMP(6)     DEFAULT SYSTIMESTAMP,  -- 생성 일시
  updated_at       TIMESTAMP(6)     DEFAULT SYSTIMESTAMP,  -- 수정 일시

  CONSTRAINT documents_pk PRIMARY KEY (id),
  CONSTRAINT documents_server_file_id_uq UNIQUE (server_file_id),
  CONSTRAINT documents_category_fk FOREIGN KEY (category_id) REFERENCES categories(id)
);

COMMENT ON TABLE  documents                       IS '업로드된 문서 및 OCR 결과 메타정보';
COMMENT ON COLUMN documents.id                    IS '문서 고유 식별자';
COMMENT ON COLUMN documents.server_file_id        IS '서버 내 OCR 결과 폴더 ID (유니크)';
COMMENT ON COLUMN documents.filename              IS '업로드된 파일명';
COMMENT ON COLUMN documents.title                 IS '문서 제목 또는 추출된 제목';
COMMENT ON COLUMN documents.size_bytes            IS '파일 크기(바이트 단위)';
COMMENT ON COLUMN documents.summary_text          IS '문서 요약 텍스트 (LLM 결과)';
COMMENT ON COLUMN documents.merged_pdf_rel        IS '병합 PDF 상대경로';
COMMENT ON COLUMN documents.meta_json_rel         IS '메타데이터 JSON 상대경로';
COMMENT ON COLUMN documents.ocr_text_rel          IS 'OCR 텍스트 폴더 상대경로';
COMMENT ON COLUMN documents.json_rel              IS 'OCR JSON 폴더 상대경로';
COMMENT ON COLUMN documents.llm_rel               IS '요약 결과 폴더 상대경로';
COMMENT ON COLUMN documents.category_id           IS '문서 소속 카테고리 ID (FK)';
COMMENT ON COLUMN documents.created_at            IS '문서 등록 시각';
COMMENT ON COLUMN documents.updated_at            IS '문서 수정 시각';

----------------------------------------------------------------
-- SEQUENCES
----------------------------------------------------------------
CREATE SEQUENCE seq_categories START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_documents  START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;