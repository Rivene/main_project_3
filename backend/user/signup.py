# backend/user/signup.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from user.db import get_db
from user.models import AppUser
from user.capcha import captcha_store
import time, bcrypt
from datetime import datetime

router = APIRouter(prefix="/api/v1/user", tags=["User"])

# ✅ 1️⃣ 입력 데이터 모델 (DB 매핑에 맞게 확장)
class SignupRequest(BaseModel):
    login_id: str
    password: str
    name: str
    email: EmailStr
    captcha_id: str
    captcha_text: str

    phone: str | None = None
    nickname: str | None = None
    postal_code: str | None = None
    addr1: str | None = None
    addr2: str | None = None
    birth: str | None = None
    is_admin: bool | None = False


# ✅ 2️⃣ 회원가입 엔드포인트
@router.post("/signup")
def signup_user(data: SignupRequest, db: Session = Depends(get_db)):
    # ---------------------------
    # CAPTCHA 검증
    # ---------------------------
    captcha_record = captcha_store.get(data.captcha_id)
    if not captcha_record:
        raise HTTPException(status_code=400, detail="Captcha expired or invalid")

    captcha_code, expire_time = captcha_record
    if time.time() > expire_time:
        del captcha_store[data.captcha_id]
        raise HTTPException(status_code=400, detail="Captcha expired")

    if data.captcha_text.strip().lower() != captcha_code.lower():
        raise HTTPException(status_code=400, detail="Captcha incorrect")

    del captcha_store[data.captcha_id]

    # ---------------------------
    # 중복 검사
    # ---------------------------
    existing_user = (
        db.query(AppUser)
        .filter(
            (AppUser.LOGIN_ID == data.login_id)
            | (AppUser.EMAIL == data.email)
        )
        .first()
    )

    if existing_user:
        raise HTTPException(status_code=400, detail="ID or Email already exists")

    # ---------------------------
    # 비밀번호 해시
    # ---------------------------
    hashed_pw = bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    # ---------------------------
    # 생년월일 변환 (YYYYMMDD → date)
    # ---------------------------
    birth_date = None
    if data.birth:
        try:
            birth_date = datetime.strptime(data.birth, "%Y%m%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid birth date format (YYYYMMDD)")

    # ---------------------------
    # 사용자 객체 생성
    # ---------------------------
    new_user = AppUser(
        LOGIN_ID=data.login_id,
        PASSWORD_HASH=hashed_pw,
        NAME=data.name,
        EMAIL=data.email,
        PHONE_NUMBER=data.phone,
        NICKNAME=data.nickname,
        ADDRESS_LINE1=data.addr1,
        ADDRESS_LINE2=data.addr2,
        POSTAL_CODE=data.postal_code,
        BIRTH_DATE=birth_date,
        IS_ADMIN=data.is_admin or False,
        STATUS="ACTIVE",
        IS_LOGGED_IN=False
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "success": True,
        "message": "회원가입 완료",
        "user_id": new_user.USER_ID,
        "login_id": new_user.LOGIN_ID
    }
