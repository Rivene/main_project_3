# backend/user/models.py
from sqlalchemy import Column, String, BigInteger, Boolean, DateTime, func
from sqlalchemy.orm import declarative_base
from app.core.db import Base

class AppUser(Base):
    """
    APP_USER 테이블 ORM 매핑 클래스
    """
    __tablename__ = "APP_USER"

    USER_ID = Column(BigInteger, primary_key=True, autoincrement=True)
    LOGIN_ID = Column(String(50), nullable=False, unique=True, comment="로그인 ID")
    PASSWORD_HASH = Column(String(255), nullable=False, comment="비밀번호 해시")
    NAME = Column(String(100), nullable=False, comment="사용자 이름")
    EMAIL = Column(String(254), nullable=False, unique=True, comment="이메일 주소")
    PHONE_NUMBER = Column(String(30), nullable=True, comment="전화번호")
    NICKNAME = Column(String(100), nullable=True, comment="닉네임")
    ADDRESS_LINE1 = Column(String(200), nullable=True)
    ADDRESS_LINE2 = Column(String(200), nullable=True)
    POSTAL_CODE = Column(String(20), nullable=True)
    BIRTH_DATE = Column(DateTime, nullable=True)
    IS_ADMIN = Column(Boolean, nullable=False, default=False)
    STATUS = Column(String(20), nullable=False, default="ACTIVE")
    IS_LOGGED_IN = Column(Boolean, nullable=False, default=False)
    LAST_LOGIN_AT = Column(DateTime, nullable=True)
    CREATED_AT = Column(DateTime, nullable=False, server_default=func.now())
    UPDATED_AT = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    DELETED_AT = Column(DateTime, nullable=False, server_default=func.now())

    def __repr__(self):
        return f"<AppUser(USER_ID={self.USER_ID}, LOGIN_ID='{self.LOGIN_ID}', EMAIL='{self.EMAIL}')>"
