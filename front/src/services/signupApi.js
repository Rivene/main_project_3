import { request } from "./http.js";

// 회원가입 요청
export function signup(payload) {
  return request("/member/signUp", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// 아이디 중복 체크
export function checkDuplicateId(loginId) {
  return fetch(`/dupCheck/id?id=${encodeURIComponent(loginId)}`).then((r) =>
    r.text()
  );
}

// 이메일 중복 체크
export function checkDuplicateEmail(email) {
  return fetch(`/dupCheck/email?email=${encodeURIComponent(email)}`).then((r) =>
    r.text()
  );
}

// 이메일 인증번호 전송
export function sendEmailCode(email) {
  return fetch(`/sendEmail/signUp?email=${encodeURIComponent(email)}`).then(
    (r) => r.text()
  );
}

// 이메일 인증번호 확인
export function verifyEmailCode({ inputKey, email }) {
  const qs = new URLSearchParams({ inputKey, email }).toString();
  return fetch(`/sendEmail/checkAuthKey?${qs}`).then((r) => r.text());
}