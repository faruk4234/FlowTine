import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAtom, useSetAtom } from "jotai";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionButton, Header, InspireButton, RowSelector, SegmentedControl } from "@/src/components";
import { useAlert } from "@/src/providers/alert-provider";
import { apiService } from "@/src/services/api";
import {
    libraryTabAtom,
    promptOrLyricsTypeAtom,
    selectedGenreAtom,
    selectedMoodAtom,
    selectedVoiceAtom,
    textInputAtom,
    userAtom,
} from "@/src/state/atoms";
import { BorderRadius, Spacing, useAppTheme } from "@/src/state/theme";

const { height } = Dimensions.get("window");

const GENRES = [
    { id: "house", label: "House", icon: "pulse" },
    { id: "pop", label: "Pop", icon: "musical-note" },
    { id: "rock", label: "Rock", icon: "flash" },
    { id: "hiphop", label: "Hip-Hop", icon: "mic" },
    { id: "electronic", label: "Electronic", icon: "sparkles" },
    { id: "lofi", label: "Lo-Fi", icon: "cafe" },
    { id: "jazz", label: "Jazz", icon: "color-palette" },
];

const VOICES = [
    { id: "female", label: "Female" },
    { id: "male", label: "Male" },
    { id: "instrumental", label: "Instrumental" },
];

const MOODS = ["Energetic", "Chill", "Melancholy", "Happy", "Dark", "Dreamy", "Mysterious"];

async function checkOnline(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('https://clients3.google.com/generate_204', {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-store',
        }).catch(async () => {
            return await fetch('http://localhost:3000', { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
        });
        clearTimeout(id);
        return res ? (res.status === 204 || res.ok || res.status === 404 || res.status === 200) : false;
    } catch (e) {
        return false;
    }
}

export default function CreateScreen() {
    const theme = useAppTheme();
    const router = useRouter();

    const [user, setUser] = useAtom(userAtom);
    const [selectedGenre, setSelectedGenre] = useAtom(selectedGenreAtom);
    const [selectedVoice, setSelectedVoice] = useAtom(selectedVoiceAtom);
    const [selectedMood, setSelectedMood] = useAtom(selectedMoodAtom);
    const [promptType, setPromptType] = useAtom(promptOrLyricsTypeAtom);
    const [textInput, setTextInput] = useAtom(textInputAtom);
    const setLibraryTab = useSetAtom(libraryTabAtom);
    const { showAlert } = useAlert();

    const [generating, setGenerating] = useState(false);
    const [activePicker, setActivePicker] = useState<"genre" | "voice" | "mood" | null>(null);

    // Set defaults on mount if empty
    React.useEffect(() => {
        if (!selectedGenre) setSelectedGenre("house");
        if (!selectedVoice) setSelectedVoice("female");
        if (!selectedMood) setSelectedMood("Energetic");
    }, [selectedGenre, selectedVoice, selectedMood, setSelectedGenre, setSelectedVoice, setSelectedMood]);

    const handleZeroCredits = () => {
        const isPrem = user?.isPremium || (user?.limits?.premiumCredit !== undefined && user?.limits?.premiumCredit > 0);
        if (isPrem) {
            router.push("/tabs/profile?openCredits=true");
        } else {
            router.push("/paywall?type=credits");
        }
    };

    const handleGenerate = async () => {
        const isOnline = await checkOnline();
        if (!isOnline) {
            showAlert(
                "No Connection 📡",
                "You seem to be offline. Please check your internet connection.",
                [
                    {
                        text: "Try Again",
                        onPress: () => {
                            setTimeout(() => {
                                handleGenerate();
                            }, 300);
                        },
                    },
                    {
                        text: "Cancel",
                        style: "cancel",
                    },
                ]
            );
            return;
        }

        if (!selectedGenre) {
            showAlert("Select Genre", "Please pick a musical genre first.");
            return;
        }
        if (!selectedVoice) {
            showAlert("Select Voice", "Please select a vocal or instrumental style.");
            return;
        }
        if (!textInput.trim()) {
            showAlert("Input Required", "Please write a prompt describing your song.");
            return;
        }

        const totalCredits = (user?.limits?.credit ?? 0) + (user?.limits?.premiumCredit ?? 0);
        if (totalCredits <= 0) {
            handleZeroCredits();
            return;
        }

        setGenerating(true);
        try {
            const response = await apiService.generateMusic({
                genre: selectedGenre,
                voice: selectedVoice,
                prompt: textInput.trim(),
                type: promptType,
            });

            let updatedUser = response.user ? JSON.parse(JSON.stringify(response.user)) : (user ? JSON.parse(JSON.stringify(user)) : null);
            if (updatedUser && user) {
                const prevTotal = (user.limits?.credit ?? 0) + (user.limits?.premiumCredit ?? 0);
                const newTotal = (updatedUser.limits?.credit ?? 0) + (updatedUser.limits?.premiumCredit ?? 0);
                if (newTotal >= prevTotal && prevTotal > 0) {
                    if ((updatedUser.limits?.premiumCredit || 0) > 0) {
                        updatedUser.limits.premiumCredit -= 1;
                    } else if ((updatedUser.limits?.credit || 0) > 0) {
                        updatedUser.limits.credit -= 1;
                    }
                }
            }
            if (updatedUser) {
                setUser(updatedUser);
            }
            setTextInput("");

            const remainingCredits = (updatedUser?.limits?.credit ?? 0) + (updatedUser?.limits?.premiumCredit ?? 0);
            if (remainingCredits <= 0) {
                setTimeout(() => {
                    handleZeroCredits();
                }, 1000);
                return;
            }

            setLibraryTab("songs");
            router.push("/tabs/library?tab=songs");
            showAlert("Track Generating ⏳", `"${response?.song?.title || 'Your track'}" is being created! It will appear in your library when ready.`);
        } catch (e) {
            console.error("Music generation failed:", e);
            showAlert("Generation Failed", "Could not build track. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    const getGenreLabel = () => {
        const found = GENRES.find((g) => g.id === selectedGenre);
        return found ? found.label : "Select";
    };

    const getVoiceLabel = () => {
        const found = VOICES.find((v) => v.id === selectedVoice);
        return found ? found.label : "Select";
    };

    return (
        <View style={[s.root, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
            <SafeAreaView style={s.safe} edges={["top"]}>
                <Header title="Create Music" />
                <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* 1. Genre Row Selector */}
                    <RowSelector
                        icon="musical-notes"
                        label="Genre"
                        value={getGenreLabel()}
                        onPress={() => setActivePicker("genre")}
                    />

                    {/* 2. Voice Row Selector */}
                    <RowSelector
                        icon="mic"
                        label="Voice"
                        value={getVoiceLabel()}
                        onPress={() => setActivePicker("voice")}
                    />

                    {/* 3. Text Prompt Area Card */}
                    <View style={[s.textCard, { backgroundColor: theme.colors.surface }]}>
                        <SegmentedControl
                            options={[
                                { id: "prompt", label: "Prompt", icon: "pencil" },
                                { id: "lyrics", label: "Lyrics", icon: "document-text" },
                            ]}
                            selectedId={promptType}
                            onSelect={(id) => setPromptType(id as any)}
                            height={38}
                            style={{ marginBottom: 12 }}
                        />

                        <View style={s.textCardHeader}>
                            <TextInput
                                style={[s.textInput, { color: theme.colors.text, marginBottom: 30 }]}
                                placeholder={promptType === 'prompt' ? "Describe the style, instruments, or topic..." : "Paste or type your custom lyrics..."}
                                placeholderTextColor={theme.colors.mutedText}
                                multiline
                                scrollEnabled={true}
                                maxLength={1000}
                                value={textInput}
                                onChangeText={setTextInput}
                            />
                            {textInput.length > 0 && (
                                <TouchableOpacity
                                    style={[s.clearBtnAbsolute, { backgroundColor: theme.colors.surfaceElevated }]}
                                    onPress={() => setTextInput("")}
                                >
                                    <Ionicons name="close" size={14} color={theme.colors.text} />
                                </TouchableOpacity>
                            )}
                            <View style={{ backgroundColor: 'red' }}>
                                {promptType === 'prompt' && (
                                    <View style={s.inspireBtnAbsolute}>
                                        <InspireButton setPromptText={setTextInput} />
                                    </View>
                                )}
                                <Text style={[s.charCountAbsolute, { color: theme.colors.mutedText }]}>
                                    {textInput.length} chars
                                </Text>
                            </View>
                        </View>

                        {/* Inner progress loader */}
                        {generating && (
                            <View style={[s.innerLoader, { backgroundColor: theme.colors.surfaceElevated }]}>
                                <ActivityIndicator size="small" color={theme.colors.primary} style={s.spinner} />
                                <Text style={[s.loaderText, { color: theme.colors.text }]}>Analyzing Your Text...</Text>
                            </View>
                        )}
                    </View>

                    {/* 4. Customize Row Selector */}
                    <RowSelector
                        icon="options-outline"
                        label="Customize"
                        value={selectedMood || "Select"}
                        primaryValue={false}
                        onPress={() => setActivePicker("mood")}
                    />

                    <ActionButton
                        title="Generate Song"
                        onPress={handleGenerate}
                        loading={generating}
                        style={{ marginTop: Spacing.lg }}
                    />
                </ScrollView>

                {/* ──────── Pickers Bottom Sheets ──────── */}
                <Modal
                    visible={activePicker !== null}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setActivePicker(null)}
                >
                    <TouchableOpacity
                        style={s.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setActivePicker(null)}
                    >
                        <View style={[s.modalContent, { backgroundColor: theme.colors.surface }]}>
                            <View style={s.modalHeader}>
                                <Text style={[s.modalTitle, { color: theme.colors.text }]}>
                                    {activePicker === "genre" && "Select Genre"}
                                    {activePicker === "voice" && "Select Vocal Style"}
                                    {activePicker === "mood" && "Select Vibe"}
                                </Text>
                                <TouchableOpacity onPress={() => setActivePicker(null)}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.pickerList}>
                                {activePicker === "genre" &&
                                    GENRES.map((g) => {
                                        const isSel = selectedGenre === g.id;
                                        return (
                                            <TouchableOpacity
                                                key={g.id}
                                                style={[s.pickerRow, isSel && { backgroundColor: theme.colors.surfaceElevated }]}
                                                onPress={() => {
                                                    setSelectedGenre(g.id);
                                                    setActivePicker(null);
                                                }}
                                            >
                                                <Ionicons name={g.icon as any} size={18} color={isSel ? theme.colors.primary : theme.colors.mutedText} />
                                                <Text style={[s.pickerRowText, { color: theme.colors.text }, isSel && { color: theme.colors.primary, fontWeight: '700' }]}>
                                                    {g.label}
                                                </Text>
                                                {isSel && <Ionicons name="checkmark" size={18} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />}
                                            </TouchableOpacity>
                                        );
                                    })}

                                {activePicker === "voice" &&
                                    VOICES.map((v) => {
                                        const isSel = selectedVoice === v.id;
                                        return (
                                            <TouchableOpacity
                                                key={v.id}
                                                style={[s.pickerRow, isSel && { backgroundColor: theme.colors.surfaceElevated }]}
                                                onPress={() => {
                                                    setSelectedVoice(v.id as any);
                                                    setActivePicker(null);
                                                }}
                                            >
                                                <Ionicons name={v.id === "instrumental" ? "musical-note" : "mic"} size={18} color={isSel ? theme.colors.primary : theme.colors.mutedText} />
                                                <Text style={[s.pickerRowText, { color: theme.colors.text }, isSel && { color: theme.colors.primary, fontWeight: '700' }]}>
                                                    {v.label}
                                                </Text>
                                                {isSel && <Ionicons name="checkmark" size={18} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />}
                                            </TouchableOpacity>
                                        );
                                    })}

                                {activePicker === "mood" &&
                                    MOODS.map((m) => {
                                        const isSel = selectedMood === m;
                                        return (
                                            <TouchableOpacity
                                                key={m}
                                                style={[s.pickerRow, isSel && { backgroundColor: theme.colors.surfaceElevated }]}
                                                onPress={() => {
                                                    setSelectedMood(m);
                                                    setActivePicker(null);
                                                }}
                                            >
                                                <Ionicons name="sparkles-outline" size={18} color={isSel ? theme.colors.primary : theme.colors.mutedText} />
                                                <Text style={[s.pickerRowText, { color: theme.colors.text }, isSel && { color: theme.colors.primary, fontWeight: '700' }]}>
                                                    {m}
                                                </Text>
                                                {isSel && <Ionicons name="checkmark" size={18} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    scrollContent: {
        paddingHorizontal: Spacing.screenHorizontal,
        paddingTop: Spacing.md,
        paddingBottom: 120, // Pad for floating player
        gap: Spacing.md,
    },

    rowCard: {
        flexDirection: "row",
        height: 56,
        borderRadius: BorderRadius.md,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "space-between",
    },
    rowLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: "600",
    },
    rowRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    rowValue: {
        fontSize: 15,
        fontWeight: "700",
    },
    rowValueMuted: {
        fontSize: 15,
        fontWeight: "600",
    },

    textCard: {
        borderRadius: BorderRadius.md,
        padding: 16,
        justifyContent: "space-between",
    },
    textCardHeader: {
        position: 'relative',
        padding: 12,
    },
    textInput: {
        height: 155,
        maxHeight: 155,
        fontSize: 15,
        textAlignVertical: "top",
        lineHeight: 22,
        paddingBottom: 24,
    },
    charCountAbsolute: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        fontSize: 11,
        fontWeight: '600',
    },
    clearBtnAbsolute: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    inspireBtnAbsolute: {
        position: 'absolute',
        bottom: 12,
        left: 12,
    },
    innerLoader: {
        flexDirection: "row",
        height: 38,
        borderRadius: BorderRadius.sm,
        alignItems: "center",
        paddingHorizontal: 12,
        gap: 8,
        marginTop: 12,
        alignSelf: "flex-start",
    },
    spinner: {
        marginRight: 2,
    },
    loaderText: {
        fontSize: 13,
        fontWeight: "600",
    },
    generateBtn: {
        height: 58,
        borderRadius: BorderRadius.round,
        justifyContent: "center",
        alignItems: "center",
        marginTop: Spacing.lg,
        shadowColor: "#00FFA3",
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    generateBtnText: {
        fontSize: 16,
        fontWeight: "800",
        color: "#050D0A", // Bold black text
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "flex-end",
    },
    modalContent: {
        borderTopLeftRadius: BorderRadius.lg,
        borderTopRightRadius: BorderRadius.lg,
        maxHeight: height * 0.6,
        padding: Spacing.md + 4,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.lg,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "800",
    },
    pickerList: {
        paddingBottom: Spacing.xl,
        gap: 4,
    },
    pickerRow: {
        flexDirection: "row",
        height: 48,
        alignItems: "center",
        paddingHorizontal: 12,
        borderRadius: BorderRadius.sm,
        gap: 12,
    },
    pickerRowText: {
        fontSize: 15,
        fontWeight: "600",
    },
});
