class SignLanguageAIDemo {
    constructor() {
        this.ws = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.connectWebSocket();
    }

    initializeElements() {
        this.micButton = document.getElementById('micButton');
        this.transcriptionDiv = document.getElementById('transcription');
        this.signResponseDiv = document.getElementById('signResponse');
        this.statusText = document.querySelector('.status-text');
        this.statusDot = document.querySelector('.status-dot');
        this.connectionStatus = document.getElementById('connectionStatus');
    }

    setupEventListeners() {
        this.micButton.addEventListener('click', () => this.toggleRecording());
    }

    async connectWebSocket() {
        try {
            // Connect to WebSocket
            this.ws = new WebSocket('ws://localhost:8000/ws');
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.updateConnectionStatus(true);
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.updateConnectionStatus(false);
                // Try to reconnect after 3 seconds
                setTimeout(() => this.connectWebSocket(), 3000);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus(false);
            };
            
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.updateConnectionStatus(false);
        }
    }

    updateConnectionStatus(connected) {
        if (connected) {
            this.connectionStatus.textContent = '🟢 Connected';
            this.connectionStatus.parentElement.classList.add('connected');
        } else {
            this.connectionStatus.textContent = '🔴 Disconnected';
            this.connectionStatus.parentElement.classList.remove('connected');
        }
    }

    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false 
            });
            
            console.log('🎤 Microphone access granted');
            
            // Setup MediaRecorder
            // Try to get WAV format first, fallback to WebM
            let mimeType = 'audio/webm';
            const supportedTypes = [
                'audio/wav',
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg'
            ];
            
            for (const type of supportedTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    console.log(`🎯 Using format: ${mimeType}`);
                    break;
                }
            }
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType
            });
            
            console.log('🔴 MediaRecorder created:', this.mediaRecorder);
            
            // Clear previous chunks
            this.audioChunks = [];
            
            // Handle data available event
            this.mediaRecorder.ondataavailable = (event) => {
                console.log('📊 Audio chunk available:', event.data.size, 'bytes');
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            // Handle recording stop event
            this.mediaRecorder.onstop = () => {
                console.log('⏹️ Recording stopped');
                this.processAudio();
            };
            
            // Start recording
            this.mediaRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;
            
            console.log('🔴 Recording started');
            
            // Update UI
            this.updateRecordingUI(true);
            
        } catch (error) {
            console.error('❌ Error starting recording:', error);
            this.showError('Failed to access microphone');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            this.updateRecordingUI(false);
        }
    }

    updateRecordingUI(recording) {
        if (recording) {
            this.micButton.classList.add('recording');
            this.micButton.querySelector('.mic-text').textContent = 'Stop Recording';
            this.statusText.textContent = 'Recording...';
            this.statusDot.classList.add('processing');
        } else {
            this.micButton.classList.remove('recording');
            this.micButton.querySelector('.mic-text').textContent = 'Start Recording';
            this.statusText.textContent = 'Processing...';
            this.statusDot.classList.add('processing');
        }
    }

    async processAudio() {
        try {
            // Combine audio chunks
            const audioBlob = new Blob(this.audioChunks, { 
                type: this.mediaRecorder.mimeType
            });
            
            console.log('🎵 Audio blob created:', audioBlob);
            console.log('🎵 Audio size:', audioBlob.size, 'bytes');
            console.log('🎵 Audio chunks count:', this.audioChunks.length);
            console.log('🎵 Original format:', this.mediaRecorder.mimeType);
            
            // Convert to WAV if needed
            let finalBlob = audioBlob;
            if (this.mediaRecorder.mimeType.includes('webm') || this.mediaRecorder.mimeType.includes('ogg')) {
                console.log('🔄 Converting to WAV format...');
                finalBlob = await this.convertToWav(audioBlob);
                console.log('✅ Converted to WAV:', finalBlob.size, 'bytes');
            }
            
            // Convert to base64
            const base64Audio = await this.blobToBase64(finalBlob);
            console.log('📦 Base64 audio length:', base64Audio.length);
            
            // Send to WebSocket
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                console.log('📤 Sending audio to WebSocket...');
                this.ws.send(JSON.stringify({
                    type: 'audio_data',
                    audio_data: base64Audio,
                    language: 'en'
                }));
                console.log('✅ Audio sent successfully');
            } else {
                console.error('❌ WebSocket not connected');
                this.showError('WebSocket not connected');
            }
            
        } catch (error) {
            console.error('❌ Error processing audio:', error);
            this.showError('Failed to process audio');
        }
    }

    async convertToWav(webmBlob) {
        try {
            // Create audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await webmBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Convert to WAV
            const wav = this.audioBufferToWav(audioBuffer);
            return new Blob([wav], { type: 'audio/wav' });
        } catch (error) {
            console.error('❌ WAV conversion failed:', error);
            // Fallback to original blob
            return webmBlob;
        }
    }

    audioBufferToWav(buffer) {
        const length = buffer.length * buffer.numberOfChannels * 2 + 44;
        const arrayBuffer = new ArrayBuffer(length);
        const view = new DataView(arrayBuffer);
        const channels = [];
        let offset = 0;
        let pos = 0;

        // Write WAV header
        const setUint16 = (data) => {
            view.setUint16(pos, data, true);
            pos += 2;
        };
        const setUint32 = (data) => {
            view.setUint32(pos, data, true);
            pos += 4;
        };

        // RIFF identifier
        setUint32(0x46464952);
        // file length
        setUint32(length - 8);
        // RIFF type
        setUint32(0x45564157);
        // format chunk identifier
        setUint32(0x20746d66);
        // format chunk length
        setUint32(16);
        // sample format (raw)
        setUint16(1);
        // channel count
        setUint16(buffer.numberOfChannels);
        // sample rate
        setUint32(buffer.sampleRate);
        // byte rate
        setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels);
        // block align
        setUint16(buffer.numberOfChannels * 2);
        // bits per sample
        setUint16(16);
        // data chunk identifier
        setUint32(0x61746164);
        // data chunk length
        setUint32(length - pos - 4);

        // Write interleaved data
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        while (pos < length) {
            for (let i = 0; i < buffer.numberOfChannels; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return arrayBuffer;
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Remove data URL prefix to get pure base64
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    handleWebSocketMessage(data) {
        console.log('Received message:', data);
        
        switch (data.type) {
            case 'status':
                this.handleStatusMessage(data);
                break;
            case 'transcription':
                this.handleTranscriptionMessage(data);
                break;
            case 'sign_response':
                this.handleSignResponse(data);
                break;
            case 'error':
                this.handleErrorMessage(data);
                break;
            default:
                console.warn('Unknown message type:', data.type);
        }
    }

    handleStatusMessage(data) {
        this.statusText.textContent = data.message;
        
        // Update progress bar if available
        if (data.progress !== undefined) {
            this.updateProgressBar(data.progress);
        }
        
        if (data.message === 'Complete!') {
            this.resetUI();
        }
    }

    updateProgressBar(progress) {
        // Create or update progress bar
        let progressBar = document.querySelector('.progress-bar');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            this.statusDot.parentNode.insertBefore(progressBar, this.statusDot.nextSibling);
        }
        
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${progress}%`;
        
        if (progress === 100) {
            setTimeout(() => progressBar.remove(), 2000);
        }
    }

    handleTranscriptionMessage(data) {
        this.transcriptionText.textContent = data.text;
        
        // Add confidence indicator
        if (data.confidence > 0) {
            const confidence = Math.round(data.confidence * 100);
            this.transcriptionText.textContent += ` (${confidence}% confidence)`;
        }
        
        // Add processing time if available
        if (data.processing_time > 0) {
            this.transcriptionText.textContent += ` - ${data.processing_time}s`;
        }
        
        this.statusDot.classList.remove('processing');
        this.statusDot.classList.add('success');
    }

    handleSignResponse(data) {
        this.signResponse.textContent = data.message;
        
        // Add animation class
        this.signResponse.classList.add('sign-animation');
        setTimeout(() => {
            this.signResponse.classList.remove('sign-animation');
        }, 1000);
        
        this.statusDot.classList.remove('processing');
        this.statusDot.classList.add('success');
    }

    handleErrorMessage(data) {
        this.showError(data.message);
        this.statusDot.classList.remove('processing');
        this.statusDot.classList.add('error');
        
        // Add error code if available
        if (data.error_code) {
            console.error(`Error code: ${data.error_code}`);
        }
    }

    showError(message) {
        this.statusText.textContent = 'Error: ' + message;
        this.statusDot.style.background = '#ff6b6b';
        
        // Show error in both result boxes
        const errorMsg = `<span style="color: #ff6b6b;">❌ ${message}</span>`;
        this.transcriptionDiv.innerHTML = errorMsg;
        this.signResponseDiv.innerHTML = errorMsg;
        
        // Reset error state after 3 seconds
        setTimeout(() => {
            this.resetStatus();
        }, 3000);
    }

    resetStatus() {
        this.statusText.textContent = 'Ready';
        this.statusDot.classList.remove('processing');
        this.statusDot.style.background = '#4ecdc4';
    }
}

// Initialize the demo when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SignLanguageAIDemo();
});
