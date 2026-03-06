class RecordingSystem {
  constructor() {
    this.isRecording = false;
    this.recordedData = [];
    this.recordStartTime = 0;
  }

  start() {
    if (this.isRecording) return;

    this.isRecording = true;
    this.recordedData = [];
    this.recordStartTime = performance.now();

    // Update UI
    const indicator = document.getElementById('recordingIndicator');
    const recordBtn = document.getElementById('recordBtn');

    if (indicator) indicator.classList.add('active');
    if (recordBtn) {
      recordBtn.textContent = '⏹️ Stop Recording';
      recordBtn.classList.add('btn-stop');
    }

    console.log('Recording started');
  }

  stop() {
    if (!this.isRecording) return;

    this.isRecording = false;

    // Update UI
    const indicator = document.getElementById('recordingIndicator');
    const recordBtn = document.getElementById('recordBtn');

    if (indicator) indicator.classList.remove('active');
    if (recordBtn) {
      recordBtn.textContent = '⏺️ Record';
      recordBtn.classList.remove('btn-stop');
    }

    // Save session if we have data
    if (this.recordedData.length > 0) {
      window.sessions.saveSession(this.recordedData);
      window.sessions?.animateSessionSaved?.(recordBtn || indicator);
      this.recordedData = [];
    }

    console.log('Recording stopped');
  }

  toggle() {
    if (this.isRecording) {
      this.stop();
    } else {
      this.start();
    }
  }

  addDataPoint(freq, clarity, rms) {
    if (!this.isRecording || freq === 0) return;

    const now = performance.now();
    this.recordedData.push({
      time: now - this.recordStartTime,
      freq,
      clarity,
      rms
    });
  }

  getRecordingState() {
    return this.isRecording;
  }

  getRecordedData() {
    return this.recordedData;
  }
}

// Create singleton
export const recording = new RecordingSystem();

// Make globally accessible
window.recording = recording;
