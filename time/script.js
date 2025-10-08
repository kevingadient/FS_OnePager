class TimerApp {
    constructor() {
        this.totalTime = 120; // Default 2 minutes in seconds
        this.timeLeft = this.totalTime;
        this.isRunning = false;
        this.isPaused = false;
        this.intervalId = null;
        this.spotifyWasPlaying = false;
        
        // Audio context for generating sounds
        this.audioContext = null;
        this.volume = 0.7; // Default volume
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeAudio();
        this.updateDisplay();
    }
    
    initializeElements() {
        this.timerDisplay = document.getElementById('timerDisplay');
        this.timerStatus = document.getElementById('timerStatus');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeValue = document.getElementById('volumeValue');
        this.soundSelect = document.getElementById('soundSelect');
        this.spotifyAudio = document.getElementById('spotifyAudio');
        this.playPauseBtn = document.getElementById('playPause');
        this.prevTrackBtn = document.getElementById('prevTrack');
        this.nextTrackBtn = document.getElementById('nextTrack');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.currentTimeSpan = document.getElementById('currentTime');
        this.totalTimeSpan = document.getElementById('totalTime');
        this.musicVolumeSlider = document.getElementById('musicVolume');
        this.musicVolumeValue = document.getElementById('musicVolumeValue');
        this.trackTitle = document.getElementById('trackTitle');
        this.trackArtist = document.getElementById('trackArtist');
        this.notifications = document.getElementById('notifications');
        
        // Time input elements
        this.minutesInput = document.getElementById('minutesInput');
        this.secondsInput = document.getElementById('secondsInput');
        this.setTimeBtn = document.getElementById('setTimeBtn');
        
        this.isPlaying = false;
        this.currentTrackIndex = 0;
        this.tracks = [
            { title: "Ambient Focus", artist: "Study Music", src: "https://www.soundjay.com/free-music/sounds/iron-man-01.mp3" },
            { title: "Peaceful Sounds", artist: "Relaxation", src: "https://www.soundjay.com/free-music/sounds/heart-of-the-sea-01.mp3" }
        ];
        
        this.setupAudioEvents();
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.pauseBtn.addEventListener('click', () => this.pauseTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        this.volumeSlider.addEventListener('input', (e) => this.updateVolume(e.target.value));
        this.soundSelect.addEventListener('change', () => this.updateSound());
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevTrackBtn.addEventListener('click', () => this.prevTrack());
        this.nextTrackBtn.addEventListener('click', () => this.nextTrack());
        this.musicVolumeSlider.addEventListener('input', (e) => this.updateMusicVolume(e.target.value));
        this.progressBar.addEventListener('click', (e) => this.seekTo(e));
        this.setTimeBtn.addEventListener('click', () => this.setCustomTime());
        
        // Time input validation
        this.minutesInput.addEventListener('input', () => this.validateTimeInput());
        this.secondsInput.addEventListener('input', () => this.validateTimeInput());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, select, iframe')) {
                e.preventDefault();
                if (this.isRunning) {
                    this.pauseTimer();
                } else {
                    this.startTimer();
                }
            } else if (e.code === 'KeyR') {
                e.preventDefault();
                this.resetTimer();
            }
        });
    }
    
    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Audio context not supported:', error);
            this.showNotification('Audio alerts may not work in this browser', 'warning');
        }
    }
    
    startTimer() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
            this.timerStatus.textContent = 'Timer running...';
            this.timerDisplay.classList.add('countdown');
            
            // Start music automatically
            this.playSpotify();
            
            this.intervalId = setInterval(() => {
                this.timeLeft--;
                this.updateDisplay();
                
                if (this.timeLeft <= 0) {
                    this.timerFinished();
                }
            }, 1000);
            
            this.showNotification('Timer started! Music will play automatically.', 'success');
        }
    }
    
    pauseTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            this.isPaused = true;
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.timerStatus.textContent = 'Timer paused';
            this.timerDisplay.classList.remove('countdown');
            
            clearInterval(this.intervalId);
            this.showNotification('Timer paused', 'warning');
        }
    }
    
    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.timeLeft = this.totalTime;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.timerStatus.textContent = 'Ready to start';
        this.timerDisplay.classList.remove('countdown', 'finished');
        
        clearInterval(this.intervalId);
        this.updateDisplay();
        this.showNotification('Timer reset', 'success');
    }
    
    timerFinished() {
        this.isRunning = false;
        this.isPaused = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.timerStatus.textContent = 'Time\'s up!';
        this.timerDisplay.classList.remove('countdown');
        this.timerDisplay.classList.add('finished');
        
        clearInterval(this.intervalId);
        
        // Stop music when timer finishes
        this.pauseSpotify();
        
        this.playAlertSound();
        this.showNotification('Time\'s up! Music paused and audio alert played.', 'success');
        
        // Flash the timer display
        setTimeout(() => {
            this.timerDisplay.classList.remove('finished');
        }, 3000);
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timerDisplay.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateVolume(value) {
        this.volume = parseInt(value) / 100;
        this.volumeValue.textContent = `${value}%`;
    }
    
    updateSound() {
        // Sound selection is handled in playAlertSound method
        this.showNotification(`Alert sound changed to: ${this.soundSelect.value}`, 'success');
    }
    
    playAlertSound() {
        if (!this.audioContext) {
            // Fallback: try to use Web Audio API
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (error) {
                console.warn('Cannot create audio context:', error);
                this.showNotification('Cannot play audio alert', 'error');
                return;
            }
        }
        
        const soundType = this.soundSelect.value;
        const duration = 2; // 2 seconds
        const frequency = this.getFrequencyForSound(soundType);
        
        try {
            this.generateTone(frequency, duration, this.volume);
        } catch (error) {
            console.error('Error playing alert sound:', error);
            this.showNotification('Error playing audio alert', 'error');
        }
    }
    
    getFrequencyForSound(soundType) {
        const frequencies = {
            'beep': 800,
            'chime': 523.25, // C5
            'bell': 659.25, // E5
            'notification': 440 // A4
        };
        return frequencies[soundType] || 800;
    }
    
    generateTone(frequency, duration, volume) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
        
        // For notification sound, add a second tone
        if (this.soundSelect.value === 'notification') {
            setTimeout(() => {
                const oscillator2 = this.audioContext.createOscillator();
                const gainNode2 = this.audioContext.createGain();
                
                oscillator2.connect(gainNode2);
                gainNode2.connect(this.audioContext.destination);
                
                oscillator2.frequency.value = frequency * 1.5; // Higher pitch
                oscillator2.type = 'sine';
                
                gainNode2.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode2.gain.linearRampToValueAtTime(volume * 0.3, this.audioContext.currentTime + 0.01);
                gainNode2.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1);
                
                oscillator2.start(this.audioContext.currentTime);
                oscillator2.stop(this.audioContext.currentTime + 1);
            }, 500);
        }
    }
    
    setupAudioEvents() {
        this.spotifyAudio.addEventListener('timeupdate', () => this.updateProgress());
        this.spotifyAudio.addEventListener('loadedmetadata', () => this.updateTotalTime());
        this.spotifyAudio.addEventListener('ended', () => this.nextTrack());
        
        // Set initial volume
        this.spotifyAudio.volume = this.musicVolumeSlider.value / 100;
        this.loadTrack(this.currentTrackIndex);
    }
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.pauseSpotify();
        } else {
            this.playSpotify();
        }
    }
    
    playSpotify() {
        try {
            this.spotifyAudio.play().then(() => {
                this.isPlaying = true;
                this.playPauseBtn.textContent = '⏸';
                this.showNotification('Music started playing', 'success');
            }).catch((error) => {
                console.log('Auto-play prevented:', error);
                this.showNotification('Click play button to start music', 'info');
            });
        } catch (error) {
            console.error('Error playing audio:', error);
            this.showNotification('Click play button to start music', 'info');
        }
    }
    
    pauseSpotify() {
        try {
            this.spotifyAudio.pause();
            this.isPlaying = false;
            this.playPauseBtn.textContent = '▶';
            this.showNotification('Music paused', 'success');
        } catch (error) {
            console.error('Error pausing audio:', error);
            this.showNotification('Music paused', 'info');
        }
    }
    
    prevTrack() {
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        this.loadTrack(this.currentTrackIndex);
    }
    
    nextTrack() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.loadTrack(this.currentTrackIndex);
    }
    
    loadTrack(index) {
        const track = this.tracks[index];
        this.spotifyAudio.src = track.src;
        this.trackTitle.textContent = track.title;
        this.trackArtist.textContent = track.artist;
        
        if (this.isPlaying) {
            this.spotifyAudio.play();
        }
    }
    
    updateProgress() {
        if (this.spotifyAudio.duration) {
            const progress = (this.spotifyAudio.currentTime / this.spotifyAudio.duration) * 100;
            this.progressFill.style.width = progress + '%';
            this.currentTimeSpan.textContent = this.formatTime(this.spotifyAudio.currentTime);
        }
    }
    
    updateTotalTime() {
        if (this.spotifyAudio.duration) {
            this.totalTimeSpan.textContent = this.formatTime(this.spotifyAudio.duration);
        }
    }
    
    seekTo(event) {
        const rect = this.progressBar.getBoundingClientRect();
        const pos = (event.clientX - rect.left) / rect.width;
        this.spotifyAudio.currentTime = pos * this.spotifyAudio.duration;
    }
    
    updateMusicVolume(value) {
        this.spotifyAudio.volume = value / 100;
        this.musicVolumeValue.textContent = value + '%';
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }
    
    setCustomTime() {
        const minutes = parseInt(this.minutesInput.value) || 0;
        const seconds = parseInt(this.secondsInput.value) || 0;
        const totalSeconds = minutes * 60 + seconds;
        
        if (totalSeconds <= 0) {
            this.showNotification('Please enter a valid time (at least 1 second)', 'error');
            return;
        }
        
        if (totalSeconds > 3600) { // 1 hour limit
            this.showNotification('Maximum time is 60 minutes', 'error');
            return;
        }
        
        this.totalTime = totalSeconds;
        this.timeLeft = totalSeconds;
        this.updateDisplay();
        this.showNotification(`Timer set to ${minutes}:${seconds.toString().padStart(2, '0')}`, 'success');
    }
    
    validateTimeInput() {
        // Ensure minutes is between 0-59
        if (this.minutesInput.value > 59) {
            this.minutesInput.value = 59;
        }
        if (this.minutesInput.value < 0) {
            this.minutesInput.value = 0;
        }
        
        // Ensure seconds is between 0-59
        if (this.secondsInput.value > 59) {
            this.secondsInput.value = 59;
        }
        if (this.secondsInput.value < 0) {
            this.secondsInput.value = 0;
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        this.notifications.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new TimerApp();
    
    // Show initial instructions
    setTimeout(() => {
        app.showNotification('Press SPACE to start/pause, R to reset', 'info');
    }, 1000);
});

// Service Worker registration for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
