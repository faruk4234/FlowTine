import {
  onboardingCompletedAtom,
} from "@/src/state/atoms";
import { Redirect } from "expo-router";
import { useAtomValue } from "jotai";

export default function Index() {
  const onboardingCompleted = useAtomValue(onboardingCompletedAtom);

  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/tabs/home" />;
}
