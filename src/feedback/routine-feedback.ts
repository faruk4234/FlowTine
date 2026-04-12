import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export type RoutineCue = 'incoming' | 'start' | 'stepComplete' | 'complete' | 'pause' | 'resume';

const SOURCES: Record<RoutineCue, number> = {
  incoming: require('@/assets/sounds/get-ready.wav'),
  start: require('@/assets/sounds/go.wav'),
  stepComplete: require('@/assets/sounds/step-complete.wav'),
  complete: require('@/assets/sounds/all-done.wav'),
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

/**
 * Preloads cue sounds once per session. Safe to call multiple times.
 * Reuses Sound instances — does not allocate per cue fire.
 */
export class RoutineFeedbackController {
  private sounds: Partial<Record<RoutineCue, Audio.Sound>> = {};
  private loadPromise: Promise<void> | null = null;

  preload(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      await ensureAudioMode();
      const entries = Object.entries(SOURCES) as [RoutineCue, number][];
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

  /** Stops any playing cue and resets positions (no unload). */
  private async stopOthers(except: RoutineCue): Promise<void> {
    for (const [cue, s] of Object.entries(this.sounds) as [RoutineCue, Audio.Sound][]) {
      if (!s || cue === except) continue;
      try {
        await s.stopAsync();
        await s.setPositionAsync(0);
      } catch {
        // ignore
      }
    }
  }

  private async playSound(cue: RoutineCue): Promise<void> {
    await this.preload();
    const sound = this.sounds[cue];
    if (!sound) return;
    await this.stopOthers(cue);
    await sound.setPositionAsync(0);
    await sound.playAsync();
  }

  /** 1–2 s before next segment — light impact + incoming tone. */
  async playIncoming(soundsOn: boolean): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!soundsOn) return;
    await this.playSound('incoming');
  }

  /** Segment start — medium impact + start tone. */
  async playStart(soundsOn: boolean): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!soundsOn) return;
    await this.playSound('start');
  }

  /** Work phase finished — success haptic + step tone. */
  async playStepComplete(soundsOn: boolean): Promise<void> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!soundsOn) return;
    await this.playSound('stepComplete');
  }

  /** Routine finished — stronger emphasis + complete tone (after last step cue). */
  async playRoutineComplete(soundsOn: boolean): Promise<void> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await new Promise((r) => setTimeout(r, 85));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (!soundsOn) return;
    await new Promise((r) => setTimeout(r, 300));
    await this.playSound('complete');
  }

  /** User paused — softer haptic + pause tone. */
  async playPause(feedbackEnabled: boolean): Promise<void> {
    if (!feedbackEnabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await this.playSound('pause');
  }

  /** User resumed — slightly stronger haptic + resume tone. */
  async playResume(feedbackEnabled: boolean): Promise<void> {
    if (!feedbackEnabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await this.playSound('resume');
  }

  /** Bridge method for transport preloading. */
  async preloadTransport(): Promise<void> {
    return this.preload();
  }

  async unload(): Promise<void> {
    for (const s of Object.values(this.sounds)) {
      try {
        await s?.unloadAsync();
      } catch {
        // ignore
      }
    }
    this.sounds = {};
    this.loadPromise = null;
  }
}

export const routineFeedback = new RoutineFeedbackController();
