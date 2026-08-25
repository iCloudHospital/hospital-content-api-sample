// src/media.js — 이미지 업로드 래퍼
// 실제 경로: CloudHospital Admin API `POST /api/v1/images` (multipart/form-data, 필드명 "files").
// 응답: MediaModel[] ({ id, url, thumbnailUrl, ... }). Azure Blob 저장은 서버가 처리한다.
// (프리사인 URL 방식이 아님)

import fs from "node:fs/promises";
import path from "node:path";
import { apiJson } from "./client.js";

// 서버(ImageSharp) 가 디코딩 가능한 래스터 포맷 → MIME 매핑.
// SVG 등 벡터/기타 포맷은 미지원이라 업로드 전에 걸러낸다.
const EXT_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".tga": "image/x-tga",
  ".pbm": "image/x-portable-bitmap",
  ".qoi": "image/qoi",
};

const SUPPORTED_LABEL = "JPEG, PNG, WebP, GIF, BMP, TIFF, TGA, PBM, QOI";

// 파일 확장자로 지원 여부를 검증하고 MIME 을 결정한다.
// - 미지원 확장자(예: .svg)면 업로드 전에 친절한 에러를 던진다.
// - explicitContentType 이 주어지면 그것을 쓰고, 없으면 확장자로 자동 추론한다
//   (하드코딩된 기본 MIME 때문에 png 를 image/jpeg 로 보내는 문제 방지).
function resolveContentType(filePath, explicitContentType) {
  const ext = path.extname(filePath).toLowerCase();
  const inferred = EXT_TO_MIME[ext];
  if (!inferred) {
    throw new Error(
      `지원하지 않는 이미지 포맷: ${ext || "(확장자 없음)"} — ${path.basename(filePath)}\n` +
        `  서버는 래스터 이미지만 지원합니다: ${SUPPORTED_LABEL}.\n` +
        `  SVG 등 벡터 이미지는 PNG/JPEG 로 변환한 뒤 업로드하세요.`,
    );
  }
  return explicitContentType || inferred;
}

// 로컬 이미지 파일 여러 개 업로드 → MediaModel[]
// contentType 은 선택 — 생략하면 각 파일의 확장자에서 자동 추론한다.
export async function uploadImages(filePaths, contentType, options) {
  const form = new FormData();
  for (const filePath of filePaths) {
    const mime = resolveContentType(filePath, contentType);
    const buffer = await fs.readFile(filePath);
    // Node 20+ 전역 Blob/FormData 사용. multipart boundary/Content-Type 은 fetch 가 자동 설정하므로
    // 여기서 Content-Type 헤더를 지정하면 안 된다 (client.js 도 지정하지 않음).
    form.append("files", new Blob([buffer], { type: mime }), path.basename(filePath));
  }
  return apiJson("/api/v1/images", { method: "POST", body: form }, options);
}

// 편의: 파일 하나 업로드 → 첫 번째 MediaModel
export async function uploadImage(filePath, contentType, options) {
  const medias = await uploadImages([filePath], contentType, options);
  return Array.isArray(medias) ? medias[0] : medias;
}
