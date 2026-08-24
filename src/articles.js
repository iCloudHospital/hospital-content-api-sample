// src/articles.js — LocalManager Article API 래퍼
// 실제 경로는 hospital-swagger 문서(계약 부속 B)의 최종 확정본 기준. 아래는 예상 경로.

import { apiJson } from "./client.js";

const V = "v1"; // 실제 버전은 계약 부속 B 참조

export async function listArticles(query = {}, options) {
  const qs = new URLSearchParams(query).toString();
  return apiJson(`/api/${V}/manager/articles${qs ? `?${qs}` : ""}`, { method: "GET" }, options);
}

export async function getArticle(id, options) {
  return apiJson(`/api/${V}/manager/articles/${id}`, { method: "GET" }, options);
}

export async function createArticle(body, options) {
  return apiJson(
    `/api/${V}/manager/articles`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options,
  );
}

export async function updateArticle(id, body, options) {
  return apiJson(
    `/api/${V}/manager/articles/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options,
  );
}

export async function deleteArticle(id, options) {
  return apiJson(`/api/${V}/manager/articles/${id}`, { method: "DELETE" }, options);
}

export async function publishArticle(id, options) {
  return apiJson(`/api/${V}/manager/articles/${id}/publish`, { method: "POST" }, options);
}

export async function unpublishArticle(id, options) {
  return apiJson(`/api/${V}/manager/articles/${id}/unpublish`, { method: "POST" }, options);
}
