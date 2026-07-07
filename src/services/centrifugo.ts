import { Centrifuge } from 'centrifuge';
import { apiService } from './api';

type MusicReadyCallback = (data: any) => void;

class CentrifugoService {
  private centrifuge: Centrifuge | null = null;
  private subscription: any = null;
  private listeners: MusicReadyCallback[] = [];
  private isConnecting = false;

  async connect() {
    if (this.isConnecting || (this.centrifuge && this.centrifuge.state === 'connected')) {
      return;
    }
    this.isConnecting = true;
    try {
      // 1. Fetch socket token & channel from backend
      const res = await apiService.getSocketToken();
      if (!res || (!res.token && !res.access_token)) {
        console.log('⚡ [Centrifugo] No socket token available (mock mode or offline).');
        this.isConnecting = false;
        return;
      }

      const wsUrl = res.url || process.env.EXPO_PUBLIC_CENTRIFUGO_URL || 'ws://localhost:8000/connection/websocket';
      const token = res.token || res.access_token;
      const channel = res.channel || (res.user ? `user:${res.user._id || res.user.id}` : null) || 'music_updates';

      if (this.centrifuge) {
        this.centrifuge.disconnect();
      }

      this.centrifuge = new Centrifuge(wsUrl, {
        token: token,
      });

      this.centrifuge.on('connected', (ctx) => {
        console.log('⚡ [Centrifugo] Connected to real-time server:', ctx);
      });

      this.centrifuge.on('disconnected', (ctx) => {
        console.log('⚠️ [Centrifugo] Disconnected:', ctx);
      });

      if (channel) {
        this.subscription = this.centrifuge.newSubscription(channel);
        this.subscription.on('publication', (ctx: any) => {
          console.log('🎵 [Centrifugo] Real-time publication received on channel:', channel, ctx.data);
          this.notifyListeners(ctx.data);
        });
        this.subscription.subscribe();
      }

      this.centrifuge.connect();
    } catch (e) {
      console.warn('⚠️ [Centrifugo] Connection error:', e);
    } finally {
      this.isConnecting = false;
    }
  }

  onMusicReady(cb: MusicReadyCallback) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  // Allow simulation in dev/mock mode
  simulateMusicReady(songData: any) {
    console.log('⚡ [Centrifugo Mock] Simulating real-time publication for track:', songData?.title);
    this.notifyListeners({
      event: 'music_ready',
      status: 'done',
      track: songData,
    });
  }

  private notifyListeners(data: any) {
    this.listeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error('Error executing Centrifugo callback:', err);
      }
    });
  }

  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    if (this.centrifuge) {
      this.centrifuge.disconnect();
      this.centrifuge = null;
    }
  }
}

export const centrifugoService = new CentrifugoService();
