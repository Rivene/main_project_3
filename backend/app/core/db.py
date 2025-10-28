# backend/user/db.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# ----------------------------------------
# 1️⃣ .env 파일 로드
# ----------------------------------------
load_dotenv()  # .env 파일의 환경 변수 로드

# ----------------------------------------
# 2️⃣ 환경 변수에서 DB 정보 읽기
#    (없으면 기본값으로 localhost 사용)
# ----------------------------------------
DB_USER = os.getenv("DB_USER", "mainuser")
DB_PASS = os.getenv("DB_PASS", "main1234")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "sumflow")

# ----------------------------------------
# 3️⃣ SQLAlchemy 연결 URL 생성
# ----------------------------------------
DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# ----------------------------------------
# 4️⃣ 엔진(Engine) 생성
# ----------------------------------------
engine = create_engine(
    DATABASE_URL,
    echo=False,             # SQL 출력 (True로 바꾸면 콘솔에 SQL문 나옴)
    pool_pre_ping=True,     # 연결 유효성 검사
    pool_recycle=3600       # 1시간마다 연결 갱신
)

# ----------------------------------------
# 5️⃣ 세션(SessionLocal) 팩토리 생성
# ----------------------------------------
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ----------------------------------------
# 6️⃣ 베이스 클래스 정의 (모델 상속용)
# ----------------------------------------
Base = declarative_base()

# ----------------------------------------
# 7️⃣ DB 세션 의존성 (FastAPI용)
# ----------------------------------------
def get_db():
    """
    FastAPI에서 의존성 주입으로 DB 세션을 얻을 때 사용.
    예:
        db = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
