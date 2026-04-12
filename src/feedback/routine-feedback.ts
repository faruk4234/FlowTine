import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

/**
 * All bundled cues (replace files under assets/sounds/ anytime).
 * Playback is serialized: starting a cue stops any other loaded sound.
 */
type CueId =
  | 'pause'
  | 'resume'
  | 'incoming'
  | 'start'
  | 'stepComplete'
  | 'complete';

const SOURCES: Record<CueId, number> = {
  pause: require('@/assets/sounds/pause.wav'),
  resume: require('@/assets/sounds/resume.wav'),
  incoming: require('@/assets/sounds/get-ready.wav'),
  start: require('@/assets/sounds/go.wav'),
  stepComplete: require('@/assets/sounds/step-complete.wav'),
  complete: require('@/assets/sounds/all-done.wav'),
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
  private sounds: Partial<Record<CueId, Audio.Sound>> = {};
  private loadPromise: Promise<void> | null = null;

  /** Preloads all cue assets once per session. */
  preload(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      await ensureAudioMode();
      const entries = Object.entries(SOURCES) as [CueId, number][];
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

  private async stopOthers(except: CueId): Promise<void> {
    for (const [cue, s] of Object.entries(this.sounds) as [CueId, Audio.Sound][]) {
      if (!s || cue === except) continue;
      try {
        await s.stopAsync();
        await s.setPositionAsync(0);
      } catch {
        // ignore
      }
    }
  }

  private async playCueSound(cue: CueId): Promise<void> {
    await this.preload();
    const sound = this.sounds[cue];
    if (!sound) return;
    await this.stopOthers(cue);
    await sound.setPositionAsync(0);
    await sound.playAsync();
  }

  // ─── Pause / resume (Sound & Vibration setting gates both) ─────────────────

  async playPause(feedbackEnabled: boolean): Promise<void> {
    if (!feedbackEnabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await this.playCueSound('pause');
  }

  async playResume(feedbackEnabled: boolean): Promise<void> {
    if (!feedbackEnabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await this.playCueSound('resume');
  }

  // ─── Routine flow (haptics always; sounds gated by routineCueSoundsEnabled) ─

  async playIncoming(soundsOn: boolean): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!soundsOn) return;
    await this.playCueSound('incoming');
  }

  async playStart(soundsOn: boolean): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!soundsOn) return;
    await this.playCueSound('start');
  }

  async playStepComplete(soundsOn: boolean): Promise<void> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!soundsOn) return;
    await this.playCueSound('stepComplete');
  }

  async playRoutineComplete(soundsOn: boolean): Promise<void> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await new Promise((r) => setTimeout(r, 85));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (!soundsOn) return;
    await new Promise((r) => setTimeout(r, 300));
    await this.playCueSound('complete');
  }
}

export const routineFeedback = new RoutineFeedbackController();
