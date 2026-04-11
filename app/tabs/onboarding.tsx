import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSetAtom } from "jotai";
import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { onboardingCompletedAtom } from "@/src/state/atoms";
import { useAppTheme } from "@/src/state/theme";

const { width } = Dimensions.get("window");

// ─── Design tokens (Stitch Obsidian Kinetic) ─────────────────────────────────
const C = {
  bg: "#0F1115",
  surface: "#1A1D23",
  surfaceHigh: "#22262F",
  border: "#2A2E38",
  text: "#F1F5F9",
  textMuted: "#9CA3AF",
  textDim: "#64748B",
  blue: "#3B82F6",
  blueDim: "rgba(59,130,246,0.15)",
  green: "#10B981",
};
const FEATURES = [
  {
    icon: "add-circle-outline" as const,
    title: "Create Routine",
    description: "Build your own custom routines matching your lifestyle.",
  },
  {
    icon: "time-outline" as const,
    title: "Movements & Time",
    description: "Add routine movements or steps with precise time controls.",
  },
  {
    icon: "checkmark-circle-outline" as const,
    title: "Make It Easy",
    description:
      "Follow your routine seamlessly and effortlessly every single day.",
  },
];

export default function OnboardingScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const setOnboardingCompleted = useSetAtom(onboardingCompletedAtom);

  const handleGetStarted = () => {
    setOnboardingCompleted(true);
    router.replace("/tabs/home");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={styles.content}>
        {/* Header */}
        <Animated.View
          entering={FadeInUp.duration(800).springify()}
          style={styles.header}
        >
          <View style={[styles.iconContainer, { backgroundColor: C.blueDim }]}>
            <Ionicons name="sparkles" size={40} color={C.blue} />
          </View>
          <Text
            style={[styles.title, { color: C.text, ...theme.typography.hero }]}
          >
            Welcome to FlowTine
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: C.textMuted, ...theme.typography.bodyLarge },
            ]}
          >
            Master your daily flow
          </Text>
        </Animated.View>

        {/* Features List */}
        <View style={styles.featuresList}>
          {FEATURES.map((feature, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(200 + index * 200)
                .duration(600)
                .springify()}
              style={styles.featureItem}
            >
              <View
                style={[
                  styles.featureIconContainer,
                  { backgroundColor: C.surface },
                ]}
              >
                <Ionicons name={feature.icon} size={28} color={C.blue} />
              </View>
              <View style={styles.featureTextContainer}>
                <Text
                  style={[
                    styles.featureTitle,
                    { color: C.text, ...theme.typography.heading },
                  ]}
                >
                  {feature.title}
                </Text>
                <Text
                  style={[
                    styles.featureDescription,
                    { color: C.textMuted, ...theme.typography.bodyMedium },
                  ]}
                >
                  {feature.description}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Action Button */}
        <Animated.View
          entering={FadeInDown.delay(1000).duration(600).springify()}
          style={styles.actionContainer}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleGetStarted}
            style={[
              styles.button,
              { backgroundColor: C.blue, borderRadius: theme.borderRadius.lg },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                { ...theme.typography.heading, color: "#FFFFFF" },
              ]}
            >
              Get Started
            </Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color="#FFFFFF"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
  },
  featuresList: {
    flex: 1,
    justifyContent: "center",
    gap: 32,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    marginBottom: 4,
  },
  featureDescription: {
    lineHeight: 22,
  },
  actionContainer: {
    marginTop: "auto",
    paddingTop: 24,
  },
  button: {
    flexDirection: "row",
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontWeight: "bold",
  },
});
