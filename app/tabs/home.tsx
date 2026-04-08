import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, SafeAreaView,
  Modal, TextInput, StyleSheet, StatusBar, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  routinesAtom, activeRoutineIdAtom, selectedRoutineIdAtom,
  timerSecondsAtom, timerRunningAtom,
  isPremiumAtom, CATEGORY_ICONS, type Routine,
} from '@/src/state/atoms';
import RoutineCard from '@/src/components/RoutineCard';
import RoutineFormModal, { type FormMode } from '@/src/components/RoutineFormModal';

// ─── Design tokens (Stitch Obsidian Kinetic) ─────────────────────────────────
const C = {
  bg:          '#0F1115',
  surface:     '#1A1D23',
  surfaceHigh: '#22262F',
  border:      '#2A2E38',
  text:        '#F1F5F9',
  textMuted:   '#9CA3AF',
  textDim:     '#64748B',
  blue:        '#3B82F6',
  blueDim:     'rgba(59,130,246,0.15)',
  green:       '#10B981',
};



// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const [routines,        setRoutines]        = useAtom(routinesAtom);
  const [activeRoutineId,  setActiveRoutineId]  = useAtom(activeRoutineIdAtom);
  const setSelectedRoutineId                   = useSetAtom(selectedRoutineIdAtom);
  const setTimerSeconds = useSetAtom(timerSecondsAtom);
  const setTimerRunning = useSetAtom(timerRunningAtom);
  const isPremium = useAtomValue(isPremiumAtom);

  const [formVisible, setFormVisible] = useState(false);
  const [formMode,    setFormMode]    = useState<FormMode>({ mode: 'create' });

  // Ensure we always work with a real array (fixes atomWithStorage initial-state edge case)
  const safeRoutines: Routine[] = Array.isArray(routines) ? routines : [];

  const sorted = [...safeRoutines].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return a.createdAt - b.createdAt;
  });

  const activeCount = safeRoutines.filter((r) => r.isActive).length;

  function openCreate() {
    setFormMode({ mode: 'create' });
    setFormVisible(true);
  }

  function openEdit(routine: Routine) {
    setFormMode({ mode: 'edit', routine });
    setFormVisible(true);
  }

  function handleSave(routine: Routine) {
    setRoutines((prev) => {
      const arr: Routine[] = Array.isArray(prev) ? prev : [];
      const idx = arr.findIndex((r) => r.id === routine.id);
      if (idx >= 0) {
        const next = [...arr];
        next[idx] = routine;
        return next;
      }
      return [...arr, routine];
    });
  }

  function handleDelete(id: string) {
    setRoutines((prev) => {
      const arr: Routine[] = Array.isArray(prev) ? prev : [];
      return arr.filter((r) => r.id !== id);
    });
    if (activeRoutineId === id) setActiveRoutineId(null);
  }

  function handleOpen(routine: Routine) {
    // Pass the ID as a URL param — avoids async hydration race with atomWithStorage
    router.push({ pathname: '/tabs/routine', params: { id: routine.id } });
  }

  function handlePlay(routine: Routine) {
    const seconds = routine.durationMin * 60;
    setTimerSeconds(seconds);
    setTimerRunning(true);
    setActiveRoutineId(routine.id);
    router.push('/tabs/timer');
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>Your{'\n'}Routines</Text>
              <Text style={s.headerSub}>
                KINETIC FLOW • {activeCount} ACTIVE{isPremium ? ' • PRO' : ''}
              </Text>
            </View>
            <TouchableOpacity style={s.settingsBtn}>
              <Ionicons name="settings-sharp" size={22} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Cards */}
          <View style={s.cardList}>
            {sorted.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                isRunning={activeRoutineId === routine.id}
                onPress={() => handleOpen(routine)}
                onPlay={() => handlePlay(routine)}
                onEdit={() => openEdit(routine)}
              />
            ))}

            {/* Add card */}
            <TouchableOpacity activeOpacity={0.7} style={s.createCard} onPress={openCreate}>
              <View style={s.createIconWrap}>
                <Ionicons name="add" size={32} color={C.blue} />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <RoutineFormModal
        visible={formVisible}
        formMode={formMode}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 48 : 16, paddingBottom: 60 },

  // Header
  header:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 32 },
  headerTitle:{ fontSize: 38, fontWeight: '800', color: C.text, lineHeight: 44, letterSpacing: -0.5 },
  headerSub:  { fontSize: 12, fontWeight: '700', color: C.textMuted, letterSpacing: 1.2, marginTop: 8 },
  settingsBtn:{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', marginTop: 4 },

  // Card List
  cardList:    { gap: 14 },

  // Create
  createCard:    { borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', borderRadius: 28, height: 80, justifyContent: 'center', alignItems: 'center' },
  createIconWrap:{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.blueDim, justifyContent: 'center', alignItems: 'center' },

});
