/**
 * VMS.Camera — Webcam capture controller
 *
 * Wraps getUserMedia to provide start / capture / retake / stop lifecycle.
 * Each instance is bound to specific DOM elements via a config object.
 */
window.VMS = window.VMS || {};

VMS.Camera = (function () {
  'use strict';

  /**
   * @param {Object} config
   * @param {string} config.videoId       - ID of the <video> element
   * @param {string} config.canvasId      - ID of the hidden <canvas> element
   * @param {string} config.photoId       - ID of the <img> element for preview
   * @param {string} config.captureBtn    - ID of the capture button
   * @param {string} config.retakeBtn     - ID of the retake button
   * @param {string} config.containerId   - ID of the wrapper container (for error messages)
   */
  function Camera(config) {
    this.video = document.getElementById(config.videoId);
    this.canvas = document.getElementById(config.canvasId);
    this.photo = document.getElementById(config.photoId);
    this.captureBtn = document.getElementById(config.captureBtn);
    this.retakeBtn = document.getElementById(config.retakeBtn);
    this.container = document.getElementById(config.containerId);

    this._stream = null;
    this._photoData = null; // base64 data URL

    this._bindButtons();
  }

  // ── Private helpers ─────────────────────────────────────────────────

  Camera.prototype._bindButtons = function () {
    if (this.captureBtn) {
      this.captureBtn.addEventListener('click', () => this.capture());
    }
    if (this.retakeBtn) {
      this.retakeBtn.addEventListener('click', () => this.retake());
    }
  };

  /**
   * Show a user-friendly error inside the camera container.
   * @param {string} message
   */
  Camera.prototype._showError = function (message) {
    if (!this.container) return;

    // Remove any previous error
    const existing = this.container.querySelector('.camera-error');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = 'camera-error';
    div.innerHTML =
      '<i data-lucide="camera-off"></i> ' +
      '<span>' + message + '</span>';
    this.container.prepend(div);

    // Re-render lucide icons so the new <i> is replaced
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  };

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Request camera access and pipe the stream to the video element.
   */
  Camera.prototype.start = async function () {
    // Reset UI state
    this._photoData = null;
    if (this.photo) this.photo.style.display = 'none';
    if (this.video) this.video.style.display = 'block';
    if (this.retakeBtn) this.retakeBtn.style.display = 'none';
    if (this.captureBtn) this.captureBtn.style.display = 'inline-flex';

    // Clear previous errors
    if (this.container) {
      const err = this.container.querySelector('.camera-error');
      if (err) err.remove();
    }

    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });

      if (this.video) {
        this.video.srcObject = this._stream;
        this.video.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);

      let msg = 'Unable to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found. Please connect a camera.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is in use by another application.';
      }

      this._showError(msg);
    }
  };

  /**
   * Capture a single frame from the video stream as JPEG.
   */
  Camera.prototype.capture = function () {
    if (!this.video || !this.canvas) return;

    const ctx = this.canvas.getContext('2d');
    this.canvas.width = this.video.videoWidth || 640;
    this.canvas.height = this.video.videoHeight || 480;
    ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    this._photoData = this.canvas.toDataURL('image/jpeg', 0.8);

    // Show captured photo, hide video
    if (this.photo) {
      this.photo.src = this._photoData;
      this.photo.style.display = 'block';
      this.photo.classList.remove('hidden');
    }
    if (this.video) this.video.style.display = 'none';
    if (this.captureBtn) this.captureBtn.style.display = 'none';
    if (this.retakeBtn) this.retakeBtn.style.display = 'inline-flex';
  };

  /**
   * Discard the captured photo and resume the live preview.
   */
  Camera.prototype.retake = function () {
    this._photoData = null;

    if (this.photo) {
      this.photo.style.display = 'none';
      this.photo.classList.add('hidden');
    }
    if (this.video) this.video.style.display = 'block';
    if (this.captureBtn) this.captureBtn.style.display = 'inline-flex';
    if (this.retakeBtn) this.retakeBtn.style.display = 'none';
  };

  /**
   * Return the captured photo as a base64 data URL, or null.
   * @returns {string|null}
   */
  Camera.prototype.getPhoto = function () {
    return this._photoData;
  };

  /**
   * Stop all media tracks and release the camera.
   */
  Camera.prototype.stop = function () {
    if (this._stream) {
      this._stream.getTracks().forEach(function (track) {
        track.stop();
      });
      this._stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  };

  /**
   * Check whether the camera is currently streaming.
   * @returns {boolean}
   */
  Camera.prototype.isActive = function () {
    return !!(
      this._stream &&
      this._stream.getTracks().some(function (t) {
        return t.readyState === 'live';
      })
    );
  };

  return Camera;
})();
