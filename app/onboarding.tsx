import { onboardingCompletedAtom } from "@/src/state/atoms";
import { AppPalette as C } from "@/src/state/colors";
import { useAppTheme } from "@/src/state/theme";
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
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const FEATURES = [
  {
    icon: "images-outline" as const,
    title: "Compress Photos & Videos",
    description: "Easily reduce the file size of your photos and videos.",
  },
  {
    icon: "resize-outline" as const,
    title: "Resize Media",
    description: "Change the dimensions of your media to fit any platform.",
  },
  {
    icon: "save-outline" as const,
    title: "Save Space",
    description:
      "Free up storage on your device without losing visual quality.",
  },
];

export default function OnboardingScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const setOnboardingCompleted = useSetAtom(onboardingCompletedAtom);

  const handleGetStarted = () => {
    setOnboardingCompleted(true);
    router.replace("../tabs");
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
            <Ionicons name="images" size={40} color={C.blue} />
          </View>
          <Text
            style={[styles.title, { color: C.text, ...theme.typography.hero }]}
          >
            Welcome to Minify
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: C.textMuted, ...theme.typography.bodyLarge },
            ]}
          >
            Compress & resize your media
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
                { ...theme.typography.heading, color: C.white },
              ]}
            >
              Get Started
            </Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={C.white}
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
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontWeight: "bold",
  },
});
