# artifact-organizer

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![Claude Code plugin](https://img.shields.io/badge/claude--code-plugin-6E56CF.svg)](https://docs.claude.com/en/docs/claude-code)

[English](README.md) · [한국어](README.ko.md) · **日本語**

**エージェントが生成したアーティファクトの居場所。** エージェント（Claude、Codex、Cursor など）に組み込むと、エージェントの出力を自己完結型のテーマ付き HTML ファイルに変換し、それらのファイルを一つの永続的で再スタイル可能なダッシュボードにスタックします。

---

## なぜ

エージェントは有用なアーティファクト（レポート、ダイアグラム、ダッシュボード）を生成しますが、それらは使い捨てです。チャットごとに散らばり、実行のたびに失われ、レンダリングも厄介です — **LLM は生の HTML が苦手**だからです（トークンを大量に消費し、一貫性がなく、`</div>` が一つ抜けるだけですべて壊れます）。

artifact-organizer は両端を解決します:

- **エージェントはセマンティック JSON のみを出力** — 固定カタログからコンポーネントを選び、props を埋めるだけ。HTML も CSS もクラス名もありません。
- **レンダラーが表現を担当** — 検証し、テーマを適用し、すべての CSS/JS/フォントを一つの `.html` にインライン化。オフラインで開けます。ビルド工程も CDN も不要です。
- **オーガナイザーが保管しスタック** — すべてのアーティファクトが一つの育っていくキャンバスに収まり、後で閲覧したり再スタイルしたりできます。

---

## できること

| | |
|---|---|
| 🎨 **スタイリング** | あらゆるアーティファクトを 7 つのテーマのいずれかで自己完結型 HTML ファイルとしてレンダリング。テーマはいつでも切り替え可能で、内容は変わりません。 |
| 🗂️ **整理（スタック）** | アーティファクトを一つの永続的なダッシュボードにスタック。最新のものがメイン（featured）、残りは下のヒストリーフィードに保管されます。 |

---

## クイックスタート

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
open /tmp/hello.html      # macOS — Linux では xdg-open
```

セマンティック JSON を書く → レンダラーを実行 → HTML を開く。これがループの全体です。

**スタックする場合** — 同じアーティファクトを育っていくダッシュボードに追加します:

```bash
node plugins/artifact-organizer/scripts/organize.mjs \
  --store ~/.artifact-organizer/decks/work.json \
  --add /tmp/hello.json --title "Deploy status" --theme apple
```

次のアーティファクトで再実行すると、その上にスタックされます。どこかで得た HTML ファイルを渡すと、エージェントが**あなたのテーマに合わせたネイティブコンポーネントとして再構築**します — 元のスタイルは取り除かれ、全体が一つの統一されたサイトとして読めます。（ピクセル単位で原本をそのまま保持したい場合は？ `--embed` で iframe に入れます。）

---

## インストール

実際には CLI を手動で実行しません — エージェントスキルとしてインストールし、自然言語で頼むだけです（「ダイアグラムを作って」「これを tailwind で再スタイルして」「私のダッシュボードに追加して」）。

**Claude Code**

```
/plugin marketplace add keepYaoung/artifact-organizer
/plugin install artifact-organizer@artifact-organizer-marketplace
```

**その他のエージェント（Codex、Cursor、Gemini CLI など）**

```bash
npx skills add keepYaoung/artifact-organizer
```

2 つのスキルがインストールされます: **`artifact-organizer`**（生成 + スタック）と **`artifact-styler`**（任意のテーマで再スタイル）。

---

## テーマ

**組み込みスタイルテーマ 7 種** — すべての出力はライト + ダークを同時にインライン化します（表示時にトグル）:

| テーマ | スタイル |
|---|---|
| `notion` | 温かいクリーム、Notion ブルー、読みやすさ優先（デフォルト） |
| `linear` | ダークネイティブ、インディゴアクセント、タイトな Inter |
| `vercel` | ギャラリーホワイト、Geist、影をボーダーに |
| `stripe` | ウェイト 300 の高級感あるヘッドライン、ディープネイビー |
| `supabase` | ダークネイティブ、エメラルドアクセント、ボーダー階層 |
| `apple` | SF スタイルのクールグレー、Apple ブルー、柔らかな立体感 |
| `tailwind` | Inter、slate ランプ、indigo-600、レイヤード シャドウ |

```bash
--theme apple    # 7 つのいずれかに差し替え
```

一つを**ハウススタイル**として選ぶと、すべてのアーティファクト — そしてスタックするすべてのドキュメント — がそのスタイルでレンダリングされます。いつでも切り替え可能で、内容は決して変わりません。

---

## コンポーネント

構造・データ・ダイアグラム・コード・ナラティブ・スライド・キャンバスにまたがる 36 コンポーネント — `Page`、`Section`、`DataTable`、`Chart`、`Mermaid`、`FlowChart`、`Callout`、`StepList` など、さらに生の HTML アーティファクトをそのままスタックする `Embed`。props は**セマンティックデータのみ**を持ち、スタイリング用の props はスキーマが拒否します。

すべての prop スキーマ: [`plugins/artifact-organizer/references/catalog.md`](plugins/artifact-organizer/references/catalog.md)。

---

## どこに置くか

出力は単一の自己完結型 `.html` なので、3 通りでホスティングできます:

- **ローカル** — ファイルを開くだけ（デフォルト）。
- **無料・公開** — **GitHub Pages** で公開し、`you.github.io/…` のリンク（ドメイン不要）。
- **独自ドメイン** — デプロイ（`/artifact-organizer:share` 経由で Vercel）してドメインを向ける → 非公開/ブランド URL。

初回実行時に、エージェントがどれを希望するか（およびハウススタイル + フッター情報）を尋ね、記憶します。

---

## しくみ

```
エージェント → セマンティック JSON エンベロープ → レンダラー → 一つの自己完結型 .html
                                          │
                                          └─ organize.mjs が永続キャンバスにスタック
```

- **ページモード** — 単発のドキュメント（`parts[]`）。
- **キャンバスモード** — オーガナイザーが時間とともに育てる永続ダッシュボード（`featured` + `history[]`）。

レンダラーがエンベロープから自動的にどちらかを判別します。エンベロープの完全な形式と作成ガイドは [`skills/`](skills/) のスキルドキュメントを参照してください。

---

## ライセンス

MIT — [LICENSE](LICENSE) を参照。

---

## 由来

artifact-organizer は [@Atipico1](https://github.com/Atipico1) による [**hyperscribe**](https://github.com/Atipico1/hyperscribe) のフォークとして始まり、その後独自のプロジェクトへと分岐しました（名称変更、構造の再編、そしてスタック型オーガナイザー・テーマ・公開機能の拡張）。基盤を築いた原作者に感謝します。
