// Web Speech APIのサポートチェック
if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('このブラウザは音声認識をサポートしていません。Chrome、EdgeなどのChromiumベースのブラウザをご使用ください。');
}

// 音声認識の設定
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'ja-JP';
recognition.continuous = true;
recognition.interimResults = true;

// DOM要素の取得
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const transcriptionArea = document.getElementById('transcriptionArea');
const statusText = document.getElementById('statusText');
const recognizingIndicator = document.getElementById('recognizingIndicator');
const voiceSelect = document.getElementById('voiceSelect');
const rateRange = document.getElementById('rateRange');
const pitchRange = document.getElementById('pitchRange');
const volumeRange = document.getElementById('volumeRange');
const rateValue = document.getElementById('rateValue');
const pitchValue = document.getElementById('pitchValue');
const volumeValue = document.getElementById('volumeValue');
const testBtn = document.getElementById('testBtn');

// 音声合成の準備
let synthesis = window.speechSynthesis;
let voices = [];
let currentUtterance = null;

// 音声認識の状態
let isListening = false;
let finalTranscript = '';
let lastSpokenText = ''; // 最後に読み上げたテキストを記録
let isManualStop = false; // 手動停止フラグ

// 音声リストの読み込み
function loadVoices() {
    voices = synthesis.getVoices();
    
    // 日本語音声を優先して表示
    const japaneseVoices = voices.filter(voice => voice.lang.startsWith('ja'));
    const otherVoices = voices.filter(voice => !voice.lang.startsWith('ja'));
    const sortedVoices = [...japaneseVoices, ...otherVoices];
    
    voiceSelect.innerHTML = '';
    sortedVoices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(option);
    });
    
    // デフォルトでichiro音声を選択（見つからない場合は最初の日本語音声）
    const ichiroVoiceIndex = sortedVoices.findIndex(voice => 
        voice.name.toLowerCase().includes('ichiro')
    );
    if (ichiroVoiceIndex !== -1) {
        voiceSelect.value = ichiroVoiceIndex.toString();
    } else if (japaneseVoices.length > 0) {
        voiceSelect.value = '0';
    }
}

// 音声リストが読み込まれたら実行
if (synthesis.onvoiceschanged !== undefined) {
    synthesis.onvoiceschanged = loadVoices;
}
loadVoices();

// スライダーの値表示更新
rateRange.addEventListener('input', (e) => {
    rateValue.textContent = parseFloat(e.target.value).toFixed(1);
});

pitchRange.addEventListener('input', (e) => {
    pitchValue.textContent = parseFloat(e.target.value).toFixed(1);
});

volumeRange.addEventListener('input', (e) => {
    volumeValue.textContent = parseFloat(e.target.value).toFixed(1);
});

// 音声認識のイベントハンドラ
recognition.onstart = () => {
    isListening = true;
    // 音声認識エンジンの初期化を待つため、少し遅延してから準備完了を通知
    setTimeout(() => {
        statusText.textContent = '音声認識準備完了。話してください。';
        recognizingIndicator.classList.add('active');
    }, 500); // 500ms待機してから準備完了を通知
    startBtn.disabled = true;
    stopBtn.disabled = false;
};

// 自動読み上げ関数
function speakText(text) {
    if (!text || text.trim() === '' || text === lastSpokenText) {
        return;
    }
    
    // 既存の読み上げを停止
    if (currentUtterance) {
        synthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 音声設定
    const selectedVoiceIndex = parseInt(voiceSelect.value);
    if (voices[selectedVoiceIndex]) {
        utterance.voice = voices[selectedVoiceIndex];
    }
    utterance.rate = parseFloat(rateRange.value);
    utterance.pitch = parseFloat(pitchRange.value);
    utterance.volume = parseFloat(volumeRange.value);
    utterance.lang = 'ja-JP';
    
    utterance.onstart = () => {
        statusText.textContent = '読み上げ中...';
    };
    
    utterance.onend = () => {
        statusText.textContent = '音声認識中...';
        currentUtterance = null;
        lastSpokenText = text; // 読み上げたテキストを記録
    };
    
    utterance.onerror = (event) => {
        console.error('読み上げエラー:', event.error);
        statusText.textContent = `読み上げエラー: ${event.error}`;
        currentUtterance = null;
    };
    
    currentUtterance = utterance;
    synthesis.speak(utterance);
}

recognition.onresult = (event) => {
    // 最初の結果が来たら、準備完了メッセージを通常の状態に戻す
    if (statusText.textContent.includes('準備完了')) {
        statusText.textContent = '音声認識中...';
    }
    
    let interimTranscript = '';
    let newFinalText = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            newFinalText += transcript + ' ';
        } else {
            interimTranscript += transcript;
        }
    }
    
    // テキストエリアを更新
    if (transcriptionArea.querySelector('.placeholder')) {
        transcriptionArea.innerHTML = '';
    }
    
    transcriptionArea.textContent = finalTranscript + interimTranscript;
    
    // 自動スクロール
    transcriptionArea.scrollTop = transcriptionArea.scrollHeight;
    
    // 新しい確定テキストがある場合、自動的に読み上げ
    if (newFinalText.trim()) {
        const textToSpeak = newFinalText.trim();
        speakText(textToSpeak);
    }
};

recognition.onerror = (event) => {
    // no-speechエラーは無視（単に喋っていないだけなので正常）
    if (event.error === 'no-speech') {
        return;
    }
    
    // その他のエラーのみ処理
    console.error('音声認識エラー:', event.error);
    
    // ネットワークエラーや一時的なエラーの場合は自動再開を試みる
    if (event.error === 'network' || event.error === 'aborted') {
        if (!isManualStop) {
            console.log('ネットワークエラーが発生しました。自動的に再開します...');
            setTimeout(() => {
                if (!isManualStop) {
                    try {
                        recognition.start();
                    } catch (error) {
                        console.error('自動再開エラー:', error);
                    }
                }
            }, 1000);
            return;
        }
    }
    
    // 重大なエラーの場合
    statusText.textContent = `エラー: ${event.error}`;
    recognizingIndicator.classList.remove('active');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    isListening = false;
};

recognition.onend = () => {
    isListening = false;
    
    // 手動停止でない場合、自動的に再開
    if (!isManualStop) {
        console.log('音声認識が自動停止しました。自動的に再開します...');
        statusText.textContent = '自動再開中...';
        
        // 少し待ってから再開（stop()の処理が完全に完了するのを待つ）
        setTimeout(() => {
            if (!isManualStop) {
                try {
                    recognition.start();
                } catch (error) {
                    console.error('自動再開エラー:', error);
                    // エラーが発生した場合、少し待ってから再試行
                    setTimeout(() => {
                        if (!isManualStop && !isListening) {
                            try {
                                recognition.start();
                            } catch (retryError) {
                                console.error('再試行も失敗:', retryError);
                                statusText.textContent = '音声認識が停止しました';
                                recognizingIndicator.classList.remove('active');
                                startBtn.disabled = false;
                                stopBtn.disabled = true;
                            }
                        }
                    }, 500);
                }
            }
        }, 200);
    } else {
        // 手動停止の場合
        statusText.textContent = '音声認識が停止しました';
        recognizingIndicator.classList.remove('active');
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
};

// ボタンのイベントリスナー
startBtn.addEventListener('click', () => {
    finalTranscript = '';
    lastSpokenText = '';
    isManualStop = false; // 手動停止フラグをリセット
    statusText.textContent = '音声認識を開始しています...';
    recognizingIndicator.classList.remove('active');
    if (currentUtterance) {
        synthesis.cancel();
        currentUtterance = null;
    }
    recognition.start();
});

stopBtn.addEventListener('click', () => {
    isManualStop = true; // 手動停止フラグを設定
    recognition.stop();
    statusText.textContent = '停止中...';
});

clearBtn.addEventListener('click', () => {
    finalTranscript = '';
    lastSpokenText = '';
    if (currentUtterance) {
        synthesis.cancel();
        currentUtterance = null;
    }
    transcriptionArea.innerHTML = '<p class="placeholder">ここに認識されたテキストが表示されます...</p>';
    statusText.textContent = '準備完了';
});

// Zキーで録音開始/停止を切り替える
document.addEventListener('keydown', (event) => {
    // Zキーが押された場合（入力フィールドにフォーカスがある場合は無視）
    if (event.key === 'z' || event.key === 'Z') {
        // 入力フィールド（テキストエリア、セレクトボックス、スライダーなど）にフォーカスがある場合は無視
        const activeElement = document.activeElement;
        const isInputFocused = activeElement.tagName === 'INPUT' || 
                               activeElement.tagName === 'TEXTAREA' || 
                               activeElement.tagName === 'SELECT' ||
                               activeElement.isContentEditable;
        
        if (!isInputFocused) {
            event.preventDefault(); // デフォルトの動作を防ぐ
            
            if (isListening) {
                // 録音中なら停止
                isManualStop = true;
                recognition.stop();
                statusText.textContent = '停止中...';
            } else {
                // 停止中なら開始
                finalTranscript = '';
                lastSpokenText = '';
                isManualStop = false;
                statusText.textContent = '音声認識を開始しています...';
                recognizingIndicator.classList.remove('active');
                if (currentUtterance) {
                    synthesis.cancel();
                    currentUtterance = null;
                }
                recognition.start();
            }
        }
    }

// テストボタンのイベントリスナー
testBtn.addEventListener('click', () => {
    // 既存の読み上げを停止
    if (currentUtterance) {
        synthesis.cancel();
        currentUtterance = null;
    }
    
    const testText = '音声テスト中';
    const utterance = new SpeechSynthesisUtterance(testText);
    
    // 音声設定
    const selectedVoiceIndex = parseInt(voiceSelect.value);
    if (voices[selectedVoiceIndex]) {
        utterance.voice = voices[selectedVoiceIndex];
    }
    utterance.rate = parseFloat(rateRange.value);
    utterance.pitch = parseFloat(pitchRange.value);
    utterance.volume = parseFloat(volumeRange.value);
    utterance.lang = 'ja-JP';
    
    utterance.onstart = () => {
        statusText.textContent = '音声テスト中...';
    };
    
    utterance.onend = () => {
        statusText.textContent = '音声テスト完了';
        currentUtterance = null;
    };
    
    utterance.onerror = (event) => {
        console.error('読み上げエラー:', event.error);
        statusText.textContent = `読み上げエラー: ${event.error}`;
        currentUtterance = null;
    };
    
    currentUtterance = utterance;
    synthesis.speak(utterance);
});

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    if (isListening) {
        recognition.stop();
    }
    if (currentUtterance) {
        synthesis.cancel();
    }
});
});
