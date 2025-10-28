# backend/user/capcha.py
import base64
import io
import random
import string
import time
import uuid
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/captcha", tags=["Captcha"])

# ----------------------------------------
# 1️⃣ CAPTCHA 저장소 (메모리 캐시)
# ----------------------------------------
# 구조: {captcha_id: (code, expire_time)}
captcha_store = {}
CAPTCHA_TTL = 120  # 초 (2분)

# ----------------------------------------
# 2️⃣ CAPTCHA 텍스트 생성
# ----------------------------------------
def generate_code(length=5):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))

# ----------------------------------------
# 3️⃣ CAPTCHA 이미지 생성
# ----------------------------------------
def generate_captcha_image(code: str):
    width, height = 160, 60
    image = Image.new("RGB", (width, height), (255, 255, 255))

    # ✅ 폰트 크기만 조정 (load_default() → truetype + 크기 ↑)
    try:
        font = ImageFont.truetype("arial.ttf", 36)  # 기존보다 글자 큼
    except:
        font = ImageFont.load_default()

    draw = ImageDraw.Draw(image)

    # 텍스트 배치
    for i, char in enumerate(code):
        x = 20 + i * 25 + random.randint(-5, 5)
        y = random.randint(5, 10)  # 기존 y 그대로 유지
        draw.text(
            (x, y),
            char,
            fill=(random.randint(0, 150), random.randint(0, 150), random.randint(0, 150)),
            font=font,
        )

    # 노이즈 라인 추가 (변경 없음)
    for _ in range(3):
        x1, y1 = random.randint(0, width), random.randint(0, height)
        x2, y2 = random.randint(0, width), random.randint(0, height)
        draw.line(
            ((x1, y1), (x2, y2)),
            fill=(random.randint(150, 255), random.randint(150, 255), random.randint(150, 255)),
            width=2,
        )

    # 블러 효과 (변경 없음)
    image = image.filter(ImageFilter.GaussianBlur(0.8))
    return image


# ----------------------------------------
# 4️⃣ CAPTCHA 생성 API
# ----------------------------------------
@router.get("/")
def get_captcha():
    code = generate_code()
    captcha_id = str(uuid.uuid4())
    expire = time.time() + CAPTCHA_TTL

    # 저장
    captcha_store[captcha_id] = (code, expire)

    # 이미지 생성
    image = generate_captcha_image(code)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {"captcha_id": captcha_id, "image_base64": image_base64}

# ----------------------------------------
# 5️⃣ CAPTCHA 검증 API
# ----------------------------------------
class CaptchaVerifyRequest(BaseModel):
    captcha_id: str
    user_input: str

@router.post("/verify")
def verify_captcha(data: CaptchaVerifyRequest):
    record = captcha_store.get(data.captcha_id)

    if not record:
        raise HTTPException(status_code=400, detail="Captcha expired or invalid")

    code, expire_time = record

    # TTL 체크
    if time.time() > expire_time:
        del captcha_store[data.captcha_id]
        raise HTTPException(status_code=400, detail="Captcha expired")

    # 코드 일치 확인 (대소문자 무시)
    if data.user_input.strip().lower() != code.lower():
        raise HTTPException(status_code=400, detail="Captcha incorrect")

    # 성공 시 삭제 (1회성)
    del captcha_store[data.captcha_id]
    return {"success": True, "message": "Captcha verified"}
