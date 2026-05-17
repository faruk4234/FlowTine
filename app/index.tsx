import {
  onboardingCompletedAtom,
  seedDefaultRoutines,
} from "@/src/state/atoms";
import { Redirect } from "expo-router";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

export default function Index() {
  const onboardingCompleted = useAtomValue(onboardingCompletedAtom);

  useEffect(() => {
    seedDefaultRoutines();
  }, []);

  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/tabs/home" />;
}
