import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, SafeAreaView,
  Modal, TextInput, StyleSheet, StatusBar, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  routinesAtom, activeRoutineIdAtom,
  timerSecondsAtom, timerRunningAtom,
  isPremiumAtom, CATEGORY_ICONS, type Routine, type Movement,
} from '@/src/state/atoms';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:         '#0F1115',
  surface:    '#1A1D23',
  surfaceHigh:'#22262F',
  border:     '#2A2E38',
  text:       '#F1F5F9',
  textMuted:  '#9CA3AF',
  textDim:    '#64748B',
  blue:       '#3B82F6',
  blueDim:    'rgba(59,130,246,0.15)',
  red:        '#EF4444',
  redDim:     'rgba(239,68,68,0.1)',
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function generateId()   { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function formatDuration(min: number, sec: number) {
  return `${pad(min)}:${pad(sec)}`;
}
function formatRest(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${pad(m)}:${pad(s)} Rest` : `0:${pad(s)} Rest`;
}

// ─── Movement Editor Modal ────────────────────────────────────────────────────
type EditorProps = {
  visible: boolean;
  movement: Movement | null;  // null = new
  onClose: () => void;
  onSave: (m: Movement) => void;
  onDelete?: (id: string) => void;
  isPremium: boolean;
};

function MovementEditorModal({ visible, movement, onClose, onSave, onDelete, isPremium }: EditorProps) {
  const isEdit = !!movement;

  const [name,        setName]        = useState(movement?.name        ?? '');
  const [description, setDescription] = useState(movement?.description ?? '');
  const [durMin,      setDurMin]      = useState(movement?.durationMin ?? 0);
  const [durSec,      setDurSec]      = useState(movement?.durationSec ?? 30);
  const [restSec,     setRestSec]     = useState(movement?.restSec     ?? 30);

  React.useEffect(() => {
    if (visible) {
      setName(movement?.name ?? '');
      setDescription(movement?.description ?? '');
      setDurMin(movement?.durationMin ?? 0);
      setDurSec(movement?.durationSec ?? 30);
      setRestSec(movement?.restSec ?? 30);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function clamp(v: number, lo: number, hi: number) { return Math.min(Math.max(v, lo), hi); }

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id:          movement?.id ?? generateId(),
      name:        name.trim(),
      description: description.trim(),
      durationMin: durMin,
      durationSec: durSec,
      restSec,
    });
    onClose();
  }

  function handleDelete() {
    if (!movement) return;
    Alert.alert('Delete Movement', `Delete "${movement.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete?.(movement.id); onClose(); } },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={e.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={e.header}>
          <TouchableOpacity onPress={onClose} style={e.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={e.headerRight}>EDITOR</Text>
        </View>

        {/* Scrollable fields */}
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={e.editorTitle}>Task Editor</Text>
          <View style={e.titleUnderline} />

          {/* Name */}
          <Text style={e.fieldLabel}>TASK NAME</Text>
          <TextInput style={e.input} placeholder="e.g. Sun Salutation A"
            placeholderTextColor={C.textDim} value={name} onChangeText={setName} />

          {/* Description */}
          <Text style={[e.fieldLabel, { marginTop: 20 }]}>OPTIONAL DESCRIPTION</Text>
          <TextInput
            style={[e.input, { height: 90, textAlignVertical: 'top' }]}
            placeholder="Add coaching cues or focus points..."
            placeholderTextColor={C.textDim}
            value={description} onChangeText={setDescription}
            multiline numberOfLines={3}
          />

          {/* Duration picker */}
          <Text style={[e.fieldLabel, { marginTop: 24, textAlign: 'center' }]}>SET DURATION</Text>
          <View style={e.durationRow}>
            <View style={e.durationCol}>
              <TouchableOpacity onPress={() => setDurMin((v) => clamp(v + 1, 0, 99))} style={e.durBtn}>
                <Ionicons name="chevron-up" size={22} color={C.textMuted} />
              </TouchableOpacity>
              <Text style={e.durationNum}>{pad(durMin)}</Text>
              <TouchableOpacity onPress={() => setDurMin((v) => clamp(v - 1, 0, 99))} style={e.durBtn}>
                <Ionicons name="chevron-down" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={e.durationColon}>:</Text>
            <View style={e.durationCol}>
              <TouchableOpacity onPress={() => setDurSec((v) => clamp(v + 5, 0, 55))} style={e.durBtn}>
                <Ionicons name="chevron-up" size={22} color={C.textMuted} />
              </TouchableOpacity>
              <Text style={e.durationNum}>{pad(durSec)}</Text>
              <TouchableOpacity onPress={() => setDurSec((v) => clamp(v - 5, 0, 55))} style={e.durBtn}>
                <Ionicons name="chevron-down" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={e.durationLabels}>
            <Text style={[e.durationLabel, { flex: 1, textAlign: 'center' }]}>MIN</Text>
            <View style={{ width: 40 }} />
            <Text style={[e.durationLabel, { flex: 1, textAlign: 'center' }]}>SEC</Text>
          </View>
          <View style={e.durationProgress} />

          {/* Rest Duration */}
          <View style={e.restCard}>
            <Ionicons name="timer-outline" size={22} color={C.blue} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={e.restTitle}>Rest Duration</Text>
              <Text style={e.restSub}>Between intervals</Text>
            </View>
            <TouchableOpacity onPress={() => setRestSec((v) => clamp(v - 15, 0, 600))} style={e.restBtn}>
              <Text style={e.restBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={e.restValue}>{`${pad(Math.floor(restSec / 60))}:${pad(restSec % 60)}`}</Text>
            <TouchableOpacity onPress={() => setRestSec((v) => clamp(v + 15, 0, 600))} style={e.restBtn}>
              <Text style={e.restBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Haptic alerts — premium only */}
          <View style={e.hapticRow}>
            <Ionicons name="phone-portrait-outline" size={20} color={isPremium ? C.blue : C.textDim} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[e.hapticTitle, { color: isPremium ? C.text : C.textDim }]}>Haptic Alerts</Text>
              <Text style={e.hapticSub}>Premium feature only</Text>
            </View>
            <Ionicons name={isPremium ? 'checkmark-circle' : 'lock-closed'} size={20} color={isPremium ? C.blue : C.textDim} />
          </View>

          {/* Delete (edit mode only) — inside scroll */}
          {isEdit && (
            <TouchableOpacity style={e.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={C.red} />
              <Text style={e.deleteBtnText}>Delete Movement</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Done — always visible at the bottom, never scrolled away */}
        <View style={e.bottomBar}>
          <TouchableOpacity style={e.doneBtn} onPress={handleSave}>
            <Text style={e.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

// ─── Movement Row ─────────────────────────────────────────────────────────────
type MovRowProps = { movement: Movement; onPress: () => void };
function MovementRow({ movement, onPress }: MovRowProps) {
  return (
    <TouchableOpacity activeOpacity={0.75} style={r.movRow} onPress={onPress}>
      <Ionicons name="reorder-three" size={22} color={C.textDim} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={r.movName}>{movement.name}</Text>
        <View style={r.movMeta}>
          <Ionicons name="time" size={13} color={C.blue} />
          <Text style={r.movMetaText}>{formatDuration(movement.durationMin, movement.durationSec)}</Text>
          <Ionicons name="timer-outline" size={13} color={C.textDim} style={{ marginLeft: 8 }} />
          <Text style={[r.movMetaText, { color: C.textDim }]}>{formatRest(movement.restSec)}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={18} color={C.textDim} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Routine Detail Screen ────────────────────────────────────────────────────
export default function RoutineScreen() {
  const router = useRouter();
  // Read the routine ID from URL params — avoids async atomWithStorage race condition
  const { id: selectedId } = useLocalSearchParams<{ id: string }>();
  const [routines, setRoutines] = useAtom(routinesAtom);
  const setActiveRoutineId = useSetAtom(activeRoutineIdAtom);
  const setTimerSeconds    = useSetAtom(timerSecondsAtom);
  const setTimerRunning    = useSetAtom(timerRunningAtom);
  const isPremium          = useAtomValue(isPremiumAtom);

  const safeRoutines: Routine[] = Array.isArray(routines) ? routines : [];
  const routine = safeRoutines.find((r) => r.id === selectedId);

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
    const idx  = movements.findIndex((mv) => mv.id === m.id);
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
            <MovementRow key={m.id} movement={m} onPress={() => openEdit(m)} />
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
  root:         { flex: 1, backgroundColor: C.bg },
  scrollContent:{ paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 8 : 0, paddingBottom: 120 },

  header:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },

  editLabel:    { fontSize: 10, fontWeight: '700', color: C.blue, letterSpacing: 1.4, marginBottom: 8 },
  catIcon:      { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  routineTitle: { fontSize: 26, fontWeight: '800', color: C.text, flex: 1 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 18, fontWeight: '700', color: C.text },
  sectionCount:  { fontSize: 13, color: C.textDim },

  movRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 18, padding: 18, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  movName:     { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 6 },
  movMeta:     { flexDirection: 'row', alignItems: 'center' },
  movMetaText: { fontSize: 13, color: C.blue, marginLeft: 4 },

  addMovBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', borderRadius: 18, paddingVertical: 18, marginTop: 4 },
  addMovText:  { fontSize: 13, fontWeight: '700', color: C.textDim, letterSpacing: 1 },

  bottomBar:    { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingTop: 16, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
  finalizeBtn:  { flex: 1, backgroundColor: C.blue, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  finalizeBtnText:{ fontSize: 16, fontWeight: '700', color: '#FFF' },
  deleteBtn:    { width: 56, height: 56, borderRadius: 16, backgroundColor: C.red, justifyContent: 'center', alignItems: 'center' },
});

// Movement editor styles
const e = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  backBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },
  headerRight:{ fontSize: 12, fontWeight: '700', color: C.textDim, letterSpacing: 1.5 },
  editorTitle:{ fontSize: 34, fontWeight: '800', color: C.text, marginBottom: 6 },
  titleUnderline:{ height: 3, width: 36, backgroundColor: C.blue, borderRadius: 2, marginBottom: 28 },

  fieldLabel: { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.4, marginBottom: 8 },
  input:      { backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border },

  // Duration picker
  durationRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  durationCol:  { alignItems: 'center' },
  durationColon:{ fontSize: 48, fontWeight: '800', color: C.blue, marginHorizontal: 12, marginBottom: 8 },
  durationNum:  { fontSize: 56, fontWeight: '800', color: C.blue, lineHeight: 64 },
  durBtn:       { padding: 4 },
  durationLabels:{ flexDirection: 'row', marginTop: 4 },
  durationLabel: { fontSize: 11, fontWeight: '700', color: C.textDim, letterSpacing: 1 },
  durationProgress:{ height: 3, backgroundColor: C.blue, borderRadius: 2, marginTop: 16, marginBottom: 24, marginHorizontal: 0, opacity: 0.4 },

  // Rest
  restCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  restTitle:{ fontSize: 15, fontWeight: '600', color: C.text },
  restSub:  { fontSize: 12, color: C.textDim },
  restBtn:  { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surfaceHigh, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  restBtnText:{ fontSize: 20, color: C.text, fontWeight: '700', lineHeight: 22 },
  restValue:{ fontSize: 16, fontWeight: '700', color: C.blue, minWidth: 52, textAlign: 'center' },

  // Haptic
  hapticRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border, marginBottom: 24 },
  hapticTitle:{ fontSize: 15, fontWeight: '600' },
  hapticSub: { fontSize: 12, color: C.textDim },

  doneBtn:     { backgroundColor: C.blue, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  bottomBar:   { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  deleteBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: C.redDim, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', marginTop: 12 },
  deleteBtnText:{ color: C.red, fontSize: 15, fontWeight: '600' },
});
