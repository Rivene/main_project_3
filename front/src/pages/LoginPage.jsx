import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const KAKAO_CLIENT_ID =
  import.meta.env.VITE_KAKAO_REST_KEY ||
  "e676fa2ec68895d32e1d6e251f7e9e52";
const KAKAO_REDIRECT =
  import.meta.env.VITE_KAKAO_REDIRECT ||
  "http://localhost/oauth/kakao/callback";
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "118796893002-uoiu3v4uh2ql4i28gojfipncql5ab3ap.apps.googleusercontent.com";
const GOOGLE_REDIRECT =
  import.meta.env.VITE_GOOGLE_REDIRECT ||
  "http://localhost/oauth/google/callback";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isAdmin] = useState(0);
  const [loginId, setLoginId] = useState("");
  const [memberPw, setMemberPw] = useState("");

  // ✅ 백엔드 CAPTCHA
  const [captchaId, setCaptchaId] = useState("");
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [loading, setLoading] = useState(false);

  const formRef = useRef(null);
  const idRef = useRef(null);
  const pwRef = useRef(null);

  const redirectParam = searchParams.get("redirect") || "/";

  // ✅ 로그인 되어 있으면 바로 홈으로 리디렉트
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/");
    }
  }, [navigate]);

  // ✅ 백엔드에서 CAPTCHA 불러오기
  const fetchCaptcha = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/captcha/`);
      if (!res.ok) throw new Error("보안문자 요청 실패");
      const data = await res.json();
      setCaptchaId(data.captcha_id);
      setCaptchaImage(`data:image/png;base64,${data.image_base64}`);
    } catch (err) {
      alert("보안문자를 불러올 수 없습니다.");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  // ✅ 로그인 처리
  const onSubmit = async (e) => {
    e.preventDefault();

    if (!loginId.trim() || !memberPw.trim()) {
      alert("아이디 또는 비밀번호를 입력해주세요.");
      (!loginId.trim() ? idRef : pwRef).current?.focus();
      return;
    }

    if (!captchaInput.trim()) {
      alert("보안문자를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login_id: loginId,
          password: memberPw,
          captcha_id: captchaId,
          captcha_text: captchaInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "로그인 실패");

      // ✅ JWT & 유저 정보 저장
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      alert("로그인 성공!");
      navigate(redirectParam || "/"); // ✅ useNavigate로 안전하게 이동
    } catch (err) {
      alert(err.message || "로그인 실패");
      fetchCaptcha(); // 실패 시 CAPTCHA 갱신
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const kakaoAuthUrl = useMemo(() => {
    const q = new URLSearchParams({
      response_type: "code",
      client_id: KAKAO_CLIENT_ID,
      redirect_uri: KAKAO_REDIRECT,
    });
    return `https://kauth.kakao.com/oauth/authorize?${q.toString()}`;
  }, []);

  const googleAuthUrl = useMemo(() => {
    const q = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT,
      response_type: "code",
      scope: "openid email profile",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
  }, []);

  return (
    <div
      className="min-h-screen flex justify-center items-center bg-[#f8fafc]"
      onKeyDown={onKeyDown}
    >
      <section
        className={`
          font-[GmarketSansMedium]
          border border-neutral-300 rounded-2xl
          flex max-w-[900px] w-[900px]
          px-8 py-10
          items-center bg-white shadow-md
        `}
      >
        {/* 왼쪽 영역 */}
        <section className="flex w-[45%] justify-center pr-8">
          <div className="flex flex-col items-start">
            <img
              src="/image/main로고.png"
              alt="SumFlow logo"
              className="w-[180px] h-auto object-contain"
            />
            <p className="mt-6 text-[20px] leading-snug text-black font-medium whitespace-pre-line">
              {`Sum Flow에 오신 것을\n환영합니다.`}
            </p>
            <a
              href="/member/signup"
              className={`
                mt-8
                w-[250px] h-[40px]
                rounded-md bg-[#FF4FA0]
                text-white text-[14px] font-medium
                flex items-center justify-center
                no-underline
              `}
            >
              회원가입
            </a>
          </div>
        </section>

        {/* 구분선 */}
        <div className="self-stretch w-px bg-neutral-300" />

        {/* 로그인 폼 */}
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="flex w-[55%] justify-center pl-8"
        >
          <div className="flex flex-col max-w-[360px] w-full">
            <div className="mb-6">
              <div className="text-[16px] font-medium text-black">로그인</div>
              <div className="mt-1 h-[2px] w-[70px] bg-[#FF4FA0]" />
            </div>

            <input type="hidden" name="isAdmin" value={isAdmin} />

            {/* 로그인 아이디 */}
            <input
              ref={idRef}
              type="text"
              placeholder="아이디"
              className="w-full h-[36px] border border-neutral-500 rounded-sm px-3 text-[14px] mb-2 bg-white outline-none"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />

            {/* 비밀번호 */}
            <input
              ref={pwRef}
              type="password"
              placeholder="비밀번호"
              className="w-full h-[36px] border border-neutral-500 rounded-sm px-3 text-[14px] mb-3 bg-white outline-none"
              value={memberPw}
              onChange={(e) => setMemberPw(e.target.value)}
            />

            {/* ✅ CAPTCHA */}
            <div className="flex items-start flex-wrap gap-2 mb-4">
              <div className="flex flex-col items-start">
                <div
                  className="border border-black bg-white rounded flex items-center justify-center h-[36px] px-2"
                  style={{ lineHeight: 0 }}
                >
                  {captchaImage ? (
                    <img
                      src={captchaImage}
                      alt="보안문자"
                      className="h-[30px] object-contain cursor-pointer"
                      onClick={fetchCaptcha}
                    />
                  ) : (
                    <span>보안문자 로드중...</span>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={fetchCaptcha}
                    className="h-[26px] px-2 text-[12px] border border-neutral-500 bg-white rounded"
                  >
                    새로고침
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                className="h-[36px] w-[180px] border border-neutral-500 rounded-sm px-2 text-[12px] outline-none bg-white"
                placeholder="보안문자를 입력하세요"
              />
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              className="w-full h-[36px] rounded-md text-white text-[14px] font-medium mb-4"
              style={{
                backgroundImage: "linear-gradient(to right, #FF54A1, #B862FF)",
              }}
              disabled={loading}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>

            <div className="text-[12px] text-[#535353] mb-2">
              SNS 간편 로그인
            </div>

            {/* 카카오 로그인 */}
            <a
              href={kakaoAuthUrl}
              className="w-full h-[40px] bg-[#FFE812] border border-[#d4c500] rounded-md flex items-center justify-center gap-2 text-[14px] font-medium text-black mb-2 no-underline"
            >
              <img
                src="/image/kakao3.png"
                alt="kakao"
                className="w-[24px] h-[24px] object-contain"
              />
              <span>카카오 로그인</span>
            </a>

            {/* 구글 로그인 */}
            <a
              href={googleAuthUrl}
              className="w-full h-[40px] bg-white border border-[#535353] rounded-md flex items-center justify-center gap-2 text-[14px] font-medium text-[#2c2c2c] no-underline"
            >
              <img
                src="/image/googleLogo.png"
                alt="google"
                className="w-[20px] h-[20px] object-contain"
              />
              <span>구글 로그인</span>
            </a>

            {redirectParam && (
              <input
                type="hidden"
                name="redirect"
                value={redirectParam}
                readOnly
              />
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
