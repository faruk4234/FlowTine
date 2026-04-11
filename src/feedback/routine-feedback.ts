import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

/** Transport controls — calm, short cues; shared playback to avoid overlap. */
type TransportCue = 'pause' | 'resume';

const SOURCES: Record<TransportCue, number> = {
  pause: require('@/assets/sounds/pause.wav'),
  resume: require('@/assets/sounds/resume.wav'),
};

let audioModeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });
  audioModeReady = true;
}

export class RoutineFeedbackController {
  private sounds: Partial<Record<TransportCue, Audio.Sound>> = {};
  private loadPromise: Promise<void> | null = null;

  /** Preloads pause/resume assets once. */
  preloadTransport(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      await ensureAudioMode();
      const entries = Object.entries(SOURCES) as [TransportCue, number][];
      await Promise.all(
        entries.map(async ([cue, src]) => {
          const { sound } = await Audio.Sound.createAsync(src, {
            shouldPlay: false,
            isLooping: false,
          });
          this.sounds[cue] = sound;
        }),
      );
    })();
    return this.loadPromise;
  }

  private async stopOthers(except: TransportCue): Promise<void> {
    for (const [cue, s] of Object.entries(this.sounds) as [TransportCue, Audio.Sound][]) {
      if (!s || cue === except) continue;
      try {
        await s.stopAsync();
        await s.setPositionAsync(0);
      } catch {
        // ignore
      }
    }
  }

  private async playTransportSound(cue: TransportCue): Promise<void> {
    await this.preloadTransport();
    const sound = this.sounds[cue];
    if (!sound) return;
    await this.stopOthers(cue);
    await sound.setPositionAsync(0);
    await sound.playAsync();
  }

  /** User paused — softer haptic + pause tone when feedback enabled. */
  async playPause(feedbackEnabled: boolean): Promise<void> {
    if (!feedbackEnabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await this.playTransportSound('pause');
  }

  /** User resumed — slightly stronger haptic + resume tone when feedback enabled. */
  async playResume(feedbackEnabled: boolean): Promise<void> {
    if (!feedbackEnabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await this.playTransportSound('resume');
  }
}

export const routineFeedback = new RoutineFeedbackController();
