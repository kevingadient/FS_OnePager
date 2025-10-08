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
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `recording-${timestamp}.wav`;
            
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
