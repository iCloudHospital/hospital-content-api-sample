// examples/03-upload-image-and-publish.js
// 1) 이미지 업로드 (POST /api/v1/images, multipart) → MediaModel
// 2) 아티클 생성 (본문에 이미지 참조 + 커버 이미지) — status="Active" 로 발행
// 3) revalidate 로 SaaS 반영

import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uploadImage } from "../src/media.js";
import { createArticle, revalidateArticle, ArticleStatus } from "../src/articles.js";
import { describeError } from "../src/http.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOSPITAL_ID = process.env.HOSPITAL_ID;
const IMAGE_PATH = process.env.SAMPLE_IMAGE_PATH ?? path.join(__dirname, "..", "assets", "sample.jpg");
const IMAGE_MIME = process.env.SAMPLE_IMAGE_MIME ?? "image/jpeg";

async function main() {
  if (!HOSPITAL_ID) {
    throw new Error("HOSPITAL_ID 환경변수가 필요합니다. .env 에 병원 ID(GUID)를 설정하세요.");
  }

  console.log(`[upload] Uploading image: ${IMAGE_PATH}`);
  const media = await uploadImage(IMAGE_PATH, IMAGE_MIME, {
    onNeedsOtp: () => {
      throw new Error("Tokens missing/expired. Run: node examples/01-login-otp.js");
    },
  });
  console.log(`[upload] ✓ media.id=${media.id} url=${media.url}`);

  console.log(`[create] Creating article with image reference...`);
  const article = await createArticle({
    languageCode: "ko",
    name: "이미지 포함 샘플 아티클",
    title: "이미지 포함 샘플",
    description: "이미지 업로드 예제",
    content: `<p>업로드된 이미지 참조:</p><img src="${media.url}" alt="sample" />`,
    markdown: `업로드된 이미지: ${media.url}`,
    hospitalId: HOSPITAL_ID,
    articleType: "Blog",
    status: ArticleStatus.Active,
    photo: media.url, // 커버 이미지
    photoThumbnail: media.thumbnailUrl ?? media.url,
  });
  console.log(`[create] ✓ article.id=${article.id} status=${article.status}`);

  // 발행(Active) 상태일 때만 SaaS 반영. Draft/Archived 는 색인 대상이 아니므로 생략한다.
  if (article.status === ArticleStatus.Active) {
    console.log(`[publish] status=Active → revalidate (SaaS 반영)...`);
    await revalidateArticle(article.id);
    console.log(`[publish] ✓ Revalidate 요청 완료. slug=${article.slug ?? "(pending)"}`);
  } else {
    console.log(`[publish] status=${article.status} → 미발행이므로 revalidate 생략.`);
  }
}

main().catch((err) => {
  console.error(`[03] ✗ ${describeError(err)}`);
  if (err.body) console.error(err.body);
  process.exit(1);
});
