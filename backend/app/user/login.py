# backend/user/login.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from user.db import get_db
from user.models import AppUser
from user.capcha import captcha_store
import time
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/v1/user", tags=["User"])

# ----------------------------------------
# 1️⃣ JWT 설정
# ----------------------------------------
JWT_SECRET = os.getenv("JWT_SECRET", "mysecretkey")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 6  # 6시간

# ----------------------------------------
# 2️⃣ 요청 데이터 모델 (필요한 필드만 남김)
# ----------------------------------------
class LoginRequest(BaseModel):
    login_id: str
    password: str
    captcha_id: str
    captcha_text: str


# ----------------------------------------
# 3️⃣ 로그인 엔드포인트
# ----------------------------------------
@router.post("/login")
def login_user(data: LoginRequest, db: Session = Depends(get_db)):
    # ✅ CAPTCHA 검증
    captcha_record = captcha_store.get(data.captcha_id)
    if not captcha_record:
        raise HTTPException(status_code=400, detail="Captcha expired or invalid")

    captcha_code, expire_time = captcha_record
    if time.time() > expire_time:
        del captcha_store[data.captcha_id]
        raise HTTPException(status_code=400, detail="Captcha expired")

    if data.captcha_text.strip().lower() != captcha_code.lower():
        raise HTTPException(status_code=400, detail="Captcha incorrect")

    # CAPTCHA 일회성 삭제
    del captcha_store[data.captcha_id]

    # ✅ 사용자 조회
    user = db.query(AppUser).filter(AppUser.LOGIN_ID == data.login_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid ID or Password")

    # ✅ 비밀번호 검증
    if not bcrypt.checkpw(data.password.encode("utf-8"), user.PASSWORD_HASH.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid ID or Password")

    # ✅ JWT 토큰 생성
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": user.LOGIN_ID,
        "user_id": user.USER_ID,
        "exp": expire
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    # ✅ 로그인 시간 업데이트
    user.LAST_LOGIN_AT = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.USER_ID,
            "login_id": user.LOGIN_ID,
            "email": user.EMAIL,
            "name": user.NAME,
        },
    }
