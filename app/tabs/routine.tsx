import {
  activeRoutineIdAtom,
  CATEGORY_ICONS,
  isPremiumAtom,
  routinesAtom,
  timerRunningAtom,
  timerSecondsAtom,
  type Movement,
  type Routine,
} from '@/src/state/atoms';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Design tokens ────────────────────────────────────────────────────────────
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
  red: '#EF4444',
  redDim: 'rgba(239,68,68,0.1)',
};

import MovementEditorModal from '@/src/components/MovementEditorModal';
import MovementRow from '@/src/components/MovementRow';



// ─── Routine Detail Screen ────────────────────────────────────────────────────
export default function RoutineScreen() {
  const router = useRouter();
  // Read the routine ID from URL params — avoids async atomWithStorage race condition
  const { id: selectedId } = useLocalSearchParams<{ id: string }>();
  const [routines, setRoutines] = useAtom(routinesAtom);
  const setActiveRoutineId = useSetAtom(activeRoutineIdAtom);
  const setTimerSeconds = useSetAtom(timerSecondsAtom);
  const setTimerRunning = useSetAtom(timerRunningAtom);
  const isPremium = useAtomValue(isPremiumAtom);

  const safeRoutines: Routine[] = Array.isArray(routines) ? routines : [];
  const routine: Routine | undefined = safeRoutines.find((r) => r.id === selectedId);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);

  if (!routine) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: C.textMuted }}>Routine not found.</Text>
      </View>
    );
  }

  const cat = CATEGORY_ICONS[routine.categoryIconIndex] ?? CATEGORY_ICONS[0];
  const movements: Movement[] = Array.isArray(routine.movements) ? routine.movements : [];

  function updateRoutine(patch: Partial<Routine>) {
    setRoutines((prev) => {
      const arr: Routine[] = Array.isArray(prev) ? prev : [];
      return arr.map((r) => r.id === routine!.id ? { ...r, ...patch } : r);
    });
  }

  function computeDuration(movs: Movement[]): number {
    const totalSec = movs.reduce((acc, m) => acc + m.durationMin * 60 + m.durationSec, 0);
    return Math.max(1, Math.ceil(totalSec / 60));
  }

  function saveMovement(m: Movement) {
    const idx = movements.findIndex((mv) => mv.id === m.id);
    const next = idx >= 0
      ? movements.map((mv) => mv.id === m.id ? m : mv)
      : [...movements, m];
    updateRoutine({ movements: next, movementCount: next.length, durationMin: computeDuration(next) });
  }

  function deleteMovement(id: string) {
    const next = movements.filter((mv) => mv.id !== id);
    updateRoutine({ movements: next, movementCount: next.length, durationMin: computeDuration(next) });
  }

  function openAdd() {
    setEditingMovement(null);
    setEditorVisible(true);
  }

  function openEdit(m: Movement) {
    setEditingMovement(m);
    setEditorVisible(true);
  }

  function handleStartRoutine() {
    const seconds = routine.durationMin * 60;
    setTimerSeconds(seconds);
    setTimerRunning(true);
    setActiveRoutineId(routine.id);
    router.push({ pathname: '/tabs/timer', params: { id: routine.id } });
  }

  function handleDeleteRoutine() {
    Alert.alert('Delete Routine', `Delete "${routine.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          setRoutines((prev) => {
            const arr: Routine[] = Array.isArray(prev) ? prev : [];
            return arr.filter((r) => r.id !== routine!.id);
          });
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={r.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>

        <ScrollView contentContainerStyle={r.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={r.header}>
            <TouchableOpacity onPress={() => router.back()} style={r.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Routine title */}
          <Text style={r.editLabel}>EDIT ROUTINE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <View style={[r.catIcon, { backgroundColor: cat.bgColor }]}>
              <Ionicons name={cat.name as any} size={22} color={cat.color} />
            </View>
            <Text style={r.routineTitle}>{routine.title}</Text>
            <TouchableOpacity style={{ marginLeft: 8 }}>
              <Ionicons name="pencil" size={18} color={C.textDim} />
            </TouchableOpacity>
          </View>

          {/* Movements section */}
          <View style={r.sectionHeader}>
            <Text style={r.sectionTitle}>Movements</Text>
            <Text style={r.sectionCount}>{movements.length} items total</Text>
          </View>

          {movements.map((m) => (
            <MovementRow key={m.id} movement={m} onPress={() => openEdit(m)} onDelete={deleteMovement} />
          ))}

          {/* Add movement */}
          <TouchableOpacity activeOpacity={0.7} style={r.addMovBtn} onPress={openAdd}>
            <Ionicons name="add-circle" size={20} color={C.textDim} />
            <Text style={r.addMovText}>ADD MOVEMENT</Text>
          </TouchableOpacity>
        </ScrollView>

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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const r = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 8 : 0, paddingBottom: 120 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },

  editLabel: { fontSize: 10, fontWeight: '700', color: C.blue, letterSpacing: 1.4, marginBottom: 8 },
  catIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  routineTitle: { fontSize: 26, fontWeight: '800', color: C.text, flex: 1 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  sectionCount: { fontSize: 13, color: C.textDim },

  movRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 18, padding: 18, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  movName: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 6 },
  movMeta: { flexDirection: 'row', alignItems: 'center' },
  movMetaText: { fontSize: 13, color: C.blue, marginLeft: 4 },

  addMovBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', borderRadius: 18, paddingVertical: 18, marginTop: 4 },
  addMovText: { fontSize: 13, fontWeight: '700', color: C.textDim, letterSpacing: 1 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingTop: 16, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
  finalizeBtn: { flex: 1, backgroundColor: C.blue, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  finalizeBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  deleteBtn: { width: 56, height: 56, borderRadius: 16, backgroundColor: C.red, justifyContent: 'center', alignItems: 'center' },
});

// Movement editor styles removed as they live in src/components/MovementEditorModal.tsx
