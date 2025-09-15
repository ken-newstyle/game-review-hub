# Game Review Hub

学習用のフルスタックサンプル（FastAPI + PostgreSQL + React/Vite）。ゲームとレビューのCRUD、ページネーション/ソート、最小UIを提供します。

## 構成
- バックエンド: FastAPI, SQLAlchemy, Alembic, Uvicorn
- データベース: PostgreSQL 16（Docker）
- フロントエンド: React + Vite + TypeScript + Chakra UI
- ストレージ（今後拡張用）: MinIO（現状未使用）

## ポート
- バックエンド: http://localhost:4000
- フロントエンド: http://localhost:5173
- PostgreSQL: localhost:5432
- MinIO: http://localhost:9000（Console: http://localhost:9001）

## ディレクトリ
- apps/backend: FastAPI アプリ（app/ 配下）
- apps/frontend: Vite + React アプリ
- docker/: Dockerfile 群

## クイックスタート
1. 環境ファイルを作成
   - cp .env.backend.example .env.backend
   - cp .env.frontend.example .env.frontend
2. 起動
   - docker compose up -d --build
3. アクセス
   - フロント: http://localhost:5173/
   - ヘルス: curl http://localhost:4000/health

## APIメモ
- ゲーム一覧（ページ/ソート対応）: GET /api/games?page=1&limit=10&sort=created_at_desc
- ゲーム作成: POST /api/games
  - 例: {"title":"Zelda","platform":"Switch","released_on":"2017-03-03"}
- レビュー一覧: GET /api/reviews?game_id=1
- レビュー作成: POST /api/reviews
- エラー形式（例）: {"error": {"code": "validation_error", ...}}

## Alembic（DBマイグレーション）
- 変更の自動生成:
  - docker compose exec -w /app backend alembic revision --autogenerate -m "your message"
- 適用:
  - docker compose exec -w /app backend alembic upgrade head
- 開発DBを初期化したい場合:
  - docker compose down -v → 再度 up

## 開発コマンド
- ログ: docker compose logs -f backend / frontend / db
- 再起動: docker compose restart backend（ホットリロード対応）
- シェル: docker compose exec backend sh / frontend sh

## トラブルシュート
- フロントの依存解決に失敗する場合:
  - docker compose exec frontend npm install
- DBが立ち上がる前にAPI起動で失敗する場合:
  - backend は起動時に自動リトライ。改善しない場合は docker compose restart backend

---

## 今後の拡張メモ
- ゲームサーバー管理（WebSocket/スケーリング）
- 配信プラットフォーム（CDN模擬）
- ランキング/レート制限
