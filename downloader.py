import os
import yt_dlp
from pytube import YouTube
from flask import Flask, request, jsonify, render_template, send_file
import re
import uuid
import json
import subprocess

class YouTubeDownloader:
    def __init__(self, download_path='downloads'):
        self.download_path = download_path
        # ダウンロードディレクトリが存在しない場合は作成
        if not os.path.exists(download_path):
            os.makedirs(download_path)
    
    def get_video_info(self, url):
        """YouTubeの動画情報を取得する"""
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,
                'format': 'best',
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                # 利用可能な解像度を取得
                formats = []
                for f in info.get('formats', []):
                    if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                        height = f.get('height')
                        if height:
                            format_id = f.get('format_id')
                            formats.append({
                                'format_id': format_id,
                                'resolution': f"{height}p",
                                'ext': f.get('ext', 'mp4')
                            })
                
                # 重複を削除し、解像度でソート
                unique_formats = []
                seen_resolutions = set()
                for f in formats:
                    if f['resolution'] not in seen_resolutions:
                        seen_resolutions.add(f['resolution'])
                        unique_formats.append(f)
                
                # 解像度の数値部分で降順ソート
                unique_formats.sort(key=lambda x: int(x['resolution'].replace('p', '')), reverse=True)
                
                return {
                    'title': info.get('title', 'Unknown'),
                    'thumbnail': info.get('thumbnail', ''),
                    'duration': info.get('duration', 0),
                    'formats': unique_formats,
                    'video_id': info.get('id', '')
                }
        except Exception as e:
            print(f"Error getting video info: {e}")
            return None
    
    def download_video(self, url, resolution='best', output_format='mp4'):
        """YouTubeの動画をダウンロードする"""
        try:
            # 一意のファイル名を生成
            file_id = str(uuid.uuid4())[:8]
            output_file = os.path.join(self.download_path, f"{file_id}")
            
            # 解像度に基づいてフォーマットを選択
            format_spec = 'best'
            if resolution != 'best':
                # 特定の解像度を指定
                height = int(resolution.replace('p', ''))
                format_spec = f'bestvideo[height<={height}]+bestaudio/best[height<={height}]'
            
            ydl_opts = {
                'format': format_spec,
                'outtmpl': f'{output_file}.%(ext)s',
                'quiet': False,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                downloaded_file = ydl.prepare_filename(info)
                
                # 拡張子を確認
                _, ext = os.path.splitext(downloaded_file)
                
                # MP4形式に変換が必要な場合
                if ext[1:].lower() != output_format.lower():
                    original_file = downloaded_file
                    downloaded_file = f"{output_file}.{output_format}"
                    
                    # FFmpegを使用して変換
                    try:
                        cmd = [
                            'ffmpeg', '-i', original_file, 
                            '-c:v', 'copy', '-c:a', 'copy', 
                            downloaded_file
                        ]
                        subprocess.run(cmd, check=True)
                        
                        # 元のファイルを削除
                        os.remove(original_file)
                    except subprocess.CalledProcessError as e:
                        print(f"FFmpeg conversion error: {e}")
                        # 変換に失敗した場合は元のファイルを使用
                        downloaded_file = original_file
                
                return {
                    'file_path': downloaded_file,
                    'file_name': os.path.basename(downloaded_file),
                    'title': info.get('title', 'Unknown'),
                }
        except Exception as e:
            print(f"Error downloading video: {e}")
            return None
    
    def download_audio(self, url, output_format='mp3'):
        """YouTubeの音声のみをダウンロードする"""
        try:
            # 一意のファイル名を生成
            file_id = str(uuid.uuid4())[:8]
            output_file = os.path.join(self.download_path, f"{file_id}.{output_format}")
            
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': f'{os.path.join(self.download_path, file_id)}.%(ext)s',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': output_format,
                    'preferredquality': '192',
                }],
                'quiet': False,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                
                return {
                    'file_path': output_file,
                    'file_name': os.path.basename(output_file),
                    'title': info.get('title', 'Unknown'),
                }
        except Exception as e:
            print(f"Error downloading audio: {e}")
            return None
    
    def batch_download(self, urls, resolution='best', output_format='mp4', audio_only=False):
        """複数のURLを一括ダウンロードする"""
        results = []
        for url in urls:
            try:
                if audio_only:
                    result = self.download_audio(url, output_format='mp3')
                else:
                    result = self.download_video(url, resolution, output_format)
                
                if result:
                    results.append(result)
            except Exception as e:
                print(f"Error in batch download for URL {url}: {e}")
                results.append({
                    'url': url,
                    'error': str(e)
                })
        
        return results

# Flaskアプリケーションのインスタンスを作成
app = Flask(__name__)
downloader = YouTubeDownloader()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/video-info', methods=['POST'])
def get_video_info():
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URLが指定されていません'}), 400
    
    info = downloader.get_video_info(url)
    if info:
        return jsonify(info)
    else:
        return jsonify({'error': '動画情報の取得に失敗しました'}), 500

@app.route('/api/download-video', methods=['POST'])
def download_video():
    data = request.get_json()
    url = data.get('url')
    resolution = data.get('resolution', 'best')
    
    if not url:
        return jsonify({'error': 'URLが指定されていません'}), 400
    
    result = downloader.download_video(url, resolution)
    if result:
        return jsonify(result)
    else:
        return jsonify({'error': '動画のダウンロードに失敗しました'}), 500

@app.route('/api/download-audio', methods=['POST'])
def download_audio():
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URLが指定されていません'}), 400
    
    result = downloader.download_audio(url)
    if result:
        return jsonify(result)
    else:
        return jsonify({'error': '音声のダウンロードに失敗しました'}), 500

@app.route('/api/batch-download', methods=['POST'])
def batch_download():
    data = request.get_json()
    urls = data.get('urls', [])
    resolution = data.get('resolution', 'best')
    audio_only = data.get('audio_only', False)
    
    if not urls:
        return jsonify({'error': 'URLが指定されていません'}), 400
    
    results = downloader.batch_download(urls, resolution, audio_only=audio_only)
    return jsonify({'results': results})

@app.route('/downloads/<filename>')
def download_file(filename):
    return send_file(os.path.join(downloader.download_path, filename), as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
