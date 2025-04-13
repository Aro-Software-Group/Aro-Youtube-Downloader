import os
import logging
from flask import Flask, request, jsonify, render_template, send_file, abort
from werkzeug.utils import secure_filename
import time

# ロギング設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ダウンローダーモジュールをインポート
from downloader import YouTubeDownloader, app

# ダウンロードディレクトリの設定
DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

# ダウンローダーインスタンスの作成
downloader = YouTubeDownloader(download_path=DOWNLOAD_DIR)

# エラーハンドリング
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'リソースが見つかりません'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'サーバーエラーが発生しました'}), 500

# ファイルクリーンアップ（古いファイルを削除）
def cleanup_old_files(directory, max_age_hours=24):
    """指定された時間より古いファイルを削除する"""
    try:
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        for filename in os.listdir(directory):
            file_path = os.path.join(directory, filename)
            if os.path.isfile(file_path):
                file_age = current_time - os.path.getmtime(file_path)
                if file_age > max_age_seconds:
                    os.remove(file_path)
                    logger.info(f"古いファイルを削除しました: {filename}")
    except Exception as e:
        logger.error(f"ファイルクリーンアップ中にエラーが発生しました: {e}")

# 定期的なクリーンアップを実行するルート
@app.route('/api/cleanup', methods=['POST'])
def trigger_cleanup():
    try:
        cleanup_old_files(DOWNLOAD_DIR)
        return jsonify({'status': 'success', 'message': 'クリーンアップが完了しました'})
    except Exception as e:
        logger.error(f"クリーンアップAPIエラー: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# 利用規約ページ
@app.route('/terms')
def terms():
    return render_template('terms.html')

# プライバシーポリシーページ
@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

# ヘルスチェックエンドポイント
@app.route('/health')
def health_check():
    return jsonify({'status': 'ok'})

# アプリケーション起動時にクリーンアップを実行
@app.route('/api/init-cleanup', methods=['GET'])
def init_cleanup():
    cleanup_old_files(DOWNLOAD_DIR)
    logger.info("アプリケーション起動時のクリーンアップを実行しました")
    return jsonify({'status': 'success', 'message': 'クリーンアップが完了しました'})

if __name__ == '__main__':
    # アプリケーション起動
    logger.info("Aro YouTube ダウンローダーを起動しています...")
    app.run(host='0.0.0.0', port=5000, debug=True)
