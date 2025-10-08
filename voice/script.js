class VoiceRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordedAudio = null;
        this.isRecording = false;
        this.isPlaying = false;
        this.recordings = JSON.parse(localStorage.getItem('voiceRecordings') || '[]');
        this.timerInterval = null;
        this.startTime = null;
        
        // Waveform and trimming properties
        this.audioContext = null;
        this.audioBuffer = null;
        this.waveformData = null;
        this.trimStart = 0;
        this.trimEnd = 1;
        this.isDraggingTrim = false;
        this.draggingTrimHandle = null;
        
        this.initializeElements();
        this.bindEvents();
        this.renderRecordings();
        this.setupVisualizer();
    }
    
    initializeElements() {
        this.recordBtn = document.getElementById('recordBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.statusText = document.getElementById('statusText');
        this.timer = document.getElementById('timer');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.recordingsList = document.getElementById('recordingsList');
        this.visualizer = document.getElementById('visualizer');
        this.visualizerCtx = this.visualizer.getContext('2d');
        
        // Waveform elements
        this.waveformSection = document.getElementById('waveformSection');
        this.waveformCanvas = document.getElementById('waveformCanvas');
        this.waveformCtx = this.waveformCanvas.getContext('2d');
        this.playhead = document.getElementById('playhead');
        this.trimStartHandle = document.getElementById('trimStart');
        this.trimEndHandle = document.getElementById('trimEnd');
        this.trimStartTime = document.getElementById('trimStartTime');
        this.trimEndTime = document.getElementById('trimEndTime');
        this.trimDuration = document.getElementById('trimDuration');
        this.resetTrimBtn = document.getElementById('resetTrimBtn');
        this.trimRecordingBtn = document.getElementById('trimRecordingBtn');
        
        // Filename input
        this.filenameInput = document.getElementById('filenameInput');
    }
    
    bindEvents() {
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.playBtn.addEventListener('click', () => this.playRecording());
        this.pauseBtn.addEventListener('click', () => this.pauseRecording());
        this.downloadBtn.addEventListener('click', () => this.downloadRecording());
        
        this.audioPlayer.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updateButtonStates();
        });
        
        this.audioPlayer.addEventListener('timeupdate', () => {
            this.updatePlayhead();
        });
        
        // Waveform events
        this.waveformCanvas.addEventListener('click', (e) => this.seekToPosition(e));
        this.resetTrimBtn.addEventListener('click', () => this.resetTrim());
        this.trimRecordingBtn.addEventListener('click', () => this.applyTrim());
        
        // Trim handle dragging
        this.trimStartHandle.addEventListener('mousedown', (e) => this.startDraggingTrim(e, 'start'));
        this.trimEndHandle.addEventListener('mousedown', (e) => this.startDraggingTrim(e, 'end'));
        
        document.addEventListener('mousemove', (e) => this.dragTrim(e));
        document.addEventListener('mouseup', () => this.stopDraggingTrim());
        
        // Filename input events
        this.filenameInput.addEventListener('input', () => this.validateFilename());
        this.filenameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.downloadRecording();
            }
        });
    }
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.recordedAudio = audioBlob;
                this.audioPlayer.src = URL.createObjectURL(audioBlob);
                this.updateButtonStates();
                this.updateStatus('Recording completed');
                
                // Generate waveform
                this.generateWaveform(audioBlob);
                
                // Set default filename
                this.setDefaultFilename();
                
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.startTime = Date.now();
            this.startTimer();
            this.updateButtonStates();
            this.updateStatus('Recording...');
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.updateStatus('Error: Could not access microphone');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.stopTimer();
            this.updateButtonStates();
        }
    }
    
    playRecording() {
        if (this.recordedAudio) {
            this.audioPlayer.play();
            this.isPlaying = true;
            this.updateButtonStates();
            this.updateStatus('Playing...');
        }
    }
    
    pauseRecording() {
        if (this.isPlaying) {
            this.audioPlayer.pause();
            this.isPlaying = false;
            this.updateButtonStates();
            this.updateStatus('Paused');
        }
    }
    
    downloadRecording() {
        if (this.recordedAudio) {
            let filename = this.filenameInput.value.trim();
            
            // Validate and set default filename if needed
            if (!filename || filename.length === 0) {
                filename = this.generateDefaultFilename();
            }
            
            // Sanitize filename
            filename = this.sanitizeFilename(filename);
            
            // Ensure .wav extension
            if (!filename.toLowerCase().endsWith('.wav')) {
                filename += '.wav';
            }
            
            const url = URL.createObjectURL(this.recordedAudio);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Save to recordings list
            this.saveRecording(filename, this.recordedAudio);
            
            this.updateStatus(`Downloaded: ${filename}`);
        }
    }
    
    saveRecording(name, audioBlob) {
        const recording = {
            id: Date.now(),
            name: name,
            blob: audioBlob,
            url: URL.createObjectURL(audioBlob),
            duration: this.getAudioDuration(audioBlob),
            timestamp: new Date().toISOString()
        };
        
        this.recordings.unshift(recording);
        this.saveRecordingsToStorage();
        this.renderRecordings();
    }
    
    async getAudioDuration(audioBlob) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.onloadedmetadata = () => {
                resolve(audio.duration);
            };
            audio.src = URL.createObjectURL(audioBlob);
        });
    }
    
    saveRecordingsToStorage() {
        // Convert blob to base64 for storage
        const recordingsForStorage = this.recordings.map(recording => ({
            ...recording,
            blob: null, // Don't store blob in localStorage
            blobData: null // Will be handled separately
        }));
        
        localStorage.setItem('voiceRecordings', JSON.stringify(recordingsForStorage));
    }
    
    renderRecordings() {
        this.recordingsList.innerHTML = '';
        
        if (this.recordings.length === 0) {
            this.recordingsList.innerHTML = '<p style="text-align: center; color: #636e72;">No recordings yet</p>';
            return;
        }
        
        this.recordings.forEach(recording => {
            const recordingItem = document.createElement('div');
            recordingItem.className = 'recording-item';
            
            const duration = this.formatDuration(recording.duration);
            
            recordingItem.innerHTML = `
                <div class="recording-info">
                    <div class="recording-name">${recording.name}</div>
                    <div class="recording-duration">${duration}</div>
                </div>
                <div class="recording-controls">
                    <button class="btn play-btn" onclick="voiceRecorder.playSavedRecording('${recording.id}')">
                        <span class="icon">▶️</span>
                        Play
                    </button>
                    <button class="btn download-btn" onclick="voiceRecorder.downloadSavedRecording('${recording.id}')">
                        <span class="icon">💾</span>
                        Download
                    </button>
                    <button class="btn" style="background: linear-gradient(135deg, #e17055, #d63031); color: white;" onclick="voiceRecorder.deleteRecording('${recording.id}')">
                        <span class="icon">🗑️</span>
                        Delete
                    </button>
                </div>
            `;
            
            this.recordingsList.appendChild(recordingItem);
        });
    }
    
    playSavedRecording(id) {
        const recording = this.recordings.find(r => r.id == id);
        if (recording) {
            this.audioPlayer.src = recording.url;
            this.audioPlayer.play();
            this.isPlaying = true;
            this.updateButtonStates();
            this.updateStatus('Playing saved recording...');
        }
    }
    
    downloadSavedRecording(id) {
        const recording = this.recordings.find(r => r.id == id);
        if (recording) {
            const a = document.createElement('a');
            a.href = recording.url;
            a.download = recording.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }
    
    deleteRecording(id) {
        if (confirm('Are you sure you want to delete this recording?')) {
            const recording = this.recordings.find(r => r.id == id);
            if (recording) {
                URL.revokeObjectURL(recording.url);
            }
            
            this.recordings = this.recordings.filter(r => r.id != id);
            this.saveRecordingsToStorage();
            this.renderRecordings();
        }
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateButtonStates() {
        this.recordBtn.disabled = this.isRecording || this.isPlaying;
        this.stopBtn.disabled = !this.isRecording;
        this.playBtn.disabled = !this.recordedAudio || this.isPlaying;
        this.pauseBtn.disabled = !this.isPlaying;
        this.downloadBtn.disabled = !this.recordedAudio;
    }
    
    updateStatus(message) {
        this.statusText.textContent = message;
    }
    
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    setupVisualizer() {
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
    }
    
    async generateWaveform(audioBlob) {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const arrayBuffer = await audioBlob.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // Generate waveform data
            const channelData = this.audioBuffer.getChannelData(0);
            const samplesPerPixel = Math.floor(channelData.length / this.waveformCanvas.width);
            this.waveformData = [];
            
            for (let i = 0; i < this.waveformCanvas.width; i++) {
                const start = i * samplesPerPixel;
                const end = Math.min(start + samplesPerPixel, channelData.length);
                let sum = 0;
                
                for (let j = start; j < end; j++) {
                    sum += Math.abs(channelData[j]);
                }
                
                this.waveformData.push(sum / (end - start));
            }
            
            this.drawWaveform();
            this.waveformSection.style.display = 'block';
            this.resetTrim();
            
        } catch (error) {
            console.error('Error generating waveform:', error);
        }
    }
    
    drawWaveform() {
        if (!this.waveformData) return;
        
        const canvas = this.waveformCanvas;
        const ctx = this.waveformCtx;
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < this.waveformData.length; i++) {
            const x = i;
            const amplitude = this.waveformData[i] * height;
            const y = (height - amplitude) / 2;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        // Draw mirrored waveform
        ctx.beginPath();
        for (let i = 0; i < this.waveformData.length; i++) {
            const x = i;
            const amplitude = this.waveformData[i] * height;
            const y = (height + amplitude) / 2;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        // Draw trim area overlay
        this.drawTrimOverlay();
    }
    
    drawTrimOverlay() {
        const canvas = this.waveformCanvas;
        const ctx = this.waveformCtx;
        const width = canvas.width;
        const height = canvas.height;
        
        // Draw trim selection area
        const startX = this.trimStart * width;
        const endX = this.trimEnd * width;
        
        // Semi-transparent overlay for non-selected areas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, startX, height);
        ctx.fillRect(endX, 0, width - endX, height);
        
        // Selected area highlight
        ctx.fillStyle = 'rgba(0, 184, 148, 0.2)';
        ctx.fillRect(startX, 0, endX - startX, height);
    }
    
    seekToPosition(event) {
        if (!this.audioBuffer) return;
        
        const rect = this.waveformCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const percentage = x / rect.width;
        const time = percentage * this.audioBuffer.duration;
        
        this.audioPlayer.currentTime = time;
        this.updatePlayhead();
    }
    
    updatePlayhead() {
        if (!this.audioBuffer) return;
        
        const percentage = this.audioPlayer.currentTime / this.audioBuffer.duration;
        const x = percentage * this.waveformCanvas.width;
        
        this.playhead.style.left = x + 'px';
    }
    
    startDraggingTrim(event, handle) {
        this.isDraggingTrim = true;
        this.draggingTrimHandle = handle;
        event.preventDefault();
    }
    
    dragTrim(event) {
        if (!this.isDraggingTrim || !this.audioBuffer) return;
        
        const rect = this.waveformCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        
        if (this.draggingTrimHandle === 'start') {
            this.trimStart = Math.min(percentage, this.trimEnd - 0.01);
            this.trimStartHandle.style.left = (this.trimStart * rect.width) + 'px';
        } else if (this.draggingTrimHandle === 'end') {
            this.trimEnd = Math.max(percentage, this.trimStart + 0.01);
            this.trimEndHandle.style.left = (this.trimEnd * rect.width) + 'px';
        }
        
        this.updateTrimInfo();
        this.drawWaveform();
    }
    
    stopDraggingTrim() {
        this.isDraggingTrim = false;
        this.draggingTrimHandle = null;
    }
    
    resetTrim() {
        this.trimStart = 0;
        this.trimEnd = 1;
        this.trimStartHandle.style.left = '0px';
        this.trimEndHandle.style.left = '100%';
        this.updateTrimInfo();
        this.drawWaveform();
    }
    
    updateTrimInfo() {
        if (!this.audioBuffer) return;
        
        const startTime = this.trimStart * this.audioBuffer.duration;
        const endTime = this.trimEnd * this.audioBuffer.duration;
        const duration = endTime - startTime;
        
        this.trimStartTime.textContent = this.formatDuration(startTime);
        this.trimEndTime.textContent = this.formatDuration(endTime);
        this.trimDuration.textContent = this.formatDuration(duration);
    }
    
    async applyTrim() {
        if (!this.audioBuffer) return;
        
        try {
            const startTime = this.trimStart * this.audioBuffer.duration;
            const endTime = this.trimEnd * this.audioBuffer.duration;
            const duration = endTime - startTime;
            
            // Create a new audio buffer with trimmed content
            const trimmedBuffer = this.audioContext.createBuffer(
                this.audioBuffer.numberOfChannels,
                Math.floor(duration * this.audioBuffer.sampleRate),
                this.audioBuffer.sampleRate
            );
            
            for (let channel = 0; channel < this.audioBuffer.numberOfChannels; channel++) {
                const originalData = this.audioBuffer.getChannelData(channel);
                const trimmedData = trimmedBuffer.getChannelData(channel);
                const startSample = Math.floor(startTime * this.audioBuffer.sampleRate);
                const endSample = Math.floor(endTime * this.audioBuffer.sampleRate);
                
                for (let i = 0; i < trimmedData.length; i++) {
                    trimmedData[i] = originalData[startSample + i] || 0;
                }
            }
            
            // Convert trimmed buffer back to blob
            const trimmedBlob = await this.audioBufferToBlob(trimmedBuffer);
            this.recordedAudio = trimmedBlob;
            this.audioPlayer.src = URL.createObjectURL(trimmedBlob);
            
            // Regenerate waveform for trimmed audio
            this.generateWaveform(trimmedBlob);
            
            this.updateStatus('Recording trimmed successfully');
            
        } catch (error) {
            console.error('Error trimming audio:', error);
            this.updateStatus('Error trimming audio');
        }
    }
    
    async audioBufferToBlob(audioBuffer) {
        const numberOfChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const length = audioBuffer.length;
        
        // Create WAV file
        const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
        const view = new DataView(buffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * numberOfChannels * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * numberOfChannels * 2, true);
        
        // Convert float samples to 16-bit PCM
        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }
        
        return new Blob([buffer], { type: 'audio/wav' });
    }
    
    setDefaultFilename() {
        const defaultName = this.generateDefaultFilename();
        this.filenameInput.value = defaultName;
        this.filenameInput.select(); // Select the text for easy editing
    }
    
    generateDefaultFilename() {
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[:.]/g, '-');
        return `recording-${timestamp}`;
    }
    
    sanitizeFilename(filename) {
        // Remove or replace invalid characters
        return filename
            .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid chars with dash
            .replace(/\s+/g, '-') // Replace spaces with dash
            .replace(/-+/g, '-') // Replace multiple dashes with single dash
            .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
    }
    
    validateFilename() {
        const filename = this.filenameInput.value.trim();
        const isValid = filename.length > 0 && filename.length <= 50;
        
        // Visual feedback for validation
        if (filename.length > 0) {
            this.filenameInput.style.borderColor = isValid ? '#00b894' : '#e17055';
        } else {
            this.filenameInput.style.borderColor = '#ddd';
        }
        
        return isValid;
    }
    
    drawVisualizer() {
        if (!this.analyser) return;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        this.visualizerCtx.fillStyle = '#f8f9fa';
        this.visualizerCtx.fillRect(0, 0, this.visualizer.width, this.visualizer.height);
        
        const barWidth = (this.visualizer.width / this.dataArray.length) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            barHeight = (this.dataArray[i] / 255) * this.visualizer.height;
            
            const gradient = this.visualizerCtx.createLinearGradient(0, this.visualizer.height, 0, this.visualizer.height - barHeight);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            
            this.visualizerCtx.fillStyle = gradient;
            this.visualizerCtx.fillRect(x, this.visualizer.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
        
        this.animationId = requestAnimationFrame(() => this.drawVisualizer());
    }
}

// Initialize the voice recorder when the page loads
let voiceRecorder;
document.addEventListener('DOMContentLoaded', () => {
    voiceRecorder = new VoiceRecorder();
});
