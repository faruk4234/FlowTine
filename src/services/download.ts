import * as FileSystem from 'expo-file-system/legacy';
import { Track } from '@/src/state/atoms';

class DownloadService {
  private getLocalPath(trackId: string): string {
    return `${FileSystem.documentDirectory}track_${trackId}.mp3`;
  }

  async checkLocalFile(trackId: string): Promise<string | null> {
    try {
      const path = this.getLocalPath(trackId);
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists && !info.isDirectory && (info as any).size > 0) {
        return info.uri;
      }
    } catch (e) {
      console.warn(`⚠️ [DownloadService] Failed to check local file for ${trackId}:`, e);
    }
    return null;
  }

  async downloadTrack(track: Track): Promise<string | null> {
    const trackId = track._id || track.id;
    if (!trackId) return null;

    // 1. Check if already downloaded locally
    const existingUri = await this.checkLocalFile(trackId);
    if (existingUri) {
      console.log(`✅ [DownloadService] Track ${trackId} already available locally at:`, existingUri);
      return existingUri;
    }

    const remoteUrl = track.fileUrl || track.url;
    if (!remoteUrl) {
      console.warn(`⚠️ [DownloadService] Cannot download track ${trackId}: No remote URL available.`);
      return null;
    }

    try {
      const targetPath = this.getLocalPath(trackId);
      console.log(`⬇️ [DownloadService] Downloading track ${track.title} (${trackId}) from ${remoteUrl}...`);
      const downloadRes = await FileSystem.downloadAsync(remoteUrl, targetPath);
      
      if (downloadRes && downloadRes.status === 200) {
        console.log(`🎉 [DownloadService] Downloaded track ${trackId} to local storage:`, downloadRes.uri);
        return downloadRes.uri;
      } else {
        console.warn(`⚠️ [DownloadService] Download failed with status:`, downloadRes?.status);
      }
    } catch (e) {
      console.error(`❌ [DownloadService] Download error for track ${trackId}:`, e);
    }
    return null;
  }

  async deleteLocalFile(trackId: string): Promise<void> {
    try {
      const path = this.getLocalPath(trackId);
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        console.log(`🗑️ [DownloadService] Removing local file for track ${trackId}...`);
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    } catch (e) {
      console.warn(`⚠️ [DownloadService] Failed to delete local file for ${trackId}:`, e);
    }
  }
}

export const downloadService = new DownloadService();
