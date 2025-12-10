# System Prompt Playground

システムプロンプトを実験できる簡易アプリケーションです。Next.jsとAnthropic Claude APIを使用して、様々なシステムプロンプトをテストし、AIの振る舞いを確認できます。

## 特徴

- **リアルタイムプロンプト編集**: システムプロンプトを自由に編集し、即座にAIの動作を確認
- **プリセット機能**: よく使うプロンプトをプリセットとして保存・選択可能
- **チャットインターフェース**: シンプルで使いやすいチャットUI
- **ダークモード対応**: システムの設定に応じた自動切り替え

## セットアップ

### 必要なもの

- Node.js 18以上
- Anthropic API Key

### インストール手順

1. リポジトリのクローンまたはダウンロード

```bash
cd prompt-playground
```

2. 依存関係のインストール

```bash
npm install
```

3. 環境変数の設定

`.env.local.example` を `.env.local` にコピーし、APIキーを設定:

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して、Anthropic API Keyを設定:

```env
ANTHROPIC_API_KEY=your_actual_api_key_here
```

APIキーは [Anthropic Console](https://console.anthropic.com/) から取得できます。

4. 開発サーバーの起動

```bash
npm run dev
```

5. ブラウザで開く

[http://localhost:3000](http://localhost:3000) にアクセス

## 使い方

### 基本的な使い方

1. **プリセット選択**: 左パネルのドロップダウンから用途に合ったプリセットを選択
2. **プロンプト編集**: テキストエリアでシステムプロンプトを自由に編集
3. **チャット開始**: 右パネルのチャット欄からメッセージを送信
4. **動作確認**: AIの応答を確認し、必要に応じてプロンプトを調整
5. **リセット**: 会話をリセットして新しいテストを開始

### プリセット

以下のプリセットが用意されています:

- **デフォルト**: 基本的なアシスタント
- **ゲームマスター**: ストーリーテリングに特化
- **RPG NPC**: ゲームキャラクターのロールプレイ
- **パズル作成者**: 謎解き・パズルの作成
- **デバッグヘルパー**: コードのデバッグ支援

### カスタムプロンプトの作成

1. プリセットを選択するか、新規に作成
2. テキストエリアでプロンプトを編集
3. チャットで動作を確認
4. 必要に応じて `app/page.tsx` の `PRESET_PROMPTS` に追加

## プロジェクト構造

```
prompt-playground/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # Claude API呼び出し
│   ├── globals.css           # グローバルスタイル
│   ├── layout.tsx            # ルートレイアウト
│   └── page.tsx              # メインページ（UI）
├── .env.local.example        # 環境変数のテンプレート
├── .gitignore
├── next.config.ts            # Next.js設定
├── package.json
├── postcss.config.mjs        # PostCSS設定
├── tailwind.config.ts        # Tailwind CSS設定
└── tsconfig.json             # TypeScript設定
```

## カスタマイズ

### プリセットの追加

`app/page.tsx` の `PRESET_PROMPTS` オブジェクトに新しいプリセットを追加:

```typescript
const PRESET_PROMPTS = {
  // ... 既存のプリセット
  custom_name: {
    name: '表示名',
    prompt: 'あなたのカスタムプロンプト...',
  },
};
```

### モデルの変更

`app/api/chat/route.ts` でモデルを変更可能:

```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022', // ここを変更
  // ...
});
```

利用可能なモデル:
- `claude-3-5-sonnet-20241022` (推奨)
- `claude-3-opus-20240229`
- `claude-3-haiku-20240307`

## デプロイ

### Vercel

最も簡単なデプロイ方法はVercelを使用することです:

1. GitHubにリポジトリをプッシュ
2. Vercelにインポート
3. 環境変数 `ANTHROPIC_API_KEY` を設定
4. デプロイ

## トラブルシューティング

### APIエラーが発生する

- `.env.local` にAPIキーが正しく設定されているか確認
- APIキーが有効か確認
- 開発サーバーを再起動

### スタイルが適用されない

```bash
npm install
npm run dev
```

## ライセンス

MIT

## コントリビューション

プルリクエストを歓迎します！

## 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
