// src/auth.js — CIBA(OpenID Connect Client-Initiated Backchannel Authentication) 흐름
//
// 참조: https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html
// Duende IdentityServer의 CIBA 구현 참조: https://docs.duendesoftware.com/identityserver/v7/tokens/ciba/
//
// 흐름:
//   1) POST /connect/ciba   — login_hint(이메일) 전송, auth_req_id 반환. 서버가 이메일 OTP 발송.
//   2) 사용자가 OTP 입력·승인 (별도 채널)
//   3) POST /connect/token (grant_type=urn:openid:params:grant-type:ciba, auth_req_id=...) 로 폴링
//      - 400 authorization_pending: 사용자 미완료, interval 후 재시도
//      - 400 slow_down: 폴링 간격 늘리고 재시도
//      - 400 expired_token / access_denied: 실패 종료
//      - 200 { access_token, refresh_token, expires_in, id_token, token_type }
//   4) refresh: POST /connect/token (grant_type=refresh_token, refresh_token=...)

import fs from "node:fs/promises";
import path from "node:path";

const {
  STS_ISSUER,
  STS_CLIENT_ID,
  STS_CLIENT_SECRET,
  STS_SCOPE,
  MANAGER_EMAIL,
  CIBA_POLL_INTERVAL_SECONDS,
  CIBA_POLL_TIMEOUT_SECONDS,
  TOKEN_CACHE_FILE,
} = process.env;

const pollInterval = Number(CIBA_POLL_INTERVAL_SECONDS ?? 5) * 1000;
const pollTimeout = Number(CIBA_POLL_TIMEOUT_SECONDS ?? 300) * 1000;
const tokenCachePath = path.resolve(TOKEN_CACHE_FILE ?? ".tokens.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function assertEnv() {
  const required = ["STS_ISSUER", "STS_CLIENT_ID", "STS_CLIENT_SECRET", "STS_SCOPE", "MANAGER_EMAIL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`);
}

function basicAuthHeader() {
  const encoded = Buffer.from(`${STS_CLIENT_ID}:${STS_CLIENT_SECRET}`).toString("base64");
  return `Basic ${encoded}`;
}

async function postForm(url, params) {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
      Accept: "application/json",
    },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

// 1단계: CIBA authorization request
export async function requestCibaAuthorization({ email = MANAGER_EMAIL, bindingMessage } = {}) {
  assertEnv();
  const url = `${STS_ISSUER.replace(/\/$/, "")}/connect/ciba`;
  const params = {
    scope: STS_SCOPE,
    login_hint: email,
  };
  if (bindingMessage) params.binding_message = bindingMessage;

  const { status, body } = await postForm(url, params);
  if (status !== 200) {
    throw new Error(`CIBA authorize failed [${status}]: ${JSON.stringify(body)}`);
  }
  // body: { auth_req_id, expires_in, interval }
  return body;
}

// 2단계: token endpoint 폴링
export async function pollCibaToken(authReqId, { interval = pollInterval, timeout = pollTimeout } = {}) {
  const url = `${STS_ISSUER.replace(/\/$/, "")}/connect/token`;
  const deadline = Date.now() + timeout;
  let currentInterval = interval;

  while (Date.now() < deadline) {
    await sleep(currentInterval);
    const { status, body } = await postForm(url, {
      grant_type: "urn:openid:params:grant-type:ciba",
      auth_req_id: authReqId,
    });

    if (status === 200) {
      return normalizeTokens(body);
    }

    const err = body.error;
    if (err === "authorization_pending") continue;
    if (err === "slow_down") {
      currentInterval += 5000;
      continue;
    }
    if (err === "expired_token") throw new Error("CIBA auth_req_id expired. Restart the flow.");
    if (err === "access_denied") throw new Error("User denied CIBA authorization.");
    throw new Error(`CIBA token poll failed [${status}]: ${JSON.stringify(body)}`);
  }
  throw new Error(`CIBA polling timed out after ${timeout / 1000}s.`);
}

// 3단계: refresh_token
export async function refreshTokens(refreshToken) {
  const url = `${STS_ISSUER.replace(/\/$/, "")}/connect/token`;
  const { status, body } = await postForm(url, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: STS_SCOPE,
  });
  if (status !== 200) {
    throw new Error(`Refresh failed [${status}]: ${JSON.stringify(body)}`);
  }
  return normalizeTokens(body);
}

function normalizeTokens(body) {
  const expiresIn = Number(body.expires_in ?? 3600);
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    id_token: body.id_token,
    token_type: body.token_type ?? "Bearer",
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    scope: body.scope,
  };
}

export function isExpired(tokens, bufferSeconds = 60) {
  if (!tokens?.expires_at) return true;
  return Math.floor(Date.now() / 1000) + bufferSeconds >= tokens.expires_at;
}

export async function saveTokens(tokens) {
  await fs.writeFile(tokenCachePath, JSON.stringify(tokens, null, 2), "utf8");
}

export async function loadTokens() {
  try {
    const raw = await fs.readFile(tokenCachePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// 편의: 캐시된 토큰이 있으면 필요 시 refresh, 없으면 새로 로그인 (OTP 필요)
export async function getOrRefreshTokens({ onNeedsOtp } = {}) {
  const cached = await loadTokens();
  if (cached && !isExpired(cached)) return cached;
  if (cached?.refresh_token) {
    try {
      const refreshed = await refreshTokens(cached.refresh_token);
      await saveTokens(refreshed);
      return refreshed;
    } catch (e) {
      // fall through to new login
    }
  }
  if (typeof onNeedsOtp !== "function") {
    throw new Error("No valid tokens cached; pass onNeedsOtp callback to run OTP login flow.");
  }
  const tokens = await onNeedsOtp();
  await saveTokens(tokens);
  return tokens;
}
