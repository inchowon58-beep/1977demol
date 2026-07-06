# SEO 대량 생성 VM 연동 가이드

관리자에서 **대량 등록**하면 키워드가 서버 대기열(`generation-queue.json`)에 저장됩니다.  
VM 프로그램이 **설정한 시간(랜덤) 간격**마다 사이트 API를 호출해 **한 번에 1개씩** SEO 페이지를 생성합니다.

생성 완료 시 **순위반영(웹문서 수집) 대기열**에도 자동 등록됩니다. (기존 collection-worker와 동일)

---

## 1. 관리자 — 대량 등록

| 방식 | 설명 |
|------|------|
| **개별 등록** | 키워드 1개 → 즉시 Gemini 생성 |
| **대량 등록 (텍스트)** | 한 줄에 1개, 또는 `,`로 구분 (최대 50개) |
| **TXT 파일** | 위와 동일 형식의 `.txt` 업로드 |

대량 등록은 **즉시 생성하지 않고** VM 대기열에만 넣습니다.

---

## 2. API 명세

인증: 기존 VM과 **동일한 토큰** (`COLLECTION_WORKER_SECRET` / 마스터 설정 VM Worker API 토큰)

### 2-1. 대기 키워드 조회

```
GET https://{사이트}/api/seo-worker/jobs
Authorization: Bearer {토큰}
```

```json
{
  "count": 3,
  "summary": { "pending": 3, "processing": 0, "completed": 10, "failed": 0, "total": 13 },
  "jobs": [
    { "id": "gen-...", "keyword": "은평구철거지원금", "requestedAt": "..." }
  ]
}
```

### 2-2. 다음 1개 생성 (VM이 주기적으로 호출)

```
POST https://{사이트}/api/seo-worker/generate-next
Authorization: Bearer {토큰}
```

**성공 응답 예시**

```json
{
  "ok": true,
  "status": "created",
  "message": "SEO 페이지 생성 완료: 은평구 철거지원금",
  "page": { "id": "page-...", "slug": "...", "keyword": "...", "title": "..." },
  "remaining": 2,
  "collectionEnqueued": true
}
```

**대기 없음**

```json
{ "ok": true, "status": "empty", "message": "대기 중인 키워드가 없습니다.", "remaining": 0 }
```

**일일 한도 초과** — 해당 키워드는 다시 `pending`으로 돌아감 (다음날 재시도 가능)

```json
{ "ok": false, "status": "quota", "message": "오늘 SEO 페이지 생성 한도..." }
```

---

## 3. VM 프로그램 권장 흐름

```
loop:
  1. (선택) GET /api/seo-worker/jobs — 대기 개수 확인
  2. POST /api/seo-worker/generate-next — 1개 생성
  3. status가 empty면 대기열 없음 → 긴 간격 sleep
  4. status가 quota면 오늘 한도 도달 → 다음날까지 sleep
  5. random.uniform(min_sec, max_sec) 만큼 대기 후 반복
```

### worker_config.json 예시 (기존 수집 설정에 추가)

```json
{
  "api_base_url": "https://demolishzone.yourdogzone.co.kr",
  "worker_token": "여기에_토큰",
  "generation_interval_min_sec": 300,
  "generation_interval_max_sec": 600,
  "collection_interval_sec": 60
}
```

- `300` ~ `600` = 5분 ~ 10분 랜덤 간격

### Python 루프 예시

```python
import random
import time
import requests

API = "https://demolishzone.yourdogzone.co.kr"
TOKEN = "your-token"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}
MIN_WAIT = 300
MAX_WAIT = 600

while True:
    try:
        r = requests.post(f"{API}/api/seo-worker/generate-next", headers=HEADERS, timeout=180)
        data = r.json()
        print(data.get("message"), "remaining:", data.get("remaining"))

        if data.get("status") == "empty":
            time.sleep(600)
            continue
        if data.get("status") == "quota":
            time.sleep(3600)
            continue
    except Exception as e:
        print("error:", e)

    wait = random.uniform(MIN_WAIT, MAX_WAIT)
    print(f"sleep {wait:.0f}s")
    time.sleep(wait)
```

---

## 4. 수집 VM과 함께 쓰기

하나의 VM에서 **생성 루프**와 **수집 루프**를 병렬로 돌리거나, 생성 완료 후 기존 `collection-worker`가 URL을 가져가 네이버에 등록하면 됩니다.

| 작업 | API |
|------|-----|
| SEO 생성 | `POST /api/seo-worker/generate-next` |
| 웹문서 수집 | `GET/POST /api/collection-worker/jobs` |

---

## 5. 주의사항

- 한 번에 **최대 50개** 키워드 대량 등록
- **동시 생성 1개** (processing 중이면 VM은 대기)
- **일일 생성 한도** (`dailySeoLimit`) — 한도 초과 시 해당 키워드는 pending 유지
- Gemini 생성은 **30초~2분** 소요 — VM `timeout` 180초 권장
