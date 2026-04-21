import {
  activeRoutineIdAtom,
  CATEGORY_ICONS,
  isPremiumAtom,
  routinesAtom,
  timerRunningAtom,
  timerSecondsAtom,
  type Movement,
  type Routine,
} from "@/src/state/atoms";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";

import MovementEditorModal from "@/src/components/MovementEditorModal";
import MovementRow from "@/src/components/MovementRow";
import RoutineFormModal, {
  type FormMode,
} from "@/src/components/RoutineFormModal";
import { BorderRadius, Spacing, Typography } from "@/src/state/theme";

// ─── Design tokens ────────────────────────────────────────────────────────────
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
  red: "#EF4444",
  redDim: "rgba(239,68,68,0.1)",
};

// ─── Routine Detail Screen ────────────────────────────────────────────────────
export default function RoutineScreen() {
  const router = useRouter();
  // Read the routine ID from URL params — avoids async atomWithStorage race condition
  const params = useLocalSearchParams<{ id: string }>();
  // Persist the ID so Expo Router parameter shedding doesn't break the screen on updates
  const [selectedId] = useState(params.id);

  const [routines, setRoutines] = useAtom(routinesAtom);
  const setActiveRoutineId = useSetAtom(activeRoutineIdAtom);
  const setTimerSeconds = useSetAtom(timerSecondsAtom);
  const setTimerRunning = useSetAtom(timerRunningAtom);
  const isPremium = useAtomValue(isPremiumAtom);

  const safeRoutines: Routine[] = Array.isArray(routines) ? routines : [];
  const routine: Routine | undefined = safeRoutines.find(
    (r) => r.id === selectedId,
  );

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);

  const [routineFormVisible, setRoutineFormVisible] = useState(false);
  const [routineFormMode, setRoutineFormMode] = useState<FormMode>({
    mode: "create",
  });

  // Component logic

  if (!routine) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: C.textMuted }}>Routine not found.</Text>
      </View>
    );
  }

  const cat = CATEGORY_ICONS[routine.categoryIconIndex] ?? CATEGORY_ICONS[0];
  const movements: Movement[] = Array.isArray(routine.movements)
    ? routine.movements
    : [];

  function updateRoutine(patch: Partial<Routine>) {
    const arr = Array.isArray(routines) ? routines : [];
    const updated = arr.map((r) =>
      r.id === selectedId ? { ...r, ...patch } : r,
    );
    setRoutines(updated);
  }

  function computeDuration(movs: Movement[]): number {
    const totalSec = movs.reduce(
      (acc, m) =>
        acc + (m.durationMin * 60 + m.durationSec) * Math.max(1, m.repeatCount ?? 1),
      0,
    );
    return Math.max(1, Math.ceil(totalSec / 60));
  }

  function saveMovement(m: Movement) {
    const idx = movements.findIndex((mv) => mv.id === m.id);
    // Free users can only have max 3 movements per routine
    if (!isPremium && idx < 0 && movements.length >= 3) {
      setEditorVisible(false);
      router.push("/paywall");
      return;
    }
    const next =
      idx >= 0
        ? movements.map((mv) => (mv.id === m.id ? m : mv))
        : [...movements, m];
    updateRoutine({
      movements: next,
      movementCount: next.length,
      durationMin: computeDuration(next),
    });
  }

  function deleteMovement(id: string) {
    const arr = Array.isArray(routines) ? routines : [];
    const updated = arr.map((r) => {
      if (r.id !== selectedId) return r;
      const currentMovements = Array.isArray(r.movements) ? r.movements : [];
      const next = currentMovements.filter((mv) => mv.id !== id);
      return {
        ...r,
        movements: next,
        movementCount: next.length,
        durationMin: computeDuration(next),
      };
    });
    setRoutines(updated);
  }

  function openAdd() {
    if (!isPremium && movements.length >= 3) {
      router.push("/paywall");
      return;
    }
    setEditingMovement(null);
    setEditorVisible(true);
  }

  function openEdit(m: Movement) {
    setEditingMovement(m);
    setEditorVisible(true);
  }

  function handleReorder(next: Movement[]) {
    updateRoutine({
      movements: next,
      movementCount: next.length,
      durationMin: computeDuration(next),
    });
  }

  function openEditRoutine() {
    setRoutineFormMode({ mode: "edit", routine: routine! });
    setRoutineFormVisible(true);
  }

  function handleSaveRoutine(updatedRoutine: Routine) {
    // Only patch the details; movements remain what they are in routine.tsx state
    updateRoutine({
      title: updatedRoutine.title,
      subtitle: updatedRoutine.subtitle,
      categoryIconIndex: updatedRoutine.categoryIconIndex,
    });
  }

  function handleStartRoutine() {
    const seconds = routine?.durationMin || 1 * 60;
    setTimerSeconds(seconds);
    setTimerRunning(true);
    routine?.id && setActiveRoutineId(routine?.id);
    router.push({ pathname: "/tabs/timer", params: { id: routine?.id } });
  }

  function handleDeleteRoutine() {
    Alert.alert("Delete Routine", `Delete "${routine?.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const arr = Array.isArray(routines) ? routines : [];
          const updated = arr.filter((r) => r.id !== routine!.id);
          setRoutines(updated);
          router.back();
        },
      },
    ]);
  }

  return (
    <GestureHandlerRootView style={r.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>
        <DraggableFlatList
          data={movements}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={r.scrollContent}
          activationDistance={10}
          onDragBegin={() => {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
          }}
          onDragEnd={({ data }) => handleReorder(data)}
          onRelease={() => {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
          }}
          renderItem={({
            item,
            drag,
            isActive,
          }: RenderItemParams<Movement>) => (
            <ScaleDecorator activeScale={0.98}>
              <MovementRow
                movement={item}
                isDragging={isActive}
                onPress={() => openEdit(item)}
                onDelete={deleteMovement}
                onLongPressDrag={drag}
              />
            </ScaleDecorator>
          )}
          ListHeaderComponent={
            <>
              {/* Header */}
              <View style={r.header}>
                <TouchableOpacity onPress={() => router.back()} style={r.backBtn}>
                  <Ionicons name="arrow-back" size={22} color={C.text} />
                </TouchableOpacity>
              </View>

              {/* Routine title */}
              <Text style={r.editLabel}>EDIT ROUTINE</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <View style={[r.catIcon, { backgroundColor: cat.bgColor }]}>
                  <Ionicons name={cat.name as any} size={22} color={cat.color} />
                </View>
                <Text style={r.routineTitle}>{routine.title}</Text>
                <TouchableOpacity
                  style={{ marginLeft: 8 }}
                  onPress={openEditRoutine}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil" size={18} color={C.textDim} />
                </TouchableOpacity>
              </View>

              {/* Movements section */}
              <View style={r.sectionHeader}>
                <Text style={r.sectionTitle}>Movements</Text>
                <Text style={r.sectionCount}>{movements.length} items total</Text>
              </View>
            </>
          }
          ListFooterComponent={
            <TouchableOpacity
              activeOpacity={0.7}
              style={r.addMovBtn}
              onPress={openAdd}
            >
              <Ionicons name="add-circle" size={20} color={C.blue} />
              <Text style={r.addMovText}>ADD MOVEMENT</Text>
            </TouchableOpacity>
          }
        />

        {/* Bottom bar */}
        <View style={r.bottomBar}>
          <TouchableOpacity style={r.finalizeBtn} onPress={handleStartRoutine}>
            <Text style={r.finalizeBtnText}>Finalize Routine</Text>
          </TouchableOpacity>
          <TouchableOpacity style={r.deleteBtn} onPress={handleDeleteRoutine}>
            <Ionicons name="trash" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <MovementEditorModal
        visible={editorVisible}
        movement={editingMovement}
        isPremium={isPremium}
        onClose={() => setEditorVisible(false)}
        onSave={saveMovement}
        onDelete={deleteMovement}
      />

      <RoutineFormModal
        visible={routineFormVisible}
        formMode={routineFormMode}
        onClose={() => setRoutineFormVisible(false)}
        onSave={handleSaveRoutine}
        onDelete={() => {}} // Not rendering delete here since it's already in the action bar, or we can reuse handleDeleteRoutine
      />
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const r = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Platform.OS === "android" ? Spacing.sm : 0,
    paddingBottom: 120,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl - 12,
    marginTop: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.round,
    backgroundColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
  },

  editLabel: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: "700",
    color: C.blue,
    letterSpacing: 1.4,
    marginBottom: Spacing.sm,
  },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm + 2,
  },
  routineTitle: {
    ...Typography.title,
    fontSize: 26,
    fontWeight: "800",
    color: C.text,
    flex: 1,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md - 2,
  },
  sectionTitle: { ...Typography.bodyLarge, fontWeight: "700", color: C.text },
  sectionCount: { ...Typography.caption, fontSize: 13, color: C.textDim },

  addMovBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: "dashed",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    marginTop: Spacing.xs,
  },
  addMovText: {
    ...Typography.caption,
    fontSize: 13,
    fontWeight: "700",
    color: C.blue,
    letterSpacing: 1,
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: Spacing.md - 4,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Platform.OS === "ios" ? Spacing.xl + 2 : Spacing.md + 4,
    paddingTop: Spacing.md,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  finalizeBtn: {
    flex: 1,
    backgroundColor: C.blue,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems: "center",
  },
  finalizeBtnText: {
    ...Typography.bodyMedium,
    fontWeight: "700",
    color: "#FFF",
  },
  deleteBtn: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: C.red,
    justifyContent: "center",
    alignItems: "center",
  },
});

// Movement editor styles removed as they live in src/components/MovementEditorModal.tsx
