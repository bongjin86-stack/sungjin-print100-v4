# Nagi - Astro Theme

「Nagi」は中小企業やスタートアップ企業などのコーポレートサイト向けに制作された Astro テンプレートです。  
完全レスポンシブ対応、Scss & TypeScript使用。

[デモを見る](https://nagi-6tu.pages.dev/) | [📖 ドキュメント](https://yohaku.dev/docs)

## Getting Started

```bash
npm install
npm run dev # 開発サーバー起動 (http://localhost:4321)
```

### デプロイ

```bash
npm run build  # 本番用に ./dist/ にビルド
```

Cloudflare Pages、Netlify、Vercel、または任意の静的ホスティングに手動またはGit連携でアップロード。

## テンプレート構成

- トップページ, 私たちについて, 会社概要, サービス
- お問い合わせ（送信完了ページ含む）
- お知らせ（一覧、詳細、カテゴリ別）
- 制作実績（一覧、詳細、カテゴリ別）
- 個人情報保護方針（プライバシーポリシー）
- 404ページ

## プロジェクト構造

```text
/
├── public/
│   └── images/          # 静的アセット
│       └── favicon.svg       # ファビコン
├── src/
│   ├── assets/          # Astro最適化対象の画像
│   ├── components/
│   │   ├── sections/    # セクションコンポーネント（19種類）
│   │   └── ...
│   ├── config/          # JSON設定ファイル（サイト基本情報、メニュー、FAQなど）
│   ├── data/            # Markdownコンテンツ（お知らせ記事, 制作実績）
│   ├── pages/           # ページファイル
│   ├── styles/          # デザイントークン, フォント定義, グローバルスタイル
│   └── ...
├── astro.config.mjs     # Astro設定ファイル
└── package.json
```

## カスタマイズ方法

コンポーネント詳細、設定ガイド等の完全なドキュメント:  
**→ [yohaku.dev/docs](https://yohaku.dev/docs)**

## コマンド一覧

すべてのコマンドは、ターミナルからプロジェクトのルートで実行してください。

| Command           | Action                               |
| ----------------- | ------------------------------------ |
| `npm install`     | 依存関係のインストール               |
| `npm run dev`     | 開発サーバー起動 (localhost:4321)    |
| `npm run build`   | 本番ビルド (./dist/)                 |
| `npm run preview` | ビルドのプレビュー                   |
| `npm run lint`    | コードのリント                       |
| `npm run format`  | コードフォーマット（Prettier）       |
| `npm run check`   | リントチェック＋フォーマットチェック |

## Requirements

- Node.js: 22.12.0 以上
- npm: 9.0.0 以上
- astro: 5.16.0 以上

## ライセンス

本テーマ（テンプレート）は「販売」ではなく「使用ライセンス」として提供されます。

- **Personal**: 単一プロジェクトまで。個人または自社利用のみ（クライアントワーク不可）
- **Agency**: 最大3プロジェクトまで（クライアントワーク可）

禁止事項・画像の扱い・AI 利用制限・ライセンス変更ポリシー等の詳細は  
同梱の `LICENSE` ファイル、または下記ページをご確認ください。  
https://yohaku.dev/license/

## カスタム開発サービスが必要ですか？

カスタムテーマ開発、テーマのカスタマイズ、またはゼロからの完全なWebサイト開発サービスが必要な場合は、お気軽にご相談ください。

**お問い合わせ:** hello@yohaku.dev でカスタム開発やテーマのカスタマイズなどお気軽にご相談ください。
**他のテーマ:** [yohaku](https://yohaku.dev/)
