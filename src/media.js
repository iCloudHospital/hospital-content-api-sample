// src/media.js — LocalManager Media 업로드 래퍼
// 1) /manager/media/upload-urls 로 pre-signed URL 발급
// 2) 반환된 URL로 파일 직접 PUT
// 3) /manager/media 로 메타데이터 등록 (등록된 mediaId 반환)

import fs from "node:fs/promises";
import path from "node:path";
import { apiJson } from "./client.js";

const V = "v1";

export async function requestUploadUrl({ fileName, contentType }, options) {
  return apiJson(
    `/api/${V}/manager/media/upload-urls`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, contentType }),
    },
    options,
  );
}

export async function uploadFileToPresignedUrl(presignedUrl, filePath, contentType) {
  const buffer = await fs.readFile(filePath);
  const res = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType, "x-ms-blob-type": "BlockBlob" },
    body: buffer,
  });
  if (!res.ok) {
    throw new Error(`Blob PUT failed [${res.status}]: ${await res.text()}`);
  }
}

export async function registerMedia(payload, options) {
  return apiJson(
    `/api/${V}/manager/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    options,
  );
}

// 편의: 로컬 파일 하나를 한 번에 업로드
export async function uploadImage(filePath, contentType, options) {
  const fileName = path.basename(filePath);
  const { uploadUrl, blobUri } = await requestUploadUrl({ fileName, contentType }, options);
  await uploadFileToPresignedUrl(uploadUrl, filePath, contentType);
  return registerMedia({ blobUri, contentType, fileName }, options);
}
