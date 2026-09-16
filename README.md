# hospital-content-api-sample

병원 매니저 계정으로 **클라우드호스피탈 콘텐츠(아티클·이미지)를 프로그램으로 등록·수정·삭제**해 볼 수 있는 예제 모음입니다. 이메일 OTP로 로그인한 뒤, 아티클을 만들고 이미지를 올리고 발행까지 하는 과정을 순서대로 담았습니다.

> 개발 지식이 깊지 않아도 아래 순서를 그대로 따라 하면 실행할 수 있도록 정리했습니다.

---

## 1. 준비물

**클라우드호스피탈에서 전달받는 값** (계약/발급)
- 로그인 서버 주소(`STS_ISSUER`), API 주소(`API_BASE_URL`)
- `client_id` / `client_secret`
- 매니저 계정 이메일 (OTP를 받을 수 있는 메일함)
- 병원 ID (`HOSPITAL_ID`, GUID 형식)

**직접 설치할 것**
- **Node.js 20 이상** — https://nodejs.org 에서 "LTS" 버전을 받아 설치하세요.
  설치 후 터미널(명령 프롬프트/PowerShell)에서 아래로 확인:
  ```bash
  node --version
  ```
  `v20...` 이상이 보이면 됩니다.

---

## 2. 설치

```bash
# 코드 내려받기 (git 이 없으면 GitHub 페이지의 "Code > Download ZIP" 으로 받아 압축을 풀어도 됩니다)
git clone https://github.com/iCloudHospital/hospital-content-api-sample.git
cd hospital-content-api-sample

# 설정 파일 준비 (예시 파일을 복사)
cp .env.example .env

# 필요한 라이브러리 설치
npm install
```

---

## 3. 설정 (`.env` 파일 채우기)

메모장 등으로 `.env` 파일을 열어 아래 값을 채웁니다. **굵게 표시된 값**만 직접 넣으면 되고, 나머지는 그대로 둬도 됩니다.

| 항목 | 설명 | 넣을 값 |
|---|---|---|
| **`STS_ISSUER`** | 로그인 서버 주소 | 클라우드호스피탈 제공 |
| **`STS_CLIENT_ID`** | 클라이언트 ID | 클라우드호스피탈 제공 |
| **`STS_CLIENT_SECRET`** | 클라이언트 비밀키 | 클라우드호스피탈 제공 |
| **`MANAGER_EMAIL`** | 매니저 계정 이메일 (OTP 수신함) | 본인 계정 이메일 |
| **`API_BASE_URL`** | 콘텐츠 API 주소 | 클라우드호스피탈 제공 |
| **`HOSPITAL_ID`** | 병원 ID (GUID) | 클라우드호스피탈 제공 |
| `ARTICLE_LANGUAGE_CODE` | 아티클 언어 | 기본 `en-US`. 한국어 콘텐츠면 `ko` |
| `STS_SCOPE` | 권한 범위 | 그대로 |
| `CIBA_POLL_*`, `TOKEN_CACHE_FILE` | 내부 설정 | 그대로 |
| `SAMPLE_IMAGE_PATH`, `SAMPLE_IMAGE_MIME` | 예제 이미지(선택) | 비워두면 기본 이미지 사용 |

> `.env` 파일에는 비밀키가 들어가므로 **다른 사람과 공유하거나 저장소에 올리지 마세요.** (이미 `.gitignore` 로 차단되어 있습니다.)

---

## 4. 실행

터미널에서 순서대로 실행합니다.

### ① 로그인 (이메일 OTP)

```bash
node examples/01-login-otp.js
```
1. 실행하면 매니저 이메일로 **6자리 인증코드(OTP)** 가 발송됩니다.
2. 메일함에서 코드를 확인해 터미널에 입력하고 Enter.
3. 성공하면 토큰이 `.tokens.json` 에 저장되어, 이후 예제들이 이 토큰을 재사용합니다.

> 코드가 안 오면 스팸함을 확인하고, 5분 안에 입력하세요.

### ② 아티클 생성

```bash
node examples/02-create-article.js
```
성공하면 만들어진 아티클의 **id** 와 slug 가 출력됩니다. (이 id 를 ④·⑤에서 사용)

### ③ 이미지 업로드 + 발행

```bash
node examples/03-upload-image-and-publish.js
```
이미지를 올리고, 그 이미지를 넣은 아티클을 만들어 발행합니다.

> 이미지는 **JPEG · PNG · WebP · GIF · BMP · TIFF · TGA · PBM · QOI** 만 됩니다. **SVG 는 안 되니** PNG/JPEG 로 변환해 쓰세요. 다른 이미지를 쓰려면 `.env` 의 `SAMPLE_IMAGE_PATH` 에 파일 경로를 넣으면 됩니다.

### ④ 아티클 수정 / ⑤ 삭제

`<articleId>` 자리에 ② 또는 ③에서 출력된 아티클 id 를 넣습니다.

```bash
node examples/04-update-article.js <articleId>
node examples/05-delete-article.js <articleId>
```

> 예제 ④는 `PUT`(전체 덮어쓰기)을 씁니다. 일부 필드만 고치려면 `PATCH` 가 안전합니다 — [7장](#7-수정할-때-알아야-할-제약) 참고.

---

## 5. 문제 해결

| 증상 | 원인 / 해결 |
|---|---|
| `fetch failed` | 주소 오타 또는 네트워크 문제. `.env` 의 `STS_ISSUER`·`API_BASE_URL` 값을 다시 확인하세요. (오류 메시지의 `cause` 줄에 실제 원인이 표시됩니다.) |
| `OTP를 못 받음` | 스팸함 확인, `MANAGER_EMAIL` 이 정확한지 확인, 5분 안에 입력. |
| `401` / `audience ... invalid` | 토큰이 만료됐거나 권한 미설정. `node examples/01-login-otp.js` 로 다시 로그인하거나 클라우드호스피탈에 문의. |
| 이미지 업로드 `Image cannot be loaded` | 지원하지 않는 포맷(예: SVG). PNG/JPEG 로 변환해 사용. |
| 만든 아티클이 화면에 안 보임 | ① 언어 필터 — `ARTICLE_LANGUAGE_CODE` 와 관리 화면의 언어를 맞추세요(기본 `en-US`). ② `confirmed` 가 `false` — 관리 화면에는 보이는데 공개 사이트에만 안 보이면 이쪽입니다([6장](#6-콘텐츠-발행과-revalidate)). ③ `revalidate` 미반영 — `?includeCurrent=true` 없이 호출했는지 확인. |

---

## 6. 콘텐츠 발행과 revalidate

### 공개 조건은 4가지 — `status` 하나가 아닙니다

아티클이 공개 사이트에 보이려면 **아래를 전부** 만족해야 합니다.

| 조건 | 설명 |
|---|---|
| `status` = `Active` | 발행 상태 |
| `confirmed` = `true` | **해당 언어 번역이 "확인됨" 상태** |
| 삭제되지 않음 | `DELETE` 하지 않은 상태 |
| 숨김 아님 | 관리자가 숨김 처리하지 않은 상태 |

`confirmed` 가 **두 번째 독립 발행 스위치**입니다. `status: "Active"` 여도 `confirmed` 가 `false` 면 공개 사이트에서 보이지 않습니다. (관리 화면에는 계속 보이기 때문에 알아차리기 어렵습니다.)

> ⚠️ **PUT 으로 수정할 때 `confirmed` 를 빠뜨리면 아티클이 조용히 비공개가 됩니다.**
> 서버는 `confirmed` 가 없으면 `false` 로 간주하고 덮어씁니다. 이 저장소의 `updateArticle()` 은
> 호출부가 값을 주지 않으면 자동으로 `confirmed: true` 를 채워 이 사고를 막습니다.

### 발행 후 공개 반영 (revalidate)

발행 상태로 저장해도 공개 사이트는 성능을 위해 페이지를 캐시하기 때문에 **바로 보이지 않을 수 있습니다.** 그래서 발행 후 한 번 더 호출합니다:

```
POST /api/v1/articles/{articleId}/revalidate?includeCurrent=true
```

> ⚠️ **`?includeCurrent=true` 가 반드시 필요합니다.** 이 파라미터 없이 호출하면 서버가 재검증 작업을
> 실행하지 않은 채 `200 true` 를 돌려줍니다. **성공한 것처럼 보이지만 아무 일도 일어나지 않습니다.**
> 이 저장소의 `revalidateArticle()` 은 항상 이 파라미터를 붙입니다.

정리하면:

- **저장(발행)** = 생성/수정 시 `status: "Active"` **그리고** `confirmed: true`
- **공개 반영** = `revalidate?includeCurrent=true`

`Draft`/`Archived` 는 공개 대상이 아니라 `revalidate` 가 필요 없습니다. 예제도 `Active` 일 때만 자동으로 호출합니다. (별도 `publish` 엔드포인트는 없습니다.)

---

## 7. 수정할 때 알아야 할 제약

### PATCH 를 권장합니다

| | `PUT /api/v1/articles/{id}` | `PATCH /api/v1/articles/{id}` |
|---|---|---|
| 동작 | **전체 덮어쓰기** | **보낸 필드만 반영** |
| 빠뜨린 필드 | 기본값으로 덮어써짐 (데이터 유실) | 기존 값 유지 |
| `confirmed` 생략 시 | **`false` 로 덮어써짐 → 비공개화** | 기존 값 유지 (안전) |
| 필수 필드 | `languageCode`, `name` | 없음 |

**일부 필드만 고칠 거라면 `PATCH`(`patchArticle()`)를 쓰세요.** `PUT` 은 본문에 넣지 않은 필드가 전부 기본값으로 덮어써지므로, 전체 내용을 다시 보낼 때만 쓰는 게 안전합니다. 자동화·스크립트라면 특히 `PATCH` 를 권장합니다.

### `languageCode` 를 틀리면 수정이 아니라 새 번역이 생깁니다

아티클은 언어별 번역으로 나뉘어 있고, 요청 하나는 `languageCode` **한 개**만 건드립니다.

> ⚠️ 그 언어의 번역이 **없으면 수정이 아니라 새 번역이 만들어집니다.** 오타 하나로 의도치 않은 언어
> 번역이 생겨 데이터가 지저분해지므로, 생성할 때 쓴 언어와 정확히 맞추세요. (`.env` 의 `ARTICLE_LANGUAGE_CODE`)

### `name` 은 250**바이트** 제한 — 한글은 약 83자

제한 단위가 글자 수가 아니라 **UTF-8 바이트**입니다. 한글은 한 글자가 3바이트이므로:

- 영문/숫자: 약 250자
- **한글: 약 83자**

넘으면 `400` 과 함께 `Name exceeds the maximum byte length(250)` 오류가 납니다.

### `slug` 는 본문 수정으로 바뀌지 않습니다

`slug`(주소용 이름)는 **아티클을 만들 때 `name` 에서 자동 생성되고, 이후 수정으로는 바뀌지 않습니다.** 이미 공개된 URL 이 깨지지 않도록 일부러 그렇게 되어 있습니다.

정말 바꿔야 한다면 전용 엔드포인트가 따로 있습니다 (`PUT /api/v1/articles/{articleId}/slug`, 같은 250바이트 제한). **URL 이 바뀌면 검색 노출에 영향이 있으므로 꼭 필요할 때만 사용하세요.**

---

## 8. 기술 참고 (개발자용)

이 예제는 순수 HTTP + OpenID Connect **CIBA** 흐름으로 인증하며 별도 SDK 의존성이 없습니다.

- 인증 흐름(로그인/토큰) 상세: [docs/auth-flow.md](docs/auth-flow.md)
- 아티클 생성·수정·삭제 흐름 상세: [docs/content-api-flow.md](docs/content-api-flow.md)

로그인 요약:
1. `POST /connect/ciba` — 매니저 이메일 전송 → 서버가 OTP 발송, `auth_req_id` 반환
2. `POST /ciba/signInRequest` — 사용자가 받은 6자리 OTP 제출 → `auth_req_id` 승인
3. `POST /connect/token` (`grant_type=…:ciba`) — 토큰 발급 (`access_token` + `refresh_token`)
4. `Authorization: Bearer <access_token>` 로 Content API 호출
5. 만료 임박 시 `POST /connect/token` (`grant_type=refresh_token`) 로 갱신

---

## 9. 지원

- API 변경 통지: 계약 시 지정한 이메일 리스트로 최소 14일 전 사전 통지
- LocalManager Swagger 문서: `https://api.cloudhospital.com/hospital-swagger`
- 이슈: 계약서 §7 명시된 지원 채널 참조
