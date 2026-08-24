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
2. 사용자가 이메일로 받은 OTP 입력
3. `POST /connect/token` (`grant_type=urn:openid:params:grant-type:ciba`) 로 폴링 → 서버가 OTP 검증 완료하면 `access_token` + `refresh_token` 반환
4. `Authorization: Bearer <access_token>` 헤더로 Content API 호출
5. 만료 임박 시 `POST /connect/token` (`grant_type=refresh_token`) 으로 갱신

자세한 시퀀스 다이어그램: [docs/auth-flow.md](docs/auth-flow.md)

## 지원

- API 변경 통지: 계약 시 지정한 이메일 리스트로 최소 14일 전 사전 통지
- LocalManager Swagger 문서: `https://api.cloudhospital.com/hospital-swagger`
- 이슈: 계약서 §7 명시된 지원 채널 참조
