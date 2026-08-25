# hospital-content-api-sample

클라우드호스피탈 SaaS Content API를 병원 매니저(LocalManager) 계정으로 호출하기 위한 Node.js 예제 프로그램입니다. 순수 HTTP + OpenID Connect CIBA(Client-Initiated Backchannel Authentication) 흐름으로 인증하며 별도 npm private 의존성이 없습니다.

## 사전 준비

- Node.js 20 이상
- 계약된 병원 매니저 계정 (이메일 + 비밀번호)
- 클라우드호스피탈에서 전달받은 client_id / client_secret
- 매니저 계정 이메일이 유효한 OTP 수신 가능한 상태

## 설치

```bash
git clone https://github.com/iCloudHospital/hospital-content-api-sample.git
cd hospital-content-api-sample
cp .env.example .env
# .env 파일 열어 실제 값 채워넣기
npm install
```

## 실행

```bash
# 1. 인증 흐름 확인 (OTP 이메일 수신 → 콘솔에 코드 입력 → 토큰 발급)
node examples/01-login-otp.js

# 2. 아티클 생성
node examples/02-create-article.js

# 3. 이미지 업로드 후 발행
node examples/03-upload-image-and-publish.js
```

## 흐름 요약 (CIBA)

1. `POST /connect/ciba` 로 login_hint(매니저 이메일) 전송 → 서버가 이메일 OTP 발송, `auth_req_id` 반환
2. 사용자가 이메일로 받은 6자리 OTP를 `POST /ciba/signInRequest` 로 제출 → 해당 `auth_req_id` 승인
3. `POST /connect/token` (`grant_type=urn:openid:params:grant-type:ciba`) 로 토큰 발급 (2에서 승인됐으므로 즉시 `access_token` + `refresh_token` 반환)
4. `Authorization: Bearer <access_token>` 헤더로 Content API 호출
5. 만료 임박 시 `POST /connect/token` (`grant_type=refresh_token`) 으로 갱신

자세한 시퀀스 다이어그램: [docs/auth-flow.md](docs/auth-flow.md)

## 콘텐츠 발행과 revalidate

아티클을 `status: "Active"` 로 생성/수정하면 Content API(백엔드 DB)에는 곧바로 **발행 상태**로 저장됩니다. 하지만 병원의 공개 SaaS 사이트는 성능을 위해 페이지를 **정적으로 생성·캐시(ISR 방식)** 하기 때문에, 새로 발행한 글이 공개 페이지에 **즉시 나타나지는 않습니다.**

그래서 발행 후 별도로 한 번 더 호출합니다:

```
POST /api/v1/articles/{articleId}/revalidate
```

이 요청은 SaaS 측에 **해당 페이지의 재생성·재검증(캐시 무효화 + 재색인)** 을 트리거하여, 발행한 아티클이 공개 사이트에 반영되도록 합니다. 즉:

- **저장(발행 상태)** = 아티클 생성/수정 시 `status: "Active"`
- **공개 반영** = `revalidate` 호출

`Draft` / `Archived` 상태는 공개 색인 대상이 아니므로 `revalidate` 가 필요 없습니다. 예제(`02`, `03`)도 생성된 아티클의 `status` 가 `Active` 일 때만 `revalidate` 를 호출합니다.

> 별도 `publish` 엔드포인트는 없습니다. 발행 여부는 `status` 필드로 제어하고, 공개 반영은 `revalidate` 로 처리합니다.

## 지원

- API 변경 통지: 계약 시 지정한 이메일 리스트로 최소 14일 전 사전 통지
- LocalManager Swagger 문서: `https://api.cloudhospital.com/hospital-swagger`
- 이슈: 계약서 §7 명시된 지원 채널 참조
