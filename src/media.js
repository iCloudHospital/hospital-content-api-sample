// src/media.js — 이미지 업로드 래퍼
// 실제 경로: CloudHospital Admin API `POST /api/v1/images` (multipart/form-data, 필드명 "files").
// 응답: MediaModel[] ({ id, url, thumbnailUrl, ... }). Azure Blob 저장은 서버가 처리한다.
// (프리사인 URL 방식이 아님)

import fs from "node:fs/promises";
import path from "node:path";
import { apiJson } from "./client.js";

// 로컬 이미지 파일 여러 개 업로드 → MediaModel[]
export async function uploadImages(filePaths, contentType, options) {
  const form = new FormData();
  for (const filePath of filePaths) {
    const buffer = await fs.readFile(filePath);
    // Node 20+ 전역 Blob/FormData 사용. multipart boundary/Content-Type 은 fetch 가 자동 설정하므로
    // 여기서 Content-Type 헤더를 지정하면 안 된다 (client.js 도 지정하지 않음).
    form.append("files", new Blob([buffer], { type: contentType }), path.basename(filePath));
  }
  return apiJson("/api/v1/images", { method: "POST", body: form }, options);
}

// 편의: 파일 하나 업로드 → 첫 번째 MediaModel
export async function uploadImage(filePath, contentType, options) {
  const medias = await uploadImages([filePath], contentType, options);
  return Array.isArray(medias) ? medias[0] : medias;
}
