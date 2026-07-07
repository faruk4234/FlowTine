import { Audio } from 'expo-av';

class AudioControllerService {
  private sound: Audio.Sound | null = null;

  setSound(s: Audio.Sound | null) {
    this.sound = s;
  }

  async seekTo(positionMillis: number) {
    if (this.sound) {
      try {
        await this.sound.setPositionAsync(positionMillis);
      } catch (e) {
        console.warn('⚠️ [AudioController] Seek failed:', e);
      }
    }
  }

  async seekBy(deltaMillis: number, currentPosition: number, duration: number) {
    if (this.sound) {
      try {
        const target = Math.max(0, Math.min(duration, currentPosition + deltaMillis));
        await this.sound.setPositionAsync(target);
      } catch (e) {
        console.warn('⚠️ [AudioController] Seek delta failed:', e);
      }
    }
  }
}

export const audioController = new AudioControllerService();
