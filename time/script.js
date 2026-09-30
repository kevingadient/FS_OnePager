class FocusTimerApp {
    constructor() {
        // Timer State
        this.totalTime = 120; // Default 2 min
        this.timeLeft = this.totalTime;
        this.isRunning = false;
        this.intervalId = null;

        // Audio State
        this.audioCtx = null;
        this.alertVolume = 0.7;
        this.alertRepeat = 2;
        this.currentSound = 'chime';

        // Music & Ambient State
        this.activeTab = 'ambient';
        this.activeAmbientSound = 'rain';
        this.ambientGainNode = null;
        this.ambientSourceNode = null;
        this.isPlayingMusic = false;

        this.trackIndex = 0;
        this.tracks = [
            { name: "Ambient Study Focus", artist: "Royalty Free Audio", src: "https://www.soundjay.com/free-music/sounds/iron-man-01.mp3" },
            { name: "Peaceful Mind Waves", artist: "Relaxation Waves", src: "https://www.soundjay.com/free-music/sounds/heart-of-the-sea-01.mp3" }
        ];

        this.initElements();
        this.bindEvents();
        this.updateTimerDisplay();
        this.updateProgressRing();
    }

    initElements() {
        // Timer Elements
        this.timerDisplay = document.getElementById('timerDisplay');
        this.timerStatus = document.getElementById('timerStatus');
        this.ringProgress = document.getElementById('ringProgress');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');

        // Custom Time
        this.minutesInput = document.getElementById('minutesInput');
        this.secondsInput = document.getElementById('secondsInput');
        this.setTimeBtn = document.getElementById('setTimeBtn');

        // Mode Nav
        this.modeBtns = document.querySelectorAll('.mode-btn');

        // Alert Controls
        this.soundSelect = document.getElementById('soundSelect');
        this.alertVolumeSlider = document.getElementById('alertVolume');
        this.alertVolVal = document.getElementById('alertVolVal');
        this.repeatSelect = document.getElementById('repeatSelect');
        this.testAlertBtn = document.getElementById('testAlertBtn');
        this.desktopNotifyToggle = document.getElementById('desktopNotifyToggle');

        // Audio Player Elements
        this.musicAudio = document.getElementById('musicAudio');
        this.playPauseBtn = document.getElementById('playPause');
        this.playIcon = document.getElementById('playIcon');
        this.prevTrackBtn = document.getElementById('prevTrack');
        this.nextTrackBtn = document.getElementById('nextTrack');
        this.musicVolumeSlider = document.getElementById('musicVolume');
        this.musicVolVal = document.getElementById('musicVolVal');

        this.radioSelect = document.getElementById('radioSelect');
        this.trackName = document.getElementById('trackName');
        this.trackArtist = document.getElementById('trackArtist');

        // Tabs & Cards
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabPanes = document.querySelectorAll('.tab-pane');
        this.ambientCards = document.querySelectorAll('.ambient-card');
        this.notifications = document.getElementById('notifications');
    }

    bindEvents() {
        // Timer Button Listeners
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.pauseBtn.addEventListener('click', () => this.pauseTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        this.setTimeBtn.addEventListener('click', () => this.setCustomTime());

        // Mode Switcher
        this.modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const mins = parseInt(btn.dataset.mins) || 0;
                const secs = parseInt(btn.dataset.secs) || 0;
                this.minutesInput.value = mins;
                this.secondsInput.value = secs;
                this.setCustomTime();
            });
        });

        // Alert Settings
        this.soundSelect.addEventListener('change', (e) => {
            this.currentSound = e.target.value;
        });

        this.alertVolumeSlider.addEventListener('input', (e) => {
            this.alertVolume = parseInt(e.target.value) / 100;
            this.alertVolVal.textContent = `${e.target.value}%`;
        });

        this.repeatSelect.addEventListener('change', (e) => {
            this.alertRepeat = parseInt(e.target.value);
        });

        this.testAlertBtn.addEventListener('click', () => this.playAlertSound());

        // Player Controls
        this.playPauseBtn.addEventListener('click', () => this.toggleMusic());
        this.prevTrackBtn.addEventListener('click', () => this.prevTrack());
        this.nextTrackBtn.addEventListener('click', () => this.nextTrack());

        this.musicVolumeSlider.addEventListener('input', (e) => {
            const v = parseInt(e.target.value) / 100;
            this.musicVolVal.textContent = `${e.target.value}%`;
            if (this.musicAudio) this.musicAudio.volume = v;
            if (this.ambientGainNode) this.ambientGainNode.gain.value = v * 0.4;
        });

        // Tabs
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.tabBtns.forEach(b => b.classList.remove('active'));
                this.tabPanes.forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                const targetTab = btn.dataset.tab;
                document.getElementById(`pane-${targetTab}`).classList.add('active');
                this.activeTab = targetTab;
            });
        });

        // Ambient Selector
        this.ambientCards.forEach(card => {
            card.addEventListener('click', () => {
                this.ambientCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.activeAmbientSound = card.dataset.sound;

                if (this.isPlayingMusic && this.activeTab === 'ambient') {
                    this.playAmbient(this.activeAmbientSound);
                }
            });
        });

        // Radio Select
        this.radioSelect.addEventListener('change', () => {
            if (this.isPlayingMusic && this.activeTab === 'radio') {
                this.playRadio();
            }
        });

        // Desktop Notification Toggle
        this.desktopNotifyToggle.addEventListener('change', (e) => {
            if (e.target.checked && Notification.permission !== 'granted') {
                Notification.requestPermission().then(p => {
                    if (p !== 'granted') {
                        e.target.checked = false;
                        this.showNotification('Desktop notifications not granted', 'error');
                    } else {
                        this.showNotification('Desktop notifications enabled!', 'success');
                    }
                });
            }
        });

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, select, button')) {
                e.preventDefault();
                if (this.isRunning) this.pauseTimer();
                else this.startTimer();
            }
        });
    }

    ensureAudioContext() {
        if (!this.audioCtx) {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    // Timer Methods
    startTimer() {
        if (!this.isRunning) {
            this.ensureAudioContext();
            this.isRunning = true;
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
            this.timerStatus.textContent = 'Focusing...';

            this.intervalId = setInterval(() => {
                this.timeLeft--;
                this.updateTimerDisplay();
                this.updateProgressRing();

                if (this.timeLeft <= 0) {
                    this.timerFinished();
                }
            }, 1000);

            this.showNotification('Timer started', 'success');
        }
    }

    pauseTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.timerStatus.textContent = 'Paused';
            clearInterval(this.intervalId);
            this.showNotification('Timer paused', 'warning');
        }
    }

    resetTimer() {
        this.isRunning = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.timerStatus.textContent = 'Ready to focus';
        clearInterval(this.intervalId);

        this.timeLeft = this.totalTime;
        this.updateTimerDisplay();
        this.updateProgressRing();
        this.showNotification('Timer reset', 'info');
    }

    timerFinished() {
        this.isRunning = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.timerStatus.textContent = "Time's Up!";
        clearInterval(this.intervalId);

        this.playAlertSound();
        if (this.desktopNotifyToggle.checked && Notification.permission === 'granted') {
            new Notification('⏱️ Focus Time Complete!', { body: 'Great job completing your timer!' });
        }

        this.showNotification("Time's up!", 'success');
    }

    updateTimerDisplay() {
        const mins = Math.floor(Math.max(0, this.timeLeft) / 60);
        const secs = Math.max(0, this.timeLeft) % 60;
        const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        this.timerDisplay.textContent = str;
        document.title = `(${str}) Focus Time`;
    }

    updateProgressRing() {
        if (!this.ringProgress) return;
        const total = this.totalTime || 1;
        const ratio = Math.max(0, this.timeLeft) / total;
        // Total circumference r=105 is ~660
        const offset = 660 - (ratio * 660);
        this.ringProgress.style.strokeDashoffset = offset;
    }

    setCustomTime() {
        const mins = parseInt(this.minutesInput.value) || 0;
        const secs = parseInt(this.secondsInput.value) || 0;
        const total = mins * 60 + secs;

        if (total <= 0) {
            this.showNotification('Set at least 1 second', 'error');
            return;
        }

        this.totalTime = total;
        this.timeLeft = total;
        this.updateTimerDisplay();
        this.updateProgressRing();
        this.showNotification(`Timer set to ${mins}m ${secs}s`, 'success');
    }

    // Alert Synthesizer
    playAlertSound() {
        this.ensureAudioContext();
        if (this.currentSound === 'silent') return;

        const repeats = this.alertRepeat;
        for (let i = 0; i < repeats; i++) {
            setTimeout(() => {
                this.synthesizeTone(this.currentSound, this.alertVolume);
            }, i * 900);
        }
    }

    synthesizeTone(type, volume) {
        if (!this.audioCtx) return;
        const now = this.audioCtx.currentTime;

        if (type === 'chime') {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.frequency.setValueAtTime(523.25, now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 1.2);
        } else if (type === 'gong') {
            [120, 240].forEach((f, idx) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.frequency.setValueAtTime(f, now);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime((volume * 0.4) / (idx + 1), now + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(now);
                osc.stop(now + 2.0);
            });
        } else if (type === 'marimba') {
            [523.25, 659.25, 783.99].forEach((f, idx) => {
                const t = now + (idx * 0.12);
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, t);
                gain.gain.setValueAtTime(volume * 0.4, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(t);
                osc.stop(t + 0.5);
            });
        } else if (type === 'radar') {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);
            gain.gain.setValueAtTime(volume * 0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'nature') {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.frequency.setValueAtTime(1760, now);
            osc.frequency.linearRampToValueAtTime(2200, now + 0.1);
            gain.gain.setValueAtTime(volume * 0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'digital') {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, now);
            gain.gain.setValueAtTime(volume * 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        }
    }

    // Music & Free Sound Player Logic
    toggleMusic() {
        if (this.isPlayingMusic) {
            this.stopMusic();
        } else {
            this.playMusic();
        }
    }

    playMusic() {
        this.ensureAudioContext();
        this.stopAmbient();

        if (this.activeTab === 'ambient') {
            this.playAmbient(this.activeAmbientSound);
        } else if (this.activeTab === 'radio') {
            this.playRadio();
        } else {
            this.playTrack(this.trackIndex);
        }
    }

    stopMusic() {
        this.musicAudio.pause();
        this.stopAmbient();
        this.isPlayingMusic = false;
        this.playIcon.textContent = '▶';
        this.showNotification('Music stopped', 'info');
    }

    playAmbient(type) {
        this.stopAmbient();
        this.ensureAudioContext();

        const bufferSize = 2 * this.audioCtx.sampleRate;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.1;
        }

        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = type === 'rain' ? 'lowpass' : 'bandpass';
        filter.frequency.value = type === 'rain' ? 700 : 350;

        const gain = this.audioCtx.createGain();
        gain.gain.value = (parseInt(this.musicVolumeSlider.value) / 100) * 0.4;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);

        source.start();
        this.ambientSourceNode = source;
        this.ambientGainNode = gain;

        this.isPlayingMusic = true;
        this.playIcon.textContent = '⏸';
        this.showNotification(`Free Ambient Active: ${type}`, 'success');
    }

    stopAmbient() {
        if (this.ambientSourceNode) {
            try { this.ambientSourceNode.stop(); } catch(e){}
            this.ambientSourceNode = null;
        }
    }

    playRadio() {
        const url = this.radioSelect.value;
        this.musicAudio.src = url;
        this.musicAudio.volume = parseInt(this.musicVolumeSlider.value) / 100;
        
        this.showNotification('Connecting to Free Radio stream...', 'info');

        this.musicAudio.play().then(() => {
            this.isPlayingMusic = true;
            this.playIcon.textContent = '⏸';
            this.showNotification('Free Radio playing!', 'success');
        }).catch(err => {
            console.warn('Radio stream failed:', err);
            this.showNotification('Stream busy. Falling back to ambient sound.', 'warning');
            this.playAmbient('rain');
        });
    }

    playTrack(index) {
        const track = this.tracks[index];
        this.musicAudio.src = track.src;
        this.musicAudio.volume = parseInt(this.musicVolumeSlider.value) / 100;
        this.trackName.textContent = track.name;
        this.trackArtist.textContent = track.artist;

        this.musicAudio.play().then(() => {
            this.isPlayingMusic = true;
            this.playIcon.textContent = '⏸';
            this.showNotification(`Playing track: ${track.name}`, 'success');
        }).catch(() => {
            this.showNotification('Click play to allow audio', 'info');
        });
    }

    prevTrack() {
        this.trackIndex = (this.trackIndex - 1 + this.tracks.length) % this.tracks.length;
        if (this.activeTab === 'tracks') this.playTrack(this.trackIndex);
    }

    nextTrack() {
        this.trackIndex = (this.trackIndex + 1) % this.tracks.length;
        if (this.activeTab === 'tracks') this.playTrack(this.trackIndex);
    }

    showNotification(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `notification ${type}`;
        toast.textContent = msg;

        this.notifications.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new FocusTimerApp();
});
