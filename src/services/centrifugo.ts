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

      console.log('⚡ [Centrifugo] Socket token response received:', JSON.stringify(res, null, 2));

      const wsUrl = res.wsUrl || res.url || process.env.EXPO_PUBLIC_CENTRIFUGO_URL || 'wss://websocket.cekolabs.com/connection/websocket';
      const token = res.token || res.access_token;
      const channel = res.channel || (res.user ? `user:${res.user._id || res.user.id}` : null) || 'music';

      if (this.centrifuge) {
        this.centrifuge.disconnect();
      }

      this.centrifuge = new Centrifuge(wsUrl, {
        token: token,
      });

      this.centrifuge.on('connected', (ctx) => {
        console.log('⚡ [Centrifugo] Connected to real-time WebSocket server:', ctx);
      });

      this.centrifuge.on('disconnected', (ctx) => {
        console.log('⚠️ [Centrifugo] Disconnected:', ctx);
      });

      // Listen for server-side subscription publications
      this.centrifuge.on('publication', (ctx: any) => {
        console.log('🎵 [Centrifugo] Server-side music publication received on channel:', ctx.channel, ctx.data);
        this.notifyListeners(ctx.data);
      });

      // Subscribe to client-side channels if specified
      const channelsToSub = res.channels || [channel, 'music'];
      for (const ch of new Set<string>(channelsToSub as string[])) {
        if (!ch || typeof ch !== 'string') continue;
        try {
          const sub = this.centrifuge.newSubscription(ch);
          sub.on('publication', (ctx: any) => {
            console.log('🎵 [Centrifugo] Client-side music publication received on channel:', ch, ctx.data);
            this.notifyListeners(ctx.data);
          });
          sub.subscribe();
        } catch (subErr) {
          console.warn('⚠️ [Centrifugo] Failed to subscribe to channel:', ch, subErr);
        }
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
