import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  loadCaptchaEnginge,
  LoadCanvasTemplateNoReload,
  validateCaptcha,
} from "react-simple-captcha";

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

  // 관리자 여부 (일반 회원: 0, 관리자: 1)
  const [isAdmin] = useState(0); // default: 일반회원

  const [loginId, setLoginId] = useState("");
  const [memberPw, setMemberPw] = useState("");

  // 캡챠 입력값
  const [captchaInput, setCaptchaInput] = useState("");

  const formRef = useRef(null);
  const idRef = useRef(null);
  const pwRef = useRef(null);

  const redirectParam = searchParams.get("redirect") || "";

  // 캡챠 최초 로드
  useEffect(() => {
    loadCaptchaEnginge(6);
  }, []);

  // 새로고침(캡챠 갱신)
  const handleReloadCaptcha = () => {
    loadCaptchaEnginge(6);
    setCaptchaInput("");
  };

  // 제출 로직
  const onSubmit = (e) => {
    e.preventDefault();

    if (!loginId.trim() || !memberPw.trim()) {
      alert("아이디 또는 비밀번호를 입력해주세요.");
      (!loginId.trim() ? idRef : pwRef).current?.focus();
      return;
    }

    // 캡챠 체크
    if (!validateCaptcha(captchaInput)) {
      alert("보안문자가 일치하지 않습니다.");
      handleReloadCaptcha();
      return;
    }

    // TODO: 나중에 백엔드로 전달 시 함께 전송
    formRef.current?.submit();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit(e);
    }
  };

  // 소셜 로그인 URL
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
          action="/member/login"
          method="post"
          onSubmit={onSubmit}
          className="flex w-[55%] justify-center pl-8"
        >
          <div className="flex flex-col max-w-[360px] w-full">
            <div className="mb-6">
              <div className="text-[16px] font-medium text-black">로그인</div>
              <div className="mt-1 h-[2px] w-[70px] bg-[#FF4FA0]" />
            </div>

            {/* 관리자 여부 */}
            <input type="hidden" name="isAdmin" value={isAdmin} />

            {/* 로그인 아이디 */}
            <input
              ref={idRef}
              type="text"
              name="loginId"
              placeholder="아이디"
              className="w-full h-[36px] border border-neutral-500 rounded-sm px-3 text-[14px] mb-2 bg-white outline-none"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />

            {/* 비밀번호 */}
            <input
              ref={pwRef}
              type="password"
              name="memberPw"
              placeholder="비밀번호"
              className="w-full h-[36px] border border-neutral-500 rounded-sm px-3 text-[14px] mb-3 bg-white outline-none"
              value={memberPw}
              onChange={(e) => setMemberPw(e.target.value)}
            />

            {/* 캡챠 */}
            <div className="flex items-start flex-wrap gap-2 mb-4">
              <div className="flex flex-col items-start">
                <div
                  className="border border-black bg-white rounded flex items-center justify-center h-[36px] px-2"
                  style={{ lineHeight: 0 }}
                >
                  <LoadCanvasTemplateNoReload />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleReloadCaptcha}
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
            >
              로그인
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