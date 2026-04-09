import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback } from 'react';
import { Alert, Linking, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import SettingRow from '@/src/components/SettiingRow';
import { LEGAL_URLS } from '@/src/legal/urls';
import {
    autoAdvanceEnabledAtom,
    countdownSoundEnabledAtom,
    isPremiumAtom,
    soundVibrationEnabledAtom
} from '@/src/state/atoms';
import { Spacing } from '@/src/state/theme';

// ─── Design tokens (Stitch Obsidian Kinetic) ─────────────────────────────────
const C = {
    bg: '#0F1115',
    surface: '#1A1D23',
    surfaceHigh: '#22262F',
    border: '#2A2E38',
    text: '#F1F5F9',
    textMuted: '#9CA3AF',
    textDim: '#64748B',
    blue: '#3B82F6',
    blueDim: 'rgba(59,130,246,0.15)',
    green: '#10B981',
};

export default function SettingsScreen() {
    const router = useRouter();

    const [soundVibration, setSoundVibration] = useAtom(soundVibrationEnabledAtom);
    const [autoAdvance, setAutoAdvance] = useAtom(autoAdvanceEnabledAtom);
    const [countdownSound, setCountdownSound] = useAtom(countdownSoundEnabledAtom);

    const isPremium = useAtomValue(isPremiumAtom);

    const handleUpgrade = () => {
        Alert.alert("Upgrade", "Open premium paywall...");
    };

    const handleSupport = () => {
        const body = `\n\n\n---\nPlatform: ${Platform.OS} ${Platform.Version}\nApp Version: 1.0.0`;
        const url = `mailto:support@cekolasbs.com?subject=Support Request&body=${encodeURIComponent(body)}`;
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open email client.'));
    };

    const openLegalUrl = useCallback(async (url: string) => {
        try {
            await WebBrowser.openBrowserAsync(url);
        } catch (e) {
            console.error('Failed to open legal URL:', e);
        }
    }, []);

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} />
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header Navbar */}
                <View style={styles.navBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="arrow-back" size={22} color={C.blue} />
                    </TouchableOpacity>
                    <Text style={styles.navTitle}>SETTINGS</Text>
                    <View style={{ width: 22 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Header Details */}
                    <Text style={styles.configLabel}>CONFIGURATION</Text>
                    <Text style={styles.pageTitle}>System Parameters</Text>

                    {/* Section: Account / Premium (Moved to Top) */}
                    <Text style={styles.sectionTitle}>ACCOUNT</Text>
                    <View style={styles.cardGroup}>
                        {!isPremium ? (
                            <SettingRow
                                icon="star-outline"
                                title="Upgrade to Pro"
                                subtitle="Unlock all kinetic premium features"
                                onPress={handleUpgrade}
                                isLink={true}
                            />
                        ) : (
                            <View style={[styles.settingRow, { opacity: 0.8 }]}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="checkmark-circle" size={20} color={C.green} />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={styles.rowTitle}>Pro Membership Active</Text>
                                    <Text style={styles.rowSubtitle}>Thanks for your support!</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Section: Timer Settings */}
                    <Text style={styles.sectionTitle}>TIMER SETTINGS</Text>
                    <View style={styles.cardGroup}>
                        <SettingRow
                            icon="volume-medium-outline"
                            title="Sound & Vibration"
                            subtitle="Tactile feedback and audio tones"
                            isSwitch={true}
                            switchValue={soundVibration}
                            onValueChange={setSoundVibration}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="play-forward-outline"
                            title="Auto-advance"
                            subtitle="Automatically start next routine step"
                            isSwitch={true}
                            switchValue={autoAdvance}
                            onValueChange={setAutoAdvance}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="timer-outline"
                            title="Countdown sound"
                            subtitle="Ticker sound during last 5 seconds"
                            isSwitch={true}
                            switchValue={countdownSound}
                            onValueChange={setCountdownSound}
                        />
                    </View>

                    {/* Section: Legal & Support */}
                    <Text style={styles.sectionTitle}>SUPPORT & LEGAL</Text>
                    <View style={styles.cardGroup}>
                        <SettingRow
                            icon="mail-outline"
                            title="Contact Support"
                            isLink={true}
                            onPress={handleSupport}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="document-text-outline"
                            title="Terms of Service"
                            isLink={true}
                            onPress={() => openLegalUrl(LEGAL_URLS.terms)}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="shield-checkmark-outline"
                            title="Privacy Policy"
                            isLink={true}
                            onPress={() => openLegalUrl(LEGAL_URLS.privacy)}
                        />
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.bg,
    },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.screenHorizontal,
        paddingTop: Platform.OS === 'android' ? 16 : 8,
        paddingBottom: 16,
    },
    backBtn: {},
    navTitle: {
        color: C.blue,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 60,
    },
    configLabel: {
        color: C.blue,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    pageTitle: {
        color: C.text,
        fontSize: 32,
        fontWeight: '800',
        lineHeight: 40,
        letterSpacing: -0.5,
        marginBottom: 40,
    },
    sectionTitle: {
        color: C.textMuted,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    cardGroup: {
        backgroundColor: C.surface,
        borderRadius: 16,
        marginBottom: 32,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    rowTitle: {
        color: C.text,
        fontSize: 16,
        fontWeight: '600',
    },
    rowSubtitle: {
        color: C.textDim,
        fontSize: 13,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: C.border,
        marginLeft: 68,
    },
});
