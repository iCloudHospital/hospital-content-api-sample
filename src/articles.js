// src/articles.js — Article API 래퍼
// 실제 경로: CloudHospital Admin API `POST/GET /api/v1/articles`, `/api/v1/articles/{id}` 등.
// 발행(publish) 전용 엔드포인트는 없다 — 공개 조건은 `status == Active` AND 해당 언어 번역의
// `confirmed == true` (+ 미삭제/미숨김) 이고, SaaS 측 색인/캐시 반영은
// `/revalidate?includeCurrent=true` 로 요청한다. 자세한 내용은 docs/content-api-flow.md 참고.

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

// 전체 수정 (PUT). 본문에 없는 필드는 서버에서 기본값으로 덮어써진다.
// 부분 수정만 필요하면 patchArticle() 을 쓰는 편이 안전하다.
//
// confirmed 를 생략하면 서버가 IsConfirmed=false 로 덮어써서 아티클이 공개 사이트에서 사라진다
// (공개 조건이 status=Active "그리고" IsConfirmed=true 라서). 서버측 UpdateArticleCommand.Confirmed 는
// non-nullable bool 이라 JSON 에 없으면 false 로 역직렬화된다 — 호출부가 잊으면 무증상 비공개화가 된다.
// 그래서 호출부가 값을 주지 않았을 때만 true 로 채운다. 명시적으로 false 를 주면 그대로 존중한다.
// ponytail: 기존 IsConfirmed 값을 읽어와 보존하는 게 정확하지만 그러려면 GET 이 한 번 더 필요하다.
//           "수정하면 계속 공개" 가 이 샘플의 의도라 true 로 가정한다. 정밀 제어가 필요하면 patchArticle() 사용
//           (PATCH 쪽 Confirmed 는 nullable 이라 생략하면 기존 값이 보존된다).
export function updateArticle(id, body, options) {
  const payload = { ...body, confirmed: body.confirmed ?? true };
  return apiJson(
    `${BASE}/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
//
// includeCurrent=true 가 필수다. 서버 핸들러가 `if (request.IncludeCurrent)` 안에서만 재검증 잡을
// 큐에 넣고, 컨트롤러 기본값은 false 다. 즉 이 파라미터 없이 호출하면 아무 잡도 돌지 않은 채
// 200 true 가 돌아와서 성공한 것처럼 보인다.
// (includeCurrent 는 "연관 엔티티 캐스케이드와 별개로 지목한 엔티티 자신의 페이지도 재검증" 이라는
//  서버 전역 컨벤션이다. Article 은 캐스케이드 대상이 없어서 이 분기가 동작의 전부다.)
export function revalidateArticle(id, options) {
  return apiJson(`${BASE}/${id}/revalidate?includeCurrent=true`, { method: "POST" }, options);
}
