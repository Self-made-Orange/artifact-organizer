# Artifact Organizer Gallery — Plan

## 목표
생성된 모든 hyperscribe HTML 페이지를 Pinterest 스타일 카드 갤러리로 보여주는 인덱스 페이지.

---

## 구조

### `artifact-organizer/GalleryIndex` 컴포넌트
- JSON에서 `pages` 배열을 받아 마소너리/그리드 카드 레이아웃 렌더링
- 각 카드: 실제 스크린샷 이미지 배경 + 제목 + 테마 + 날짜 오버레이
- 클릭 시 해당 HTML로 이동

```json
{
  "component": "artifact-organizer/GalleryIndex",
  "props": {
    "title": "Artifact Organizer Gallery",
    "pages": [
      {
        "title": "Silent House",
        "href": "/sh.html",
        "preview": "/sh-preview.jpg",
        "theme": "silent-house",
        "date": "2026-04-29"
      }
    ]
  }
}
```

---

## 구현 단계

### 1. Preview 이미지 생성 (기존 페이지)
- `sh.html` → `sh-preview.jpg` (computer-use 스크린샷)
- `audi.html` → `audi-preview.jpg`
- 이후 `render.mjs`에 `--preview` 플래그 추가 고려

### 2. GalleryIndex 컴포넌트
- `plugins/artifact-organizer/scripts/components/gallery-index.mjs`
- `plugins/artifact-organizer/assets/components/gallery-index.css`
- 마소너리 그리드 (CSS columns 또는 grid + dense)
- 카드 hover: 제목/메타 오버레이 슬라이드업
- 반응형 (3col desktop → 2col tablet → 1col mobile)

### 3. catalog.json + render.mjs 등록

### 4. gallery.json 엔벨로프 생성
- `/tmp/gallery.html` 렌더링
- 스튜디오 또는 전용 gallery 테마 적용

---

## 카드 디자인 레퍼런스
- 배경: 스크린샷 이미지 (object-fit: cover)
- 오버레이: 하단 그라디언트 + 흰색 텍스트
- 호버: scale(1.02) + 오버레이 진해짐
- 태그 pill: 테마명 (silent-house, audi-f1 등)
- aspect-ratio: `3/4` (portrait) 또는 `16/9` (landscape) 선택 가능

---

## 향후 확장
- `render.mjs --preview` 플래그: 렌더 후 headless 스크린샷 자동 저장
- 날짜/테마별 필터링
- 검색
