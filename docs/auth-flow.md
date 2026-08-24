# Authentication Flow — CIBA (OpenID Connect Client-Initiated Backchannel Authentication)

## 개요

이 샘플은 매니저 계정 이메일 OTP로 로그인하기 위해 **CIBA** 흐름을 사용합니다. Duende IdentityServer의 표준 CIBA 엔드포인트를 그대로 호출하며, 별도의 클라이언트 SDK 의존성이 없습니다.

## 시퀀스 다이어그램

```
┌────────┐              ┌────────────────┐              ┌──────────────┐
│ Client │              │ IdentityServer │              │ Manager Email │
└───┬────┘              └────────┬───────┘              └──────┬───────┘
    │                            │                             │
    │  1. POST /connect/ciba     │                             │
    │  login_hint=email          │                             │
    │  scope=openid profile ...  │                             │
    │───────────────────────────>│                             │
    │                            │  2. 이메일 OTP 발송           │
    │                            │────────────────────────────>│
    │  auth_req_id, interval, exp│                             │
    │<───────────────────────────│                             │
    │                            │                             │
    │  3. POST /connect/token    │      (매니저가 OTP 입력      │
    │  grant_type=urn:openid:    │       → 서버가 검증)          │
    │  params:grant-type:ciba    │                             │
    │  auth_req_id=...           │                             │
    │  (반복 폴링, interval초 마다) │                             │
    │───────────────────────────>│                             │
    │  400 authorization_pending │                             │
    │<───────────────────────────│                             │
    │  ...                       │                             │
    │  200 { access_token,       │                             │
    │        refresh_token,      │                             │
    │        id_token,           │                             │
    │        expires_in }        │                             │
    │<───────────────────────────│                             │
    │                            │                             │
    │  4. GET /api/v1/manager/*  │                             │
    │  Authorization: Bearer <at>│                             │
    │───(Content API)───────────>│                             │
    │                            │                             │
    │  5. 갱신 필요 시:          │                             │
    │  POST /connect/token       │                             │
    │  grant_type=refresh_token  │                             │
    │  refresh_token=...         │                             │
    │───────────────────────────>│                             │
    │  200 { access_token, ... } │                             │
    │<───────────────────────────│                             │
```

## 엔드포인트 상세

### 1) CIBA authorization request

```
POST {STS_ISSUER}/connect/ciba
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

scope=openid profile email offline_access hospital-content-api
&login_hint=manager@hospital.example.com
&binding_message=Login-123456
```

응답:

```json
{
  "auth_req_id": "b0e3...9c",
  "expires_in": 300,
  "interval": 5
}
```

주의:
- `binding_message` 는 사용자가 이메일에서 승인할 때 어떤 요청인지 식별하는 짧은 문자열. 여러 세션 병행 로그인 시 유용.
- `scope` 에 `offline_access` 가 있어야 refresh_token 이 발급됨.

### 2) Token polling

```
POST {STS_ISSUER}/connect/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=urn:openid:params:grant-type:ciba
&auth_req_id=b0e3...9c
```

응답 (진행 중):

```json
{ "error": "authorization_pending" }
```

응답 (성공):

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200...",
  "id_token": "eyJ...",
  "scope": "openid profile email offline_access hospital-content-api"
}
```

오류 처리:
| error | 의미 | 처리 |
|---|---|---|
| `authorization_pending` | 사용자 미완료 | interval 후 재폴링 |
| `slow_down` | 폴링 과다 | interval 증가 후 재폴링 |
| `expired_token` | auth_req_id 만료 | 1단계부터 재시작 |
| `access_denied` | 사용자가 거부 | 종료 |

### 3) Refresh token

```
POST {STS_ISSUER}/connect/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=refresh_token
&refresh_token=def50200...
&scope=openid profile email offline_access hospital-content-api
```

응답: 1) 성공 응답과 동일. 대부분 `refresh_token` 이 새로 발급되므로 저장해 두었다가 다음 갱신에 사용.

## Content API 호출

발급된 `access_token` 을 모든 API 요청에 부착:

```
GET {API_BASE_URL}/api/v1/manager/articles
Authorization: Bearer {access_token}
Accept: application/json
```

### 401 처리

- `access_token` 만료 → refresh_token 으로 새 토큰 발급 후 1회 재시도
- refresh 도 실패 → 사용자에게 재로그인 요청 (CIBA 1단계부터)

### 429 처리

- `Retry-After` 헤더 존중, 없으면 지수 백오프 (2^n 초, 최대 3회)

## 보안 주의사항

- `client_secret`, `refresh_token`, `.tokens.json` 은 절대 소스 저장소에 커밋 금지. `.gitignore` 로 차단.
- 프로덕션 환경에서는 토큰을 OS keychain 또는 안전한 secret manager 에 저장. 로컬 파일은 개발용.
- 매니저 계정 자격증명·OTP 채널 유출 의심 시 즉시 클라우드호스피탈에 통지 → 계정 정지 + 토큰 회수 (약관 §11).
- `binding_message` 로 서로 다른 로그인 세션을 구분하되, 개인정보를 담지 말 것.

## 참조

- [OpenID Connect CIBA 1.0](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html)
- [Duende IdentityServer CIBA docs](https://docs.duendesoftware.com/identityserver/v7/tokens/ciba/)
- [RFC 6749 §6 — Refresh Token](https://datatracker.ietf.org/doc/html/rfc6749#section-6)
