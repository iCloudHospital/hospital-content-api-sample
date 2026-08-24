// examples/03-upload-image-and-publish.js
// 1) 이미지 업로드 (pre-signed URL 발급 → PUT → 메타 등록)
// 2) 아티클 생성 (본문에 이미지 참조)
// 3) 발행 (publish) → SaaS URL 응답

import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uploadImage } from "../src/media.js";
import { createArticle, publishArticle } from "../src/articles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_PATH = process.env.SAMPLE_IMAGE_PATH ?? path.join(__dirname, "..", "assets", "sample.jpg");
const IMAGE_MIME = process.env.SAMPLE_IMAGE_MIME ?? "image/jpeg";

async function main() {
  console.log(`[upload] Uploading image: ${IMAGE_PATH}`);
  const media = await uploadImage(IMAGE_PATH, IMAGE_MIME);
  console.log(`[upload] ✓ media.id=${media.id}`);

  console.log(`[create] Creating article with image reference...`);
  const article = await createArticle({
    title: "이미지 포함 샘플 아티클",
    slug: `sample-image-article-${Date.now()}`,
    languageCode: "ko",
    body: `<p>업로드된 이미지 참조:</p><img src="${media.publicUrl ?? media.url}" alt="sample" />`,
    excerpt: "이미지 업로드 예제",
    coverImageId: media.id,
  });
  console.log(`[create] ✓ article.id=${article.id}`);

  console.log(`[publish] Publishing...`);
  const published = await publishArticle(article.id);
  console.log(`[publish] ✓ status=${published.status}`);
  console.log(`[publish]   saas_url: ${published.saasUrl ?? "(SaaS 측 색인 대기)"}`);
}

main().catch((err) => {
  console.error(`[03] ✗ ${err.message}`);
  if (err.body) console.error(err.body);
  process.exit(1);
});
