import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const C = {
  bg: '#0F1115',
  surface: '#1A1D23',
  text: '#F1F5F9',
  textMuted: '#9CA3AF',
  blue: '#3B82F6',
};

export default function LegalWebViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const urlRaw = params.url;
  const url = Array.isArray(urlRaw) ? urlRaw[0] : urlRaw;
  const titleRaw = params.title;
  const titleParam = Array.isArray(titleRaw) ? titleRaw[0] : titleRaw;
  const [loading, setLoading] = useState(true);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    if (!url || typeof url !== 'string') {
      router.back();
    }
  }, [url, router]);

  if (!url || typeof url !== 'string') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      </View>
    );
  }

  const headerTitle =
    typeof titleParam === 'string' && titleParam.length > 0
      ? titleParam
      : 'Document';

  return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="arrow-back" size={22} color={C.blue} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            <View style={styles.headerRight} />
          </View>

          <View style={styles.webWrap}>
            {loading ? (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color={C.blue} />
                <Text style={styles.loadingText}>Loading…</Text>
              </View>
            ) : null}
            <WebView
              source={{ uri: url }}
              style={styles.webview}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onHttpError={() => setLoading(false)}
              onError={() => setLoading(false)}
              startInLoadingState={false}
              originWhitelist={['*']}
            />
          </View>
        </SafeAreaView>
      </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: Platform.OS === 'android' ? 4 : 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2E38',
    backgroundColor: C.surface,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerRight: {
    width: 40,
  },
  webWrap: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,17,21,0.35)',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 10,
    color: C.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
