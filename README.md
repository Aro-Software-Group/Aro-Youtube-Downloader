# Aro YouTube ダウンローダー

YouTubeの動画や音声を簡単にダウンロードできるWebアプリケーションです。

## 機能

- YouTubeの動画ダウンロード（mp4形式、音声付き）
- 音声のみのダウンロード（mp3形式）
- 解像度選択（480p, 720p, 1080p, 4K）
- PCとスマートフォン両方に対応したレスポンシブデザイン
- プレビュー機能
- 一括ダウンロード機能（複数のURLを同時処理）

## 使い方

### 基本的な使い方

1. アプリケーションにアクセスします
2. YouTubeのURLを入力フィールドに貼り付けます
3. 「情報取得」ボタンをクリックします
4. 動画情報とプレビューが表示されます
5. 「動画 (MP4)」または「音声のみ (MP3)」タブを選択します
6. 動画の場合は解像度を選択できます
7. 「動画をダウンロード」または「音声をダウンロード」ボタンをクリックします
8. ダウンロードが完了するまで待ちます

### 一括ダウンロード機能の使い方

1. 「一括ダウンロードモード」ボタンをクリックします
2. 複数のYouTube URLを入力フィールドに1行ずつ入力します
3. 「一括処理開始」ボタンをクリックします
4. 全ての動画/音声が処理されるまで待ちます

## インストール方法

### 必要条件

- Python 3.10以上
- pip（Pythonパッケージマネージャー）
- ffmpeg（動画・音声処理ツール）

### インストール手順

1. リポジトリをクローンまたはダウンロードします
2. 必要なライブラリをインストールします：
   ```
   pip install pytube flask yt-dlp moviepy gunicorn
   ```
3. ffmpegをインストールします：
   ```
   # Ubuntuの場合
   sudo apt-get install ffmpeg
   
   # macOSの場合
   brew install ffmpeg
   
   # Windowsの場合
   # https://ffmpeg.org/download.html からダウンロードしてインストール
   ```

### アプリケーションの起動

1. アプリケーションディレクトリに移動します
2. 開発モードで起動：
   ```
   python app.py
   ```
3. 本番モードで起動（Gunicornを使用）：
   ```
   gunicorn -c gunicorn_config.py app:app
   ```

## ファイル構成

- `app.py`: アプリケーションのエントリーポイント
- `downloader.py`: YouTubeダウンロード機能のコア実装
- `gunicorn_config.py`: Gunicornの設定ファイル
- `templates/`: HTMLテンプレートファイル
  - `index.html`: メインページ
  - `terms.html`: 利用規約ページ
  - `privacy.html`: プライバシーポリシーページ
- `static/`: 静的ファイル
  - `css/style.css`: スタイルシート
  - `js/script.js`: JavaScriptファイル

## 注意事項

- このアプリケーションは個人利用目的で作成されています
- YouTubeの利用規約に従って使用してください
- 著作権で保護されたコンテンツのダウンロードには注意してください

## ライセンス

© Aro Software Group

自由に使用してください！
