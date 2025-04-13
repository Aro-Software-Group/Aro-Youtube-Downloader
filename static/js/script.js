document.addEventListener('DOMContentLoaded', function() {
    // DOM要素
    const videoUrlInput = document.getElementById('video-url');
    const fetchInfoBtn = document.getElementById('fetch-info');
    const videoInfoSection = document.getElementById('video-info');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const videoDuration = document.getElementById('video-duration');
    const videoResolutionSelect = document.getElementById('video-resolution');
    const downloadVideoBtn = document.getElementById('download-video');
    const downloadAudioBtn = document.getElementById('download-audio');
    const downloadProgress = document.getElementById('download-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressStatus = document.getElementById('progress-status');
    const downloadComplete = document.getElementById('download-complete');
    const downloadFileName = document.getElementById('download-file-name');
    const downloadLink = document.getElementById('download-link');
    const loadingOverlay = document.getElementById('loading-overlay');
    const toggleBatchBtn = document.getElementById('toggle-batch');
    const batchInputContainer = document.getElementById('batch-input-container');
    const batchUrlsTextarea = document.getElementById('batch-urls');
    const batchTypeSelect = document.getElementById('batch-type');
    const batchResolutionGroup = document.getElementById('batch-resolution-group');
    const batchResolutionSelect = document.getElementById('batch-resolution');
    const startBatchDownloadBtn = document.getElementById('start-batch-download');
    const batchProgress = document.getElementById('batch-progress');
    const batchProgressBar = document.getElementById('batch-progress-bar');
    const batchCurrent = document.getElementById('batch-current');
    const batchTotal = document.getElementById('batch-total');
    const batchResults = document.getElementById('batch-results');
    const batchResultsList = document.getElementById('batch-results-list');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // 現在の動画情報
    let currentVideoInfo = null;

    // タブ切り替え
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // アクティブなタブを削除
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // クリックされたタブをアクティブに
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // 一括ダウンロードモード切り替え
    toggleBatchBtn.addEventListener('click', function() {
        batchInputContainer.classList.toggle('hidden');
        if (!batchInputContainer.classList.contains('hidden')) {
            videoInfoSection.classList.add('hidden');
            toggleBatchBtn.innerHTML = '<i class="fas fa-user"></i> 通常モードに戻る';
        } else {
            toggleBatchBtn.innerHTML = '<i class="fas fa-list"></i> 一括ダウンロードモード';
        }
    });

    // ダウンロードタイプによる解像度選択の表示/非表示
    batchTypeSelect.addEventListener('change', function() {
        if (this.value === 'audio') {
            batchResolutionGroup.classList.add('hidden');
        } else {
            batchResolutionGroup.classList.remove('hidden');
        }
    });

    // 動画情報取得
    fetchInfoBtn.addEventListener('click', function() {
        const url = videoUrlInput.value.trim();
        if (!url) {
            alert('YouTubeのURLを入力してください');
            return;
        }
        
        // 一括モードを非表示
        batchInputContainer.classList.add('hidden');
        toggleBatchBtn.innerHTML = '<i class="fas fa-list"></i> 一括ダウンロードモード';
        
        // ローディング表示
        loadingOverlay.classList.remove('hidden');
        
        // 動画情報をリセット
        resetVideoInfo();
        
        // APIリクエスト
        fetch('/api/video-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('動画情報の取得に失敗しました');
            }
            return response.json();
        })
        .then(data => {
            // 動画情報を表示
            displayVideoInfo(data);
        })
        .catch(error => {
            alert(error.message);
            console.error('Error:', error);
        })
        .finally(() => {
            loadingOverlay.classList.add('hidden');
        });
    });

    // 動画情報表示
    function displayVideoInfo(info) {
        currentVideoInfo = info;
        
        // サムネイル
        videoThumbnail.src = info.thumbnail;
        
        // タイトル
        videoTitle.textContent = info.title;
        
        // 動画時間
        const minutes = Math.floor(info.duration / 60);
        const seconds = info.duration % 60;
        videoDuration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // 解像度オプション
        videoResolutionSelect.innerHTML = '';
        info.formats.forEach(format => {
            const option = document.createElement('option');
            option.value = format.resolution;
            option.textContent = format.resolution;
            videoResolutionSelect.appendChild(option);
        });
        
        // 最高解像度を追加（存在しない場合）
        if (info.formats.length === 0 || info.formats[0].resolution !== 'best') {
            const bestOption = document.createElement('option');
            bestOption.value = 'best';
            bestOption.textContent = '最高品質';
            videoResolutionSelect.insertBefore(bestOption, videoResolutionSelect.firstChild);
        }
        
        // 情報セクションを表示
        videoInfoSection.classList.remove('hidden');
        
        // ダウンロード関連の表示をリセット
        downloadProgress.classList.add('hidden');
        downloadComplete.classList.add('hidden');
    }

    // 動画情報リセット
    function resetVideoInfo() {
        currentVideoInfo = null;
        videoThumbnail.src = '';
        videoTitle.textContent = '';
        videoDuration.textContent = '';
        videoResolutionSelect.innerHTML = '';
        videoInfoSection.classList.add('hidden');
    }

    // 動画ダウンロード
    downloadVideoBtn.addEventListener('click', function() {
        if (!currentVideoInfo) return;
        
        const resolution = videoResolutionSelect.value;
        downloadMedia(currentVideoInfo.video_id, resolution, 'video');
    });

    // 音声ダウンロード
    downloadAudioBtn.addEventListener('click', function() {
        if (!currentVideoInfo) return;
        
        downloadMedia(currentVideoInfo.video_id, null, 'audio');
    });

    // メディアダウンロード共通処理
    function downloadMedia(videoId, resolution, type) {
        // ダウンロード進行状況表示
        downloadProgress.classList.remove('hidden');
        downloadComplete.classList.add('hidden');
        progressBar.style.width = '0%';
        progressStatus.textContent = 'ダウンロードを準備中...';
        
        // APIエンドポイント
        const endpoint = type === 'audio' ? '/api/download-audio' : '/api/download-video';
        
        // リクエストデータ
        const requestData = {
            url: `https://www.youtube.com/watch?v=${videoId}`
        };
        
        // 解像度指定（動画の場合）
        if (type === 'video' && resolution) {
            requestData.resolution = resolution;
        }
        
        // ローディング表示
        loadingOverlay.classList.remove('hidden');
        
        // APIリクエスト
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('ダウンロードに失敗しました');
            }
            return response.json();
        })
        .then(data => {
            // ダウンロード完了表示
            progressBar.style.width = '100%';
            progressStatus.textContent = 'ダウンロード完了！';
            
            // ダウンロードリンク設定
            downloadFileName.textContent = data.title;
            downloadLink.href = `/downloads/${data.file_name}`;
            downloadLink.download = data.file_name;
            
            // 完了セクション表示
            downloadComplete.classList.remove('hidden');
        })
        .catch(error => {
            alert(error.message);
            console.error('Error:', error);
            progressStatus.textContent = 'エラーが発生しました: ' + error.message;
        })
        .finally(() => {
            loadingOverlay.classList.add('hidden');
        });
        
        // 進行状況のシミュレーション
        simulateProgress();
    }

    // 進行状況のシミュレーション
    function simulateProgress() {
        let width = 0;
        const interval = setInterval(() => {
            if (width >= 90) {
                clearInterval(interval);
            } else {
                width += Math.random() * 5;
                progressBar.style.width = width + '%';
                
                if (width < 30) {
                    progressStatus.textContent = '動画情報を取得中...';
                } else if (width < 60) {
                    progressStatus.textContent = 'ダウンロード中...';
                } else {
                    progressStatus.textContent = '変換処理中...';
                }
            }
        }, 500);
    }

    // 一括ダウンロード開始
    startBatchDownloadBtn.addEventListener('click', function() {
        const urls = batchUrlsTextarea.value.trim().split('\n').filter(url => url.trim() !== '');
        
        if (urls.length === 0) {
            alert('YouTubeのURLを入力してください');
            return;
        }
        
        // ダウンロードタイプと解像度
        const type = batchTypeSelect.value;
        const resolution = type === 'video' ? batchResolutionSelect.value : null;
        const audioOnly = type === 'audio';
        
        // 進行状況表示
        batchCurrent.textContent = '0';
        batchTotal.textContent = urls.length;
        batchProgressBar.style.width = '0%';
        batchProgress.classList.remove('hidden');
        batchResults.classList.add('hidden');
        batchResultsList.innerHTML = '';
        
        // ローディング表示
        loadingOverlay.classList.remove('hidden');
        
        // APIリクエスト
        fetch('/api/batch-download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                urls: urls,
                resolution: resolution,
                audio_only: audioOnly
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('一括ダウンロードに失敗しました');
            }
            return response.json();
        })
        .then(data => {
            // 結果表示
            displayBatchResults(data.results);
        })
        .catch(error => {
            alert(error.message);
            console.error('Error:', error);
        })
        .finally(() => {
            loadingOverlay.classList.add('hidden');
            batchProgressBar.style.width = '100%';
        });
        
        // 進行状況のシミュレーション
        simulateBatchProgress(urls.length);
    });

    // 一括ダウンロード進行状況のシミュレーション
    function simulateBatchProgress(total) {
        let current = 0;
        const interval = setInterval(() => {
            if (current >= total) {
                clearInterval(interval);
            } else {
                current++;
                batchCurrent.textContent = current;
                const percentage = (current / total) * 100;
                batchProgressBar.style.width = percentage + '%';
            }
        }, 1500);
    }

    // 一括ダウンロード結果表示
    function displayBatchResults(results) {
        batchResultsList.innerHTML = '';
        
        results.forEach(result => {
            const li = document.createElement('li');
            
            if (result.error) {
                li.innerHTML = `<span class="error">${result.url || 'URL不明'}: ${result.error}</span>`;
            } else {
                li.innerHTML = `
                    <span class="success">${result.title}</span>
                    <a href="/downloads/${result.file_name}" download class="btn secondary-btn">
                        <i class="fas fa-download"></i> ダウンロード
                    </a>
                `;
            }
            
            batchResultsList.appendChild(li);
        });
        
        batchResults.classList.remove('hidden');
    }

    // Enter キーでの検索
    videoUrlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            fetchInfoBtn.click();
        }
    });
});
