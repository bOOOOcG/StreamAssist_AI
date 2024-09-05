// ==UserScript==
// @name         Bilibili live Auto Chat AI
// @namespace    http://enou.org/
// @version      0.6
// @description  An AI script for automatically sending chat messages and interacting with the streamer on Bilibili live streams.
// @author       bOc
// @match        https://live.bilibili.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let audioContext;
    let destination;
    let mediaRecorder1;
    let mediaRecorder2;
    let isRecording1 = false;
    let isRecording2 = false;
    let isSending = false;
    let chunks1 = [];
    let chunks2 = [];
    let mediaElementSource;
    let gainNode;
    let isMainSwitchOn = false;
    let isChatPermissionGranted = false;
    let isMuted = false;
    let danmuQueue = [];
    let recordingStartTimestamp = 0;
    let recordingEndTimestamp = 0;
    let volumeSlider; // 声明 volumeSlider 变量

    let accumulatedChunks = []; // 用于存储累积的音频数据
    let isAccumulating = false;

    const roomId = window.location.pathname.match(/\/(\d+)/)[1];

    // 创建样式
    const style = document.createElement('style');
    style.textContent = `
        .auto-chat-ai-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 240px;
            background-color: rgba(245, 245, 245, 0.9);
            backdrop-filter: blur(6px);
            border-radius: 12px;
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            font-family: Arial, sans-serif;
            z-index: 10000;
        }
        .panel-header {
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: rgba(255, 255, 255, 0.95);
        }
        .panel-title {
            font-size: 16px;
            font-weight: 600;
            color: #222;
        }
        .panel-menu {
            cursor: pointer;
            font-size: 18px;
            color: #444;
        }
        .panel-content {
            padding: 16px;
        }
        .control-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 18px;
        }
        .control-label {
            font-size: 14px;
            color: #444;
        }
        .switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
        }
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: background-color 0.3s, transform 0.2s ease-in-out;
            border-radius: 20px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: transform 0.2s ease-in-out;
            border-radius: 50%;
        }
        input:checked + .slider {
            background-color: #4285f4;
        }
        input:checked + .slider:before {
            transform: translateX(20px);
        }
        .volume-slider {
            width: 100%;
            margin-top: 8px;
            -webkit-appearance: none;
            height: 4px;
            background: #bbb;
            outline: none;
            opacity: 0.9;
            transition: opacity .2s;
        }
        .volume-slider:hover {
            opacity: 1;
        }
        .volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            background: #4285f4;
            cursor: pointer;
            border-radius: 50%;
        }
        .record-button {
            width: 100%;
            padding: 12px 16px;
            background-color: #4285f4;
            color: white;
            border: none;
            border-radius: 24px;
            cursor: pointer;
            transition: background-color 0.2s;
            font-size: 14px;
            font-weight: 500;
            margin-top: 10px;
        }
        .record-button:hover {
            background-color: #3367d6;
        }
        .record-button:disabled {
            background-color: #9ca3af;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);

    // 创建面板
    const panel = document.createElement('div');
    panel.className = 'auto-chat-ai-panel';
    panel.innerHTML = `
        <div class="panel-header">
            <span class="panel-title">Auto Chat AI</span>
            <span class="panel-menu">⋮</span>
        </div>
        <div class="panel-content">
            <div class="control-item">
                <span class="control-label">Main Switch</span>
                <label class="switch">
                    <input type="checkbox" id="main-switch">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="control-item">
                <span class="control-label">Chat Permission</span>
                <label class="switch">
                    <input type="checkbox" id="chat-permission">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="control-item">
                <span class="control-label">Mute Audio</span>
                <label class="switch">
                    <input type="checkbox" id="mute-audio">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="control-item">
                <span class="control-label">Volume</span>
            </div>
            <input type="range" id="volume-slider" class="volume-slider" min="0" max="100" value="50">
            <button id="record-button" class="record-button" disabled>Start Recording</button>
        </div>
    `;
    document.body.appendChild(panel);

    // 获取元素
    const mainSwitch = document.getElementById('main-switch');
    const chatPermission = document.getElementById('chat-permission');
    const muteAudio = document.getElementById('mute-audio');
    volumeSlider = document.getElementById('volume-slider'); // 初始化 volumeSlider
    const recordButton = document.getElementById('record-button');

    // 状态变量
    let isRecording = false;

    // 事件监听器
    mainSwitch.addEventListener('change', function() {
        isMainSwitchOn = mainSwitch.checked;
        recordButton.disabled = !isMainSwitchOn;  // 主开关控制录音按钮的可用性
    });

    recordButton.addEventListener('click', function() {
        if (isRecording) {
            stopRecording();
            this.textContent = 'Start Recording';
            this.style.backgroundColor = '#4285f4';
        } else {
            startRecording();
            this.textContent = 'Stop Recording';
            this.style.backgroundColor = '#ea4335';
        }
        isRecording = !isRecording;
    });
    
    chatPermission.addEventListener('change', function() {
        isChatPermissionGranted = chatPermission.checked;
    });

    muteAudio.addEventListener('change', function() {
        isMuted = muteAudio.checked;
        if (gainNode) {
            gainNode.gain.value = isMuted ? 0 : volumeSlider.value / 100;
        }
    });

    volumeSlider.addEventListener('input', function() {
        if (gainNode) {
            gainNode.gain.value = isMuted ? 0 : volumeSlider.value / 100;
        }
    });

    // 拖动功能
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    panel.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === panel.querySelector('.panel-header')) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, panel);
        }
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;

        isDragging = false;
    }

    function startRecording() {
        if (isRecording1 || isRecording2) return;

        const videoElement = document.querySelector('video') || document.querySelector('bwp-video');
        if (!isMainSwitchOn || isSending || !videoElement || videoElement.readyState < 3) return; // 确保视频已经准备好

        console.log('Starting recording...');
        recordingStartTimestamp = Date.now();  // 记录开始录音的时间戳

        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (!destination) {
            destination = audioContext.createMediaStreamDestination();
        }

        if (!mediaElementSource) {
            mediaElementSource = audioContext.createMediaElementSource(videoElement);
            gainNode = audioContext.createGain();
            mediaElementSource.connect(gainNode);
            gainNode.connect(audioContext.destination);
            mediaElementSource.connect(destination);
        } else {
            console.log('Reusing existing MediaElementSource');
        }

        gainNode.gain.value = isMuted ? 0 : volumeSlider.value / 100;

        mediaRecorder1 = new MediaRecorder(destination.stream, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorder2 = new MediaRecorder(destination.stream, { mimeType: 'audio/webm;codecs=opus' });

        setupMediaRecorder(mediaRecorder1, chunks1, 'recorder 1', mediaRecorder2);
        setupMediaRecorder(mediaRecorder2, chunks2, 'recorder 2', mediaRecorder1);

        startMediaRecorder(mediaRecorder1);
    }

    function setupMediaRecorder(recorder, chunks, label, nextRecorder) {
        recorder.ondataavailable = function (event) {
            if (event.data.size > 0) {
                console.log(`Audio data available from ${label}:`, event.data);
                chunks.push(event.data);
            }
        };

        recorder.onstart = function () {
            console.log(`${label} started`);
            recordingStartTimestamp = Date.now();  // 重置开始时间轴
        };

        recorder.onstop = function () {
            console.log(`${label} stopped`);
            recordingEndTimestamp = Date.now();  // 重置结束时间轴
            if (chunks.length > 0) {
                const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
                sendAudioAndDanmus(blob);  // 发送音频和弹幕
                chunks.length = 0;
            }
            startMediaRecorder(nextRecorder);
        };

        recorder.onerror = function (event) {
            console.error(`${label} error:`, event.error);
        };
    }

    function startMediaRecorder(recorder) {
        if (isRecording1 && recorder === mediaRecorder1 || isRecording2 && recorder === mediaRecorder2) return;
        if (recorder === mediaRecorder1) {
            isRecording1 = true;
        } else {
            isRecording2 = true;
        }
        recorder.start(1000);
        setTimeout(() => {
            recorder.stop();
            if (recorder === mediaRecorder1) {
                isRecording1 = false;
            } else {
                isRecording2 = false;
            }
        }, 30000);
    }

    function stopRecording() {
        if (mediaRecorder1 && mediaRecorder1.state !== 'inactive') {
            mediaRecorder1.stop();
        }
        if (mediaRecorder2 && mediaRecorder2.state !== 'inactive') {
            mediaRecorder2.stop();
        }
    }

    // Function to capture a screenshot
    async function captureScreenshot() {
        const videoElement = document.querySelector('video') || document.querySelector('bwp-video');
        if (!videoElement) {
            console.error('No video element found for screenshot.');
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 1280; // Set the desired width
        canvas.height = 720; // Set the desired height
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 1.0); // '1.0' for maximum quality JPEG
        });
    }

    function sendAudioAndDanmus(audioBlob) {
        if (isSending) {
            console.log('Previous audio is still being sent. Accumulating this audio...');
            if (isAccumulating) {
                accumulatedChunks.push(audioBlob);
            } else {
                accumulatedChunks = [audioBlob];
                isAccumulating = true;
            }
            return;
        }

        // 如果有累积的音频块，将它们与当前音频块合并
        if (accumulatedChunks.length > 0) {
            accumulatedChunks.push(audioBlob);
            audioBlob = new Blob(accumulatedChunks, { type: 'audio/webm;codecs=opus' });
            accumulatedChunks = [];
            isAccumulating = false;
        }

        isSending = true;
        console.log('Preparing to send audio and danmus...');

        const reader = new FileReader();
        reader.onload = async function () {
            const arrayBuffer = reader.result;
            const header = new Uint8Array(arrayBuffer.slice(0, 4));
            const isValidWebM = header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3;

            if (!isValidWebM) {
                console.error('Invalid WebM file header');
                isSending = false;
                return;
            }

            const newDanmus = [];
            const danmus = document.querySelectorAll('.chat-item.danmaku-item');
            console.log(`Found ${danmus.length} danmu items`);

            const recordingStartTimestampInSeconds = Math.floor(recordingStartTimestamp / 1000);
            const recordingEndTimestampInSeconds = Math.floor(recordingEndTimestamp / 1000);

            danmus.forEach(danmu => {
                const uid = danmu.getAttribute('data-uid');
                const timestamp = parseInt(danmu.getAttribute('data-timestamp'));

                console.log(`Danmu UID: ${uid}, Timestamp: ${timestamp}, Recording Start: ${recordingStartTimestampInSeconds}, Recording End: ${recordingEndTimestampInSeconds}`);

                if (timestamp >= recordingStartTimestampInSeconds && timestamp <= recordingEndTimestampInSeconds) {
                    const danmuData = {
                        uname: danmu.getAttribute('data-uname'),
                        content: danmu.querySelector('.danmaku-item-right').innerText,
                        uid: uid,
                        timestamp: timestamp
                    };
                    console.log('New Danmu:', danmuData);
                    newDanmus.push(danmuData);
                }
            });

            console.log('Danmus to be sent:', newDanmus);

            const screenshotBlob = await captureScreenshot(); // Capture screenshot
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-"); // Generate timestamp string
            const screenshotFilename = `${roomId}_${timestamp}.jpg`; // Filename format: roomId_timestamp.jpg

            const formData = new FormData();
            formData.append('audio', new Blob([arrayBuffer], { type: 'audio/webm' }));
            formData.append('danmus', JSON.stringify(newDanmus));
            formData.append('roomId', roomId);
            if (screenshotBlob) {
                formData.append('screenshot', screenshotBlob, screenshotFilename); // Add screenshot to form data with custom filename
            }

            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://xxx:8181/upload', true);
            xhr.onload = function () {
                isSending = false;
                if (xhr.status === 200) {
                    let response;
                    try {
                        response = JSON.parse(xhr.responseText);
                    } catch (e) {
                        console.error('Failed to parse response JSON:', e);
                        return;
                    }

                    if (response && response.status === 'success') {
                        console.log('Audio and danmus sent successfully');
                        console.log('Recognized text:', response.recognized_text);
                        console.log('GPT-4o mini response:', response.gpt4o_response);

                        let msgContents = response.msg_contents;

                        if (msgContents && msgContents.length > 0) {
                            console.log('Will be sent:', msgContents);
                            if (isChatPermissionGranted) {
                                msgContents.forEach(msgContent => {
                                    danmuQueue.push(...splitMessage(msgContent));
                                });
                                processDanmuQueue();
                            }
                        } else {
                            console.log('No message content to be sent');
                        }
                    } else {
                        console.error('Error in response:', response.message);
                    }
                } else {
                    console.error('Failed to send audio and danmus', xhr.status, xhr.statusText);
                }
            };
            xhr.onerror = function () {
                isSending = false;
                console.error('Error sending audio and danmus');
            };
            xhr.send(formData);
            console.log('Audio and danmus sent:', arrayBuffer);
        };
        reader.onerror = function () {
            isSending = false;
            console.error('Error reading audio blob');
        };
        reader.readAsArrayBuffer(audioBlob);
    }

    function sendChat(message) {
        return new Promise((resolve, reject) => {
            console.log('Will be sent:', message);

            if (!isChatPermissionGranted) {
                resolve();
                return;
            }

            console.log('Processed Chat:', message);

            const text = document.getElementsByClassName('chat-input')[1];
            const evt = document.createEvent('HTMLEvents');
            evt.initEvent('input', true, true);
            text.value = text._value = message;
            text.dispatchEvent(evt);
            document.querySelector('.live-skin-highlight-button-bg').click();
            console.log('Sent Chat:', message);

            resolve();
        });
    }

    function processDanmuQueue() {
        if (danmuQueue.length > 0) {
            if (!isChatPermissionGranted) {
                danmuQueue.forEach(msg => console.log('Will be sent:', msg));
                danmuQueue = [];
                return;
            }

            const message = danmuQueue.shift();
            sendChat(message).then(() => {
                setTimeout(processDanmuQueue, getRandomInt(3000, 6000));
            }).catch(err => {
                console.error('Failed to send chat message:', err);
                setTimeout(processDanmuQueue, getRandomInt(3000, 6000));
            });
        }
    }

    function splitMessage(message) {
        const maxLength = 20;
        const parts = [];
        for (let i = 0; i < message.length; i += maxLength) {
            parts.push(message.slice(i, i + maxLength));
        }
        return parts;
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function observeVideoElement() {
        const targetNode = document.body;
        const config = { childList: true, subtree: true };

        const callback = function (mutationsList, observer) {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    const videoElement = document.querySelector('video') || document.querySelector('bwp-video');
                    if (videoElement && !isRecording1 && !isRecording2) {
                        console.log('Video element found!');
                        startRecording();
                        observer.disconnect(); // 找到视频元素后断开观察
                        return;
                    }
                }
            }
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
        console.log('Observing for video elements...');
    }

    createControlPanel();
    observeVideoElement();

})();