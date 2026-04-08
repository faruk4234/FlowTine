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

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Active badge ─────────────────────────────────────────────────────────────
function ActiveBadge() {
  return (
    <View style={s.activeBadge}>
      <View style={s.activeDot} />
      <Text style={s.activeBadgeText}>CURRENTLY ACTIVE</Text>
    </View>
  );
}

// ─── Routine Card ─────────────────────────────────────────────────────────────
type CardProps = {
  routine: Routine;
  isRunning: boolean;
  onPress: () => void;  // tap card body → routine detail
  onPlay: () => void;   // tap play btn → timer
  onEdit: () => void;   // tap pencil → edit modal
};

function RoutineCard({ routine, isRunning, onPress, onPlay, onEdit }: CardProps) {
  const cat = CATEGORY_ICONS[routine.categoryIconIndex] ?? CATEGORY_ICONS[0];
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={[s.card, routine.isActive && s.cardActive]}>
      {routine.isActive && <ActiveBadge />}

      {/* Duration + Edit */}
      <View style={s.cardTopRight}>
        <Text style={s.cardDuration}>{routine.durationMin} MIN</Text>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 12 }}>
          <Ionicons name="pencil" size={15} color={C.textDim} />
        </TouchableOpacity>
      </View>

      {/* Icon */}
      <View style={[s.cardIconWrap, { backgroundColor: cat.bgColor }]}>
        <Ionicons name={cat.name as any} size={28} color={cat.color} />
      </View>

      {/* Text */}
      <View style={s.cardTextBlock}>
        <Text style={s.cardTitle}>{routine.title}</Text>
        <Text style={s.cardSubtitle}>{routine.subtitle}</Text>
        <Text style={s.cardMeta}>{routine.movementCount} MOVEMENTS</Text>
      </View>

      {/* Play button */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[s.playBtn, isRunning && s.playBtnPaused]}
        onPress={onPlay}
      >
        <Ionicons
          name={isRunning ? 'pause' : 'play'}
          size={20}
          color="#FFF"
          style={{ marginLeft: isRunning ? 0 : 3 }}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Routine Form Modal ───────────────────────────────────────────────────────
type FormMode = { mode: 'create' } | { mode: 'edit'; routine: Routine };

type FormProps = {
  visible: boolean;
  formMode: FormMode;
  onClose: () => void;
  onSave: (routine: Routine) => void;
  onDelete?: (id: string) => void;
};

function RoutineFormModal({ visible, formMode, onClose, onSave, onDelete }: FormProps) {
  const isEdit   = formMode.mode === 'edit';
  const existing = isEdit ? formMode.routine : null;

  const [title,         setTitle]         = useState(existing?.title          ?? '');
  const [subtitle,      setSubtitle]      = useState(existing?.subtitle       ?? '');
  const [durationMin,   setDurationMin]   = useState(String(existing?.durationMin   ?? 15));
  const [movementCount, setMovementCount] = useState(String(existing?.movementCount ?? 6));
  const [selectedIcon,  setSelectedIcon]  = useState(existing?.categoryIconIndex   ?? 0);

  // Sync fields when switching between edit targets
  React.useEffect(() => {
    if (visible) {
      setTitle(existing?.title ?? '');
      setSubtitle(existing?.subtitle ?? '');
      setDurationMin(String(existing?.durationMin ?? 15));
      setMovementCount(String(existing?.movementCount ?? 6));
      setSelectedIcon(existing?.categoryIconIndex ?? 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handleSave() {
    if (!title.trim()) return;
    const routine: Routine = {
      id:                 existing?.id ?? generateId(),
      title:              title.trim(),
      subtitle:           subtitle.trim() || CATEGORY_ICONS[selectedIcon].label,
      durationMin:        parseInt(durationMin)   || 15,
      movementCount:      parseInt(movementCount) || 6,
      categoryIconIndex:  selectedIcon,
      isActive:           existing?.isActive ?? false,
      createdAt:          existing?.createdAt ?? Date.now(),
    };
    onSave(routine);
    onClose();
  }

  function handleDelete() {
    if (!existing) return;
    Alert.alert('Delete Routine', `Delete "${existing.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete?.(existing.id); onClose(); } },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.modalContainer}>
        <StatusBar barStyle="light-content" />

        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={s.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle}>{isEdit ? 'Edit Routine' : 'New Routine'}</Text>
          <TouchableOpacity onPress={handleSave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[s.modalCancel, { color: C.blue }]}>{isEdit ? 'Save' : 'Add'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
          <Text style={s.fieldLabel}>ROUTINE NAME</Text>
          <TextInput style={s.input} placeholder="e.g. Morning Yoga"
            placeholderTextColor={C.textDim} value={title} onChangeText={setTitle} />

          <Text style={[s.fieldLabel, { marginTop: 20 }]}>DESCRIPTION</Text>
          <TextInput style={s.input} placeholder="e.g. Vinyasa Flow focus"
            placeholderTextColor={C.textDim} value={subtitle} onChangeText={setSubtitle} />

          <View style={s.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>DURATION (MIN)</Text>
              <TextInput style={s.input} keyboardType="number-pad"
                value={durationMin} onChangeText={setDurationMin} placeholderTextColor={C.textDim} />
            </View>
            <View style={{ width: 16 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>MOVEMENTS</Text>
              <TextInput style={s.input} keyboardType="number-pad"
                value={movementCount} onChangeText={setMovementCount} placeholderTextColor={C.textDim} />
            </View>
          </View>

          <Text style={[s.fieldLabel, { marginTop: 24 }]}>CATEGORY</Text>
          <View style={s.iconGrid}>
            {CATEGORY_ICONS.map((cat, idx) => {
              const sel = selectedIcon === idx;
              return (
                <TouchableOpacity key={idx} activeOpacity={0.8}
                  style={[s.iconCell, { backgroundColor: sel ? cat.bgColor : C.surface },
                          sel && { borderColor: cat.color, borderWidth: 2 }]}
                  onPress={() => setSelectedIcon(idx)}>
                  <Ionicons name={cat.name as any} size={26} color={sel ? cat.color : C.textMuted} />
                  <Text style={[s.iconLabel, { color: sel ? cat.color : C.textDim }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isEdit && (
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={s.deleteBtnText}>Delete Routine</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

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
    setSelectedRoutineId(routine.id);
    router.push('/tabs/routine');
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

  // Card
  cardList:    { gap: 14 },
  card:        { backgroundColor: C.surface, borderRadius: 28, padding: 22, flexDirection: 'row', alignItems: 'center' },
  cardActive:  { borderWidth: 1, borderColor: C.border },

  activeBadge: { position: 'absolute', top: 14, left: 22, flexDirection: 'row', alignItems: 'center', gap: 5 },
  activeDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  activeBadgeText: { fontSize: 9, fontWeight: '700', color: C.green, letterSpacing: 1.2 },

  cardTopRight: { position: 'absolute', top: 14, right: 18, flexDirection: 'row', alignItems: 'center' },
  cardDuration: { fontSize: 11, fontWeight: '700', color: C.textDim, letterSpacing: 1 },

  cardIconWrap: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16, marginTop: 10 },
  cardTextBlock:{ flex: 1, marginTop: 10 },
  cardTitle:    { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 3 },
  cardSubtitle: { fontSize: 14, color: C.textMuted, marginBottom: 4 },
  cardMeta:     { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1 },

  playBtn:      { width: 52, height: 52, borderRadius: 26, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center', marginLeft: 12, marginTop: 10 },
  playBtnPaused:{ backgroundColor: C.surfaceHigh, borderWidth: 2, borderColor: C.blue },

  // Create
  createCard:    { borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', borderRadius: 28, height: 80, justifyContent: 'center', alignItems: 'center' },
  createIconWrap:{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.blueDim, justifyContent: 'center', alignItems: 'center' },

  // Modal
  modalContainer:{ flex: 1, backgroundColor: C.bg },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle:    { fontSize: 17, fontWeight: '700', color: C.text },
  modalCancel:   { fontSize: 16, color: C.textMuted, fontWeight: '500' },
  fieldLabel:    { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.4, marginBottom: 8 },
  input:         { backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border },
  rowInputs:     { flexDirection: 'row', marginTop: 20 },
  iconGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  iconCell:      { width: '18%', aspectRatio: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 4 },
  iconLabel:     { fontSize: 9, fontWeight: '600' },
  deleteBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 36, paddingVertical: 16, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  deleteBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
});
