/**
 * Audio Recording and 16-bit PCM WAV Base64 Encoder
 * Compatible with search_products_from_voice_tool MCP specifications
 */

export interface VoiceRecordingSession {
  stop: () => Promise<{ base64: string; durationMs: number }>;
  cancel: () => void;
}

/**
 * Encodes Float32 PCM samples into a standard 16-bit PCM WAV ArrayBuffer.
 * Produces standard RIFF/WAVE header starting with 'RIFF....WAVEfmt '
 * which encodes in Base64 as 'UklGR...'
 */
export function encodeWAV(samples: Float32Array, sampleRate: number = 16000): ArrayBuffer {
  const numSamples = samples.length;
  const numChannels = 1; // Mono
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(8, 'WAVE');

  // fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels (1)
  view.setUint32(24, sampleRate, true); // SampleRate (16000)
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign (2)
  view.setUint16(34, 16, true); // BitsPerSample (16)

  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Safely converts an ArrayBuffer to a Base64 string without stack overflow
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Downsamples Float32 audio samples from inputRate to outputRate
 */
function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number = 16000): Float32Array {
  if (outputRate === inputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

export interface StartRecordingOptions {
  silenceTimeoutMs?: number; // e.g. 2000ms (2 second gap)
  silenceThreshold?: number; // RMS threshold (default 0.012)
  onSilenceDetected?: () => void;
  onVolumeChange?: (volume: number) => void;
}

/**
 * Starts recording audio from the user's microphone.
 * Supports automatic 2-second silence detection as well as manual button stopping.
 * Returns a session object with `stop()` and `cancel()`.
 */
export async function startVoiceRecording(options?: StartRecordingOptions): Promise<VoiceRecordingSession> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone is not supported in this browser environment.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContextClass();
  const source = audioContext.createMediaStreamSource(stream);

  // Buffer size 4096, 1 input channel, 1 output channel
  const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
  const audioChunks: Float32Array[] = [];
  const startTime = Date.now();

  let hasSpoken = false;
  let lastSpokenTime = Date.now();
  let silenceTriggered = false;
  const threshold = options?.silenceThreshold ?? 0.012;
  const silenceTimeout = options?.silenceTimeoutMs ?? 2000; // 2 seconds default

  scriptProcessor.onaudioprocess = (e) => {
    const channelData = e.inputBuffer.getChannelData(0);
    audioChunks.push(new Float32Array(channelData));

    // Calculate RMS volume level
    let sumSquares = 0;
    for (let i = 0; i < channelData.length; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sumSquares / channelData.length);
    if (options?.onVolumeChange) {
      options.onVolumeChange(rms);
    }

    // Voice Activity & 2-Second Silence Detection
    if (rms > threshold) {
      hasSpoken = true;
      lastSpokenTime = Date.now();
    } else if (hasSpoken && !silenceTriggered && !isStopped) {
      const silentDuration = Date.now() - lastSpokenTime;
      // If user spoke and then paused for 2 seconds (after at least 1.2s total recording)
      if (silentDuration >= silenceTimeout && Date.now() - startTime >= 1200) {
        silenceTriggered = true;
        if (options?.onSilenceDetected) {
          options.onSilenceDetected();
        }
      }
    }
  };

  source.connect(scriptProcessor);

  // Muted gain node to keep processor active without speaker feedback
  const muteGain = audioContext.createGain();
  muteGain.gain.value = 0;
  scriptProcessor.connect(muteGain);
  muteGain.connect(audioContext.destination);

  let isStopped = false;

  const cleanup = () => {
    isStopped = true;
    try {
      scriptProcessor.disconnect();
      source.disconnect();
      muteGain.disconnect();
    } catch {}
    try {
      stream.getTracks().forEach((track) => track.stop());
    } catch {}
    try {
      audioContext.close();
    } catch {}
  };

  return {
    stop: async () => {
      if (isStopped) {
        throw new Error('Recording has already stopped.');
      }
      const durationMs = Date.now() - startTime;
      cleanup();

      // Merge collected Float32 chunks
      let totalSamples = 0;
      for (const chunk of audioChunks) {
        totalSamples += chunk.length;
      }

      if (totalSamples === 0) {
        throw new Error('No audio captured. Please check microphone.');
      }

      const merged = new Float32Array(totalSamples);
      let offset = 0;
      for (const chunk of audioChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      // Resample to 16kHz for speech recognition
      const targetRate = 16000;
      const resampled = downsampleBuffer(merged, audioContext.sampleRate, targetRate);

      // Encode to 16-bit PCM WAV
      const wavBuffer = encodeWAV(resampled, targetRate);
      const base64 = arrayBufferToBase64(wavBuffer);

      return {
        base64,
        durationMs,
      };
    },
    cancel: () => {
      if (!isStopped) {
        cleanup();
      }
    },
  };
}
