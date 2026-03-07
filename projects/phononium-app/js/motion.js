import { clamp } from './music.js';

export const CONTROL_MODES = {
  skyPitch: 'SkyPitch',
  horizonGlide: 'Horizon Glide',
  orbitControl: 'Orbit Control',
  gravityBend: 'Gravity Bend',
  thereminFlow: 'Theremin Flow'
};

export function angleDelta(current, anchor) {
  if (typeof current !== 'number' || typeof anchor !== 'number') return 0;
  let delta = current - anchor;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

export class MotionSensorController {
  constructor() {
    this.orientation = { alpha: 0, beta: 0, gamma: 0 };
    this.motion = { x: 0, y: 0, z: 0, rotationAlpha: 0, rotationBeta: 0, rotationGamma: 0 };
    this.supported = typeof window !== 'undefined' && ('DeviceOrientationEvent' in window || 'DeviceMotionEvent' in window);
    this.secureContext = typeof window !== 'undefined' ? Boolean(window.isSecureContext) : false;
    this.active = false;
    this.permissionRequired = typeof window !== 'undefined'
      && (
        (typeof window.DeviceOrientationEvent !== 'undefined'
          && typeof window.DeviceOrientationEvent.requestPermission === 'function')
        || (typeof window.DeviceMotionEvent !== 'undefined'
          && typeof window.DeviceMotionEvent.requestPermission === 'function')
      );
    this.lastOrientationTs = 0;
    this.lastMotionTs = 0;
    this.boundOrientation = this.handleOrientation.bind(this);
    this.boundAbsoluteOrientation = this.handleOrientation.bind(this);
    this.boundMotion = this.handleMotion.bind(this);
  }

  async requestPermission() {
    if (!this.secureContext) {
      return {
        granted: false,
        reason: 'Motion sensors need HTTPS or localhost. A local IP like 192.168.x.x is treated as insecure by mobile browsers.'
      };
    }

    if (!this.permissionRequired) {
      this.start();
      return { granted: true, reason: '' };
    }

    try {
      const orientationRequest = (typeof window.DeviceOrientationEvent !== 'undefined'
        && typeof window.DeviceOrientationEvent.requestPermission === 'function')
        ? window.DeviceOrientationEvent.requestPermission()
        : Promise.resolve('granted');
      const motionRequest = (typeof window.DeviceMotionEvent !== 'undefined'
        && typeof window.DeviceMotionEvent.requestPermission === 'function')
        ? window.DeviceMotionEvent.requestPermission()
        : Promise.resolve('granted');
      const [orientationResult, motionResult] = await Promise.allSettled([orientationRequest, motionRequest]);
      const orientationPermission = orientationResult.status === 'fulfilled' ? orientationResult.value : 'denied';
      const motionPermission = motionResult.status === 'fulfilled' ? motionResult.value : 'denied';
      const granted = orientationPermission === 'granted' && motionPermission === 'granted';
      if (granted) {
        this.start();
        return { granted: true, reason: '' };
      }
      return {
        granted: false,
        reason: 'Motion permission was not granted by the browser.'
      };
    } catch (error) {
      return {
        granted: false,
        reason: error?.message || 'Motion permission request failed.'
      };
    }
  }

  start() {
    if (!this.supported || this.active) return;
    window.addEventListener('deviceorientation', this.boundOrientation, { passive: true });
    window.addEventListener('deviceorientationabsolute', this.boundAbsoluteOrientation, { passive: true });
    window.addEventListener('devicemotion', this.boundMotion, { passive: true });
    this.active = true;
  }

  stop() {
    if (!this.active) return;
    window.removeEventListener('deviceorientation', this.boundOrientation);
    window.removeEventListener('deviceorientationabsolute', this.boundAbsoluteOrientation);
    window.removeEventListener('devicemotion', this.boundMotion);
    this.active = false;
  }

  handleOrientation(event) {
    this.lastOrientationTs = performance.now();
    this.orientation = {
      alpha: typeof event.alpha === 'number' ? event.alpha : this.orientation.alpha,
      beta: typeof event.beta === 'number' ? event.beta : this.orientation.beta,
      gamma: typeof event.gamma === 'number' ? event.gamma : this.orientation.gamma
    };
  }

  handleMotion(event) {
    this.lastMotionTs = performance.now();
    const acc = event.accelerationIncludingGravity || event.acceleration || {};
    const rot = event.rotationRate || {};
    this.motion = {
      x: typeof acc.x === 'number' ? acc.x : this.motion.x,
      y: typeof acc.y === 'number' ? acc.y : this.motion.y,
      z: typeof acc.z === 'number' ? acc.z : this.motion.z,
      rotationAlpha: typeof rot.alpha === 'number' ? rot.alpha : this.motion.rotationAlpha,
      rotationBeta: typeof rot.beta === 'number' ? rot.beta : this.motion.rotationBeta,
      rotationGamma: typeof rot.gamma === 'number' ? rot.gamma : this.motion.rotationGamma
    };
  }

  getSnapshot() {
    return {
      orientation: { ...this.orientation },
      motion: { ...this.motion },
      supported: this.supported,
      active: this.active,
      secureContext: this.secureContext,
      hasRecentOrientation: (performance.now() - this.lastOrientationTs) < 1500,
      hasRecentMotion: (performance.now() - this.lastMotionTs) < 1500
    };
  }

  hasRecentSignal() {
    const now = performance.now();
    return (now - this.lastOrientationTs) < 1500 || (now - this.lastMotionTs) < 1500;
  }
}

export function computeMotionResponse({
  mode,
  anchorFrame,
  sensorSnapshot,
  pointerState,
  keyboardOffset,
  sensitivity,
  pitchRange
}) {
  const orientation = sensorSnapshot?.orientation || { alpha: 0, beta: 0, gamma: 0 };
  const motion = sensorSnapshot?.motion || { rotationAlpha: 0, rotationBeta: 0, rotationGamma: 0 };
  const anchor = anchorFrame || { alpha: 0, beta: 0, gamma: 0 };
  const hasRecentOrientation = Boolean(sensorSnapshot?.hasRecentOrientation);
  const hasRecentMotion = Boolean(sensorSnapshot?.hasRecentMotion);
  const accelX = clamp((motion.x || 0) / 9.81, -1.4, 1.4);
  const accelY = clamp((motion.y || 0) / 9.81, -1.4, 1.4);
  const accelZ = clamp((motion.z || 0) / 9.81, -1.4, 1.4);

  const betaDeltaOrientation = clamp((orientation.beta - anchor.beta) / 40, -1.4, 1.4);
  const gammaDeltaOrientation = clamp((orientation.gamma - anchor.gamma) / 38, -1.4, 1.4);
  const alphaDeltaOrientation = clamp(angleDelta(orientation.alpha, anchor.alpha) / 70, -1.4, 1.4);
  const betaDelta = hasRecentOrientation ? betaDeltaOrientation : accelY;
  const gammaDelta = hasRecentOrientation ? gammaDeltaOrientation : accelX;
  const alphaDelta = hasRecentOrientation ? alphaDeltaOrientation : accelZ * 0.8;
  const spin = clamp((motion.rotationGamma || motion.rotationAlpha || 0) / 90, -1.3, 1.3);

  const pointerX = pointerState?.active ? pointerState.x : 0;
  const pointerY = pointerState?.active ? pointerState.y : 0;
  const hasMotion = hasRecentOrientation || hasRecentMotion;
  const hasPointer = Boolean(pointerState?.active);
  const baseMultiplier = sensitivity * pitchRange;

  let semitoneOffset = keyboardOffset || 0;
  let vibratoCents = 0;
  let brightness = 0.5;
  let vector = { x: gammaDelta, y: betaDelta, z: alphaDelta };

  switch (mode) {
    case 'skyPitch':
      semitoneOffset += (-betaDelta * baseMultiplier) + (pointerY * baseMultiplier * -0.8);
      vibratoCents = Math.abs(spin) * 18;
      brightness = clamp(0.35 + Math.abs(betaDelta) * 0.45, 0.2, 1);
      break;
    case 'horizonGlide':
      semitoneOffset += (gammaDelta * baseMultiplier) + (pointerX * baseMultiplier);
      vibratoCents = Math.abs(pointerY) * 10 + Math.abs(spin) * 8;
      brightness = clamp(0.3 + Math.abs(gammaDelta) * 0.5, 0.2, 1);
      break;
    case 'orbitControl':
      semitoneOffset += (alphaDelta * baseMultiplier * 0.8) + (pointerX * baseMultiplier * 0.5);
      vibratoCents = Math.abs(spin) * 22;
      brightness = clamp(0.45 + Math.abs(alphaDelta) * 0.3, 0.2, 1);
      break;
    case 'gravityBend': {
      const compositeTilt = clamp((-betaDelta * 0.72) + (gammaDelta * 0.46), -1.4, 1.4);
      semitoneOffset += compositeTilt * baseMultiplier;
      vibratoCents = Math.abs(spin) * 12;
      brightness = clamp(0.25 + Math.abs(compositeTilt) * 0.52, 0.2, 1);
      break;
    }
    case 'thereminFlow':
    default:
      semitoneOffset += (gammaDelta * baseMultiplier * 0.82) + (-betaDelta * baseMultiplier * 0.26) + (pointerX * baseMultiplier * 0.8);
      vibratoCents = (Math.abs(alphaDelta) * 12) + (Math.abs(pointerY) * 14) + (Math.abs(spin) * 10);
      brightness = clamp(0.32 + Math.abs(betaDelta) * 0.24 + Math.abs(gammaDelta) * 0.38, 0.2, 1);
      break;
  }

  const source = hasMotion
    ? 'Motion'
    : hasPointer
      ? 'Touch / Mouse'
      : Math.abs(keyboardOffset || 0) > 0.001
        ? 'Keyboard'
        : 'Ready';

  return {
    semitoneOffset: clamp(semitoneOffset, -pitchRange, pitchRange),
    vibratoCents,
    brightness,
    source,
    vector
  };
}
