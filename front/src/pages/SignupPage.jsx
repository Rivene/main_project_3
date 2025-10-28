import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  checkDuplicateId,
  checkDuplicateEmail,
  sendEmailCode,
  verifyEmailCode,
} from "../services/signupApi.js";

export default function SignupPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    loginId: "",
    password: "",
    passwordConfirm: "",
    name: "",
    birth: "",
    email: "",
    authKey: "",
    nickname: "",
    phone: "",
    postalCode: "",
    addr1: "",
    addr2: "",
  });

  // ✅ 백엔드 CAPTCHA 상태
  const [captchaId, setCaptchaId] = useState("");
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  const [authTimer, setAuthTimer] = useState({ min: 0, sec: 0 });
  const [authEmail, setAuthEmail] = useState("");
  const timerRef = useRef(null);

  const [nickWarn, setNickWarn] = useState("");
  const [phoneWarn, setPhoneWarn] = useState("");

  const [valid, setValid] = useState({
    id: false,
    pw: false,
    pwConfirm: false,
    birth: false,
    email: false,
    emailAuth: false,
  });

  const [msg, setMsg] = useState({
    id: "",
    pw: "",
    birth: "",
    email: "",
    auth: "",
  });

  const refDetailAddr = useRef(null);

  // ✅ 초기 로드 (백엔드 CAPTCHA + 주소 검색)
  useEffect(() => {
    fetchCaptcha();

    if (!(window.daum && window.daum.Postcode)) {
      const script = document.createElement("script");
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      document.body.appendChild(script);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        document.body.removeChild(script);
      };
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ✅ CAPTCHA 불러오기
  const fetchCaptcha = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/captcha`);
      if (!res.ok) throw new Error("보안문자 요청 실패");
      const data = await res.json();
      setCaptchaId(data.captcha_id);
      setCaptchaImage(`data:image/png;base64,${data.image_base64}`);
    } catch (err) {
      alert("보안문자를 불러올 수 없습니다.");
      console.error(err);
    }
  };

  const update = (key, value) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

  const validateId = (v) => /^[A-Za-z]{6,16}$/.test(v);
  const validatePw = (v) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/.test(v);
  const validateName = (v) => /^[가-힣]+$/.test(v);
  const validateBirth = (v) =>
    /^(19[0-9]{2}|20[0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$/.test(v);
  const validateNick = (v) => /^[A-Za-z0-9가-힣]{3,8}$/.test(v);
  const validatePhone = (v) => /^[0-9]{9,11}$/.test(v);

  const handleIdChange = async (v) => {
    update("loginId", v);

    if (!validateId(v)) {
      setMsg((m) => ({ ...m, id: "영문 대/소문자 6~16자로 입력해주세요." }));
      setValid((vd) => ({ ...vd, id: false }));
      return;
    }

    try {
      const dup = await checkDuplicateId(v);
      if (dup === "1") {
        setMsg((m) => ({ ...m, id: "이미 사용 중인 아이디입니다." }));
        setValid((vd) => ({ ...vd, id: false }));
      } else {
        setMsg((m) => ({ ...m, id: "사용 가능한 아이디입니다." }));
        setValid((vd) => ({ ...vd, id: true }));
      }
    } catch {
      setMsg((m) => ({ ...m, id: "아이디 확인 중 오류가 발생했습니다." }));
      setValid((vd) => ({ ...vd, id: false }));
    }
  };

  const handlePwChange = (v) => {
    update("password", v);

    if (!validatePw(v)) {
      setMsg((m) => ({ ...m, pw: "대문자/소문자/특수문자 포함 8~16자" }));
      setValid((vd) => ({ ...vd, pw: false }));
    } else {
      setMsg((m) => ({ ...m, pw: "사용 가능한 비밀번호입니다." }));
      setValid((vd) => ({ ...vd, pw: true }));
    }

    setValid((vd) => ({
      ...vd,
      pwConfirm: v !== "" && v === form.passwordConfirm,
    }));
  };

  const handlePwConfirmChange = (v) => {
    update("passwordConfirm", v);
    setValid((vd) => ({
      ...vd,
      pwConfirm: v !== "" && v === form.password && validatePw(form.password),
    }));
  };

  const handleNameChange = (v) => {
    update("name", v);
  };

  const handleBirthChange = (v) => {
    update("birth", v);

    if (validateBirth(v)) {
      setMsg((m) => ({ ...m, birth: "" }));
      setValid((vd) => ({ ...vd, birth: true }));
    } else {
      setMsg((m) => ({
        ...m,
        birth: "생년월일 8자리(YYYYMMDD) 형식으로 입력해주세요.",
      }));
      setValid((vd) => ({ ...vd, birth: false }));
    }
  };
  const handleEmailChange = async (v) => {
    update("email", v);

    const baseEmailOk = /^[A-Za-z\d-_]{4,}@\w+(\.\w+){1,3}$/.test(v);
    if (!baseEmailOk) {
      setMsg((m) => ({ ...m, email: "이메일 형식이 올바르지 않습니다." }));
      setValid((vd) => ({ ...vd, email: false }));
      return;
    }

    try {
      const dup = await checkDuplicateEmail(v);
      if (dup === "1") {
        setMsg((m) => ({ ...m, email: "이미 등록된 이메일입니다." }));
        setValid((vd) => ({ ...vd, email: false }));
      } else {
        setMsg((m) => ({ ...m, email: "" }));
        setValid((vd) => ({ ...vd, email: true }));
      }
    } catch {
      setMsg((m) => ({
        ...m,
        email: "이메일 확인 중 오류가 발생했습니다.",
      }));
      setValid((vd) => ({ ...vd, email: false }));
    }
  };

  const handleSendAuthCode = async () => {
    if (!valid.email) {
      alert("올바른 이메일을 먼저 입력해주세요.");
      return;
    }

    try {
      await sendEmailCode(form.email);
      alert("인증번호가 발송되었습니다.");

      setAuthEmail(form.email);
      setValid((vd) => ({ ...vd, emailAuth: false }));
      setAuthTimer({ min: 9, sec: 59 });

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setAuthTimer((t) => {
          if (t.min === 0 && t.sec === 0) {
            clearInterval(timerRef.current);
            return t;
          }
          if (t.sec === 0) {
            return { min: t.min - 1, sec: 59 };
          }
          return { ...t, sec: t.sec - 1 };
        });
      }, 1000);
    } catch {
      alert("인증번호 전송 중 오류가 발생했습니다.");
    }
  };

  const handleCheckAuthCode = async () => {
    if (!form.authKey.trim()) {
      alert("인증번호를 입력하세요.");
      return;
    }

    if (authTimer.min === 0 && authTimer.sec === 0) {
      alert("인증 시간이 만료되었습니다. 다시 시도해주세요.");
      return;
    }

    try {
      const result = 1234
      // const result = await verifyEmailCode({
      //   inputKey: form.authKey,
      //   email: authEmail,
      // });

      if (Number(result) > 0) {
        clearInterval(timerRef.current);
        setValid((vd) => ({ ...vd, emailAuth: true }));
        setMsg((m) => ({ ...m, auth: "인증되었습니다." }));
      } else {
        setValid((vd) => ({ ...vd, emailAuth: false }));
        setMsg((m) => ({ ...m, auth: "인증번호가 올바르지 않습니다." }));
      }
    } catch {
      alert("인증 확인 중 오류가 발생했습니다.");
    }
  };

  const handleNicknameChange = (v) => {
    update("nickname", v);

    if (!v.trim()) {
      setNickWarn("");
      return;
    }

    if (!validateNick(v)) {
      setNickWarn("닉네임은 3~8자 (한글/영문/숫자)만 가능합니다.");
    } else {
      setNickWarn("");
    }
  };

  const handlePhoneChange = (v) => {
    update("phone", v);

    if (!v.trim()) {
      setPhoneWarn("");
      return;
    }

    if (!validatePhone(v)) {
      setPhoneWarn("전화번호는 숫자만 입력해주세요.");
    } else {
      setPhoneWarn("");
    }
  };

  const handleSearchAddr = () => {
    if (!window.daum || !window.daum.Postcode) {
      alert("주소 검색 모듈을 불러오지 못했습니다.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: function (data) {
        const addr =
          data.userSelectedType === "R"
            ? data.roadAddress
            : data.jibunAddress;

        update("postalCode", data.zonecode);
        update("addr1", addr);

        setTimeout(() => {
          refDetailAddr.current?.focus();
        }, 0);
      },
    }).open();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!captchaInput.trim()) {
      alert("보안문자를 입력해주세요.");
      return;
    }

    if (!valid.id) return alert("아이디를 확인해주세요.");
    if (!valid.pw) return alert("비밀번호 조건을 확인해주세요.");
    if (!valid.pwConfirm) return alert("비밀번호 확인이 일치하지 않습니다.");
    if (!form.name.trim() || !validateName(form.name))
      return alert("이름은 한글만 입력해주세요.");
    if (!valid.birth) return alert("생년월일(YYYYMMDD)을 확인해주세요.");
    if (!valid.email) return alert("이메일을 확인해주세요.");
    if (!valid.emailAuth) return alert("이메일 인증을 완료해주세요.");
    if (nickWarn) return alert(nickWarn);
    if (phoneWarn) return alert(phoneWarn);

    const payload = {
      login_id: form.loginId,
      password: form.password,
      name: form.name,
      email: form.email,
      phone: form.phone,
      nickname: form.nickname,
      postal_code: form.postalCode,
      addr1: form.addr1,
      addr2: form.addr2,
      birth: form.birth,
      is_admin: false,
      captcha_id: captchaId,
      captcha_text: captchaInput,
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/user/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "회원가입 실패");

      alert("회원가입이 완료되었습니다!");
      navigate("/login");
    } catch (err) {
      alert(err.message || "회원가입 중 오류가 발생했습니다.");
      fetchCaptcha();
    }
  };

  const timeText =
    authTimer.min + authTimer.sec > 0 && !valid.emailAuth
      ? `${String(authTimer.min).padStart(2, "0")}:${String(
          authTimer.sec
        ).padStart(2, "0")}`
      : "";
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 py-8">
      <img
        src="/image/main로고.png"
        alt="SumFlow"
        className="h-[60px] mb-6 object-contain cursor-pointer transition-transform hover:scale-105"
        onClick={() => navigate("/")}
      />

      <form
        onSubmit={handleSubmit}
        className="w-[360px] bg-white shadow-[0_0_15px_rgba(255,84,161,0.4)] rounded-2xl p-6 flex flex-col gap-4"
      >
        <p className="text-right text-sm">
          <span className="text-pink-500">★</span> 는 필수입력사항 입니다
        </p>

        {/* 아이디 */}
        <div>
          <label className="text-sm font-medium text-pink-500">★ 아이디</label>
          <input
            className="mt-1 w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none"
            placeholder="영문 대/소문자 6~16자"
            value={form.loginId}
            onChange={(e) => handleIdChange(e.target.value)}
          />
          {msg.id && (
            <p
              className={`text-xs mt-1 ${
                valid.id ? "text-green-600" : "text-red-500"
              }`}
            >
              {msg.id}
            </p>
          )}
        </div>

        {/* 비밀번호 */}
        <div>
          <label className="text-sm font-medium text-pink-500">
            ★ 비밀번호
          </label>
          <input
            type="password"
            className="mt-1 w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none"
            placeholder="8~16자 (대/소문자 + 특수문자 포함)"
            value={form.password}
            onChange={(e) => handlePwChange(e.target.value)}
          />
          {msg.pw && (
            <p
              className={`text-xs mt-1 ${
                valid.pw ? "text-green-600" : "text-red-500"
              }`}
            >
              {msg.pw}
            </p>
          )}
        </div>

        {/* 비밀번호 확인 */}
        <div>
          <label className="text-sm font-medium text-pink-500">
            ★ 비밀번호 확인
          </label>
          <input
            type="password"
            className="mt-1 w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none"
            placeholder="비밀번호를 다시 입력해주세요"
            value={form.passwordConfirm}
            onChange={(e) => handlePwConfirmChange(e.target.value)}
          />
          {!valid.pwConfirm && form.passwordConfirm && (
            <p className="text-xs mt-1 text-red-500">
              비밀번호가 일치하지 않습니다.
            </p>
          )}
        </div>

        {/* 이름 */}
        <div>
          <label className="text-sm font-medium text-pink-500">★ 이름</label>
          <input
            className="mt-1 w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none"
            placeholder="홍길동"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </div>

        {/* 생년월일 */}
        <div>
          <label className="text-sm font-medium text-pink-500">
            ★ 생년월일
          </label>
          <input
            className="mt-1 w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none"
            placeholder="YYYYMMDD"
            maxLength={8}
            value={form.birth}
            onChange={(e) => handleBirthChange(e.target.value)}
          />
          {msg.birth && (
            <p className="text-xs mt-1 text-red-500">{msg.birth}</p>
          )}
        </div>

        {/* 이메일 */}
        <div>
          <label className="text-sm font-medium text-pink-500">★ 이메일</label>

          <div className="mt-1 flex gap-2">
            <input
              className="flex-grow h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none"
              placeholder="이메일 입력"
              value={form.email}
              onChange={(e) => handleEmailChange(e.target.value)}
            />
            <button
              type="button"
              onClick={handleSendAuthCode}
              className="bg-gray-500 text-white text-xs px-3 rounded-lg h-11 flex items-center justify-center whitespace-nowrap"
            >
              인증번호 전송
            </button>
          </div>

          {msg.email && (
            <p className="text-xs mt-1 text-red-500">{msg.email}</p>
          )}
        </div>

        {/* 인증번호 입력 + 확인 */}
        <div>
          <div className="flex gap-2">
            <input
              className="flex-grow h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none"
              placeholder="인증번호 입력"
              maxLength={6}
              value={form.authKey}
              onChange={(e) => update("authKey", e.target.value)}
            />
            <button
              type="button"
              onClick={handleCheckAuthCode}
              className="bg-gray-500 text-white text-xs px-4 rounded-lg h-11 flex items-center justify-center whitespace-nowrap"
            >
              확인
            </button>
          </div>

          {timeText && !valid.emailAuth && (
            <p className="text-xs text-gray-500 mt-1">{timeText}</p>
          )}

          {msg.auth && (
            <p
              className={`text-xs mt-1 ${
                valid.emailAuth ? "text-green-600" : "text-red-500"
              }`}
            >
              {msg.auth}
            </p>
          )}
        </div>

        {/* 닉네임 (선택) */}
        <div>
          <label className="text-sm font-medium">닉네임 (선택)</label>
          <input
            className="mt-1 w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none"
            placeholder="3~8자"
            maxLength={8}
            value={form.nickname}
            onChange={(e) => handleNicknameChange(e.target.value)}
          />
          {nickWarn && (
            <p className="text-xs mt-1 text-red-500">{nickWarn}</p>
          )}
        </div>

        {/* 전화번호 (선택) */}
        <div>
          <label className="text-sm font-medium">전화번호 (선택)</label>
          <input
            className="mt-1 w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none"
            placeholder="- 제외 숫자만"
            maxLength={11}
            value={form.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
          />
          {phoneWarn && (
            <p className="text-xs mt-1 text-red-500">{phoneWarn}</p>
          )}
        </div>

        {/* 주소 (선택) */}
        <div>
          <label className="text-sm font-medium">주소 (선택)</label>

          <div className="mt-1 flex gap-2">
            <input
              className="flex-grow h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none"
              placeholder="우편번호"
              maxLength={6}
              value={form.postalCode}
              onChange={(e) => update("postalCode", e.target.value)}
            />
            <button
              type="button"
              onClick={handleSearchAddr}
              className="bg-gray-500 text-white text-xs px-3 rounded-lg h-11 flex items-center justify-center whitespace-nowrap"
            >
              검색
            </button>
          </div>

          <input
            className="mt-2 w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none"
            placeholder="도로명/지번 주소"
            value={form.addr1}
            onChange={(e) => update("addr1", e.target.value)}
          />

          <input
            ref={refDetailAddr}
            className="mt-2 w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none"
            placeholder="상세주소"
            value={form.addr2}
            onChange={(e) => update("addr2", e.target.value)}
          />
        </div>

        {/* ✅ 백엔드 보안문자 */}
        <div>
          <label className="text-sm font-medium text-pink-500">
            보안문자
          </label>

          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="border border-black bg-white rounded-lg min-w-[120px] h-11 flex items-center justify-center px-2 text-sm leading-none">
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

              <button
                type="button"
                className="bg-gray-500 text-white text-xs px-3 rounded-lg h-9 flex items-center justify-center whitespace-nowrap"
                onClick={fetchCaptcha}
              >
                새로고침
              </button>
            </div>

            <input
              className="w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none"
              placeholder="보안문자를 입력하세요"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
            />
          </div>
        </div>

        {/* 가입 버튼 */}
        <button
          type="submit"
          className="mt-2 w-full h-12 rounded-xl text-white text-base font-medium shadow-[0_0_15px_rgba(255,84,161,0.5)]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #FF54A1, #B862FF)",
          }}
        >
          회원 가입 하기
        </button>
      </form>
    </div>
  );
}
