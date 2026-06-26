# artifact-organizer

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![Claude Code plugin](https://img.shields.io/badge/claude--code-plugin-6E56CF.svg)](https://docs.claude.com/en/docs/claude-code)

[English](README.md) · **한국어** · [日本語](README.ja.md)

**에이전트가 만든 아티팩트를 위한 집.** 에이전트(Claude, Codex, Cursor 등)에 붙이면, 에이전트의 출력물을 자체 완결형 테마 HTML 파일로 바꿔주고 — 그 파일들을 하나의 영속적이고 다시 꾸밀 수 있는 대시보드에 스택해줍니다.

---

## 왜

에이전트는 유용한 아티팩트(리포트, 다이어그램, 대시보드)를 만들어내지만, 전부 일회용입니다. 채팅마다 흩어지고, 실행 사이에 잃어버리고, 렌더링도 고통스럽죠 — **LLM은 원시 HTML을 잘 못 다루기** 때문입니다(토큰을 많이 먹고, 일관성이 없고, `</div>` 하나만 빠져도 전부 깨집니다).

artifact-organizer는 양쪽 끝을 모두 해결합니다:

- **에이전트는 시맨틱 JSON만 출력** — 고정된 카탈로그에서 컴포넌트를 고르고 props만 채웁니다. HTML도, CSS도, 클래스명도 없습니다.
- **렌더러가 표현을 담당** — 검증하고, 테마를 입히고, 모든 CSS/JS/폰트를 하나의 `.html`에 인라인해서 오프라인에서도 열립니다. 빌드 단계도, CDN도 없습니다.
- **오거나이저가 보관하고 스택** — 모든 아티팩트가 하나의 커져가는 캔버스에 쌓이고, 나중에 둘러보거나 다시 꾸밀 수 있습니다.

---

## 할 수 있는 것

| | |
|---|---|
| 🎨 **스타일링** | 어떤 아티팩트든 7가지 테마 중 하나로 자체 완결형 HTML 파일로 렌더링. 언제든 테마를 바꿔도 내용은 그대로입니다. |
| 🗂️ **정리(스택)** | 아티팩트를 하나의 영속적인 대시보드에 스택. 가장 최신 것이 메인(featured), 나머지는 아래 히스토리 피드로 보관됩니다. |

---

## 빠른 시작

```bash
git clone https://github.com/keepYaoung/artifact-organizer.git
cd artifact-organizer

cat > /tmp/hello.json <<'EOF'
{
  "a2ui_version": "0.9",
  "catalog": "artifact-organizer/v1",
  "parts": [{
    "component": "artifact-organizer/Page",
    "props": { "title": "Deploy status" },
    "children": [
      { "component": "artifact-organizer/StepList", "props": { "steps": [
        { "title": "Run test suite",    "body": "All green.",            "state": "done"  },
        { "title": "DB migration",      "body": "Apply pending changes.", "state": "doing" },
        { "title": "Deploy to staging", "body": "Ship to staging.",       "state": "todo"  }
      ]}}
    ]
  }]
}
EOF

node plugins/artifact-organizer/scripts/render.mjs --in /tmp/hello.json --out /tmp/hello.html --theme apple
open /tmp/hello.html      # macOS — Linux에서는 xdg-open
```

시맨틱 JSON 작성 → 렌더러 실행 → HTML 열기. 이게 전체 루프입니다.

**스택하려면** — 같은 아티팩트를 커져가는 대시보드에 추가합니다:

```bash
node plugins/artifact-organizer/scripts/organize.mjs \
  --store ~/.artifact-organizer/decks/work.json \
  --add /tmp/hello.json --title "Deploy status" --theme apple
```

다음 아티팩트로 다시 실행하면 그 위에 스택됩니다. 아무 데서나 가져온 HTML 파일을 건네면 에이전트가 **당신의 테마에 맞는 네이티브 컴포넌트로 재구성** 합니다 — 원본의 스타일은 벗겨져서 전체가 하나의 일관된 사이트처럼 읽힙니다. (픽셀 단위로 원본을 그대로 보존하고 싶다면? `--embed`로 iframe에 넣습니다.)

---

## 설치

실제로는 CLI를 직접 실행하지 않습니다 — 에이전트 스킬로 설치하고 자연어로 요청하면 됩니다("다이어그램 만들어줘", "이거 tailwind로 다시 꾸며줘", "내 대시보드에 추가해줘").

**Claude Code**

```
/plugin marketplace add keepYaoung/artifact-organizer
/plugin install artifact-organizer@artifact-organizer-marketplace
```

**다른 에이전트 (Codex, Cursor, Gemini CLI 등)**

```bash
npx skills add keepYaoung/artifact-organizer
```

스킬 두 개가 설치됩니다: **`artifact-organizer`**(생성 + 스택), **`artifact-styler`**(어떤 테마로든 다시 스타일링).

---

## 테마

**내장 스타일 테마 7종** — 모든 출력물은 라이트 + 다크를 함께 인라인합니다(보는 시점에 토글):

| 테마 | 스타일 |
|---|---|
| `notion` | 따뜻한 크림, Notion 블루, 읽기 우선 (기본값) |
| `linear` | 다크 네이티브, 인디고 액센트, 타이트한 Inter |
| `vercel` | 갤러리 화이트, Geist, 그림자를 테두리로 |
| `stripe` | 굵기 300의 럭셔리 헤드라인, 딥 네이비 |
| `supabase` | 다크 네이티브, 에메랄드 액센트, 보더 위계 |
| `apple` | SF 스타일 쿨 그레이, Apple 블루, 부드러운 입체감 |
| `tailwind` | Inter, slate 램프, indigo-600, 레이어드 섀도 |

```bash
--theme apple    # 일곱 개 중 아무거나로 교체
```

하나를 **하우스 스타일**로 고르면 모든 아티팩트 — 그리고 스택하는 모든 문서 — 가 그 스타일로 렌더링됩니다. 언제든 교체 가능하고, 내용은 절대 바뀌지 않습니다.

---

## 컴포넌트

구조·데이터·다이어그램·코드·내러티브·슬라이드·캔버스에 걸친 36개 컴포넌트 — `Page`, `Section`, `DataTable`, `Chart`, `Mermaid`, `FlowChart`, `Callout`, `StepList` 등, 그리고 원시 HTML 아티팩트를 그대로 스택하는 `Embed`. props는 **시맨틱 데이터만** 담으며, 스타일링 props는 스키마가 거부합니다.

전체 prop 스키마: [`plugins/artifact-organizer/references/catalog.md`](plugins/artifact-organizer/references/catalog.md).

---

## 어디에 둘까

출력물은 단일 자체 완결형 `.html`이라 세 가지 방식으로 호스팅할 수 있습니다:

- **로컬** — 그냥 파일 열기 (기본값).
- **무료 공개** — **GitHub Pages**로 발행해서 `you.github.io/…` 링크 (도메인 불필요).
- **내 도메인** — 배포(`/artifact-organizer:share`로 Vercel) 후 도메인 연결 → 비공개/브랜드 URL.

첫 실행 때 에이전트가 어느 쪽을 원하는지(그리고 하우스 스타일 + 푸터 정보) 묻고 기억합니다.

---

## 동작 방식

```
에이전트 → 시맨틱 JSON 봉투 → 렌더러 → 하나의 자체 완결형 .html
                                  │
                                  └─ organize.mjs 가 영속 캔버스에 스택
```

- **페이지 모드** — 일회성 문서 (`parts[]`).
- **캔버스 모드** — 오거나이저가 시간에 따라 키워가는 영속 대시보드 (`featured` + `history[]`).

렌더러가 봉투를 보고 자동으로 어느 쪽인지 감지합니다. 전체 봉투 형식과 작성 가이드는 [`skills/`](skills/)의 스킬 문서를 참고하세요.

---

## 라이선스

MIT — [LICENSE](LICENSE) 참고.

---

## 출처

artifact-organizer는 [@Atipico1](https://github.com/Atipico1)의 [**hyperscribe**](https://github.com/Atipico1/hyperscribe)를 포크하여 시작했으며, 이후 독자적인 프로젝트로 분기했습니다(이름 변경, 구조 개편, 그리고 스택 오거나이저·테마·발행 기능 확장). 토대를 만들어준 원작자들에게 감사합니다.
