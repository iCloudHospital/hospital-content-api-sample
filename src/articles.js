// src/articles.js — Article API 래퍼
// 실제 경로: CloudHospital Admin API `POST/GET /api/v1/articles`, `/api/v1/articles/{id}` 등.
// 발행(publish) 전용 엔드포인트는 없다 — 발행 상태는 `status` 필드(ArticleStatus)로 제어하고,
// SaaS 측 색인/캐시 반영은 `/revalidate` 로 요청한다.

import { apiJson } from "./client.js";

const BASE = "/api/v1/articles";

// ArticleStatus enum (문자열로 직렬화됨: Draft=미발행, Active=발행, Archived=보관)
export const ArticleStatus = Object.freeze({
  Draft: "Draft",
  Active: "Active",
  Archived: "Archived",
});

export function listArticles(query = {}, options) {
  const qs = new URLSearchParams(query).toString();
  return apiJson(`${BASE}${qs ? `?${qs}` : ""}`, { method: "GET" }, options);
}

export function getArticle(id, options) {
  return apiJson(`${BASE}/${id}`, { method: "GET" }, options);
}

export function createArticle(body, options) {
  return apiJson(
    BASE,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options,
  );
}

export function updateArticle(id, body, options) {
  return apiJson(
    `${BASE}/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options,
  );
}

// 부분 수정 (요청한 필드만 변경). 예: 발행 상태만 바꾸기 { status: "Active" }
export function patchArticle(id, body, options) {
  return apiJson(
    `${BASE}/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options,
  );
}

export function deleteArticle(id, options) {
  return apiJson(`${BASE}/${id}`, { method: "DELETE" }, options);
}

// 발행 후 SaaS 측 색인/캐시 재검증 요청 (별도 publish 엔드포인트 대체)
export function revalidateArticle(id, options) {
  return apiJson(`${BASE}/${id}/revalidate`, { method: "POST" }, options);
}
