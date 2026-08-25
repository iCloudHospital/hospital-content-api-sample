// src/client.js — Content API 호출용 fetch 래퍼
// - Bearer 토큰 자동 부착
// - 401 시 refresh 후 1회 재시도
// - 429 시 Retry-After 헤더 존중 + 지수 백오프

import { getOrRefreshTokens, refreshTokens, saveTokens, loadTokens } from "./auth.js";
import { fetchRetry } from "./http.js";

const API_BASE = (process.env.API_BASE_URL ?? "").replace(/\/$/, "");

if (!API_BASE) throw new Error("API_BASE_URL not set.");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withBearer(path, init = {}, tokens) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${tokens.access_token}`);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  return fetchRetry(url, { ...init, headers });
}

async function refreshAndSave(oldTokens) {
  if (!oldTokens?.refresh_token) throw new Error("No refresh_token available for retry.");
  const refreshed = await refreshTokens(oldTokens.refresh_token);
  await saveTokens(refreshed);
  return refreshed;
}

// 최대 재시도: 429 3회, 401 1회
export async function apiFetch(path, init = {}, { onNeedsOtp } = {}) {
  let tokens = await getOrRefreshTokens({ onNeedsOtp });
  let attempt429 = 0;
  let triedRefresh = false;

  while (true) {
    const res = await withBearer(path, init, tokens);

    if (res.status === 401 && !triedRefresh) {
      triedRefresh = true;
      tokens = await refreshAndSave(tokens);
      continue;
    }

    if (res.status === 429 && attempt429 < 3) {
      const retryAfter = Number(res.headers.get("retry-after")) || Math.pow(2, attempt429);
      await sleep(retryAfter * 1000);
      attempt429 += 1;
      continue;
    }

    return res;
  }
}

// 편의: JSON 응답까지 파싱
export async function apiJson(path, init = {}, options) {
  const res = await apiFetch(path, init, options);
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const message = body?.title ?? body?.error_description ?? body?.error ?? res.statusText;
    const err = new Error(`API ${init.method ?? "GET"} ${path} failed [${res.status}]: ${message}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
