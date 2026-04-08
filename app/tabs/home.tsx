import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAtom, useAtomValue } from 'jotai';
import {
  routinesAtom,
  activeRoutineIdAtom,
  isPremiumAtom,
  CATEGORY_ICONS,
  type Routine,
} from '@/src/state/atoms';


// ─── Local color constants matching Stitch "Obsidian Kinetic" design ──────────
const C = {
  bg:              '#0F1115',
  surface:         '#1A1D23',
  surfaceHigh:     '#22262F',
  border:          '#2A2E38',
  text:            '#F1F5F9',
  textMuted:       '#9CA3AF',
  textCaption:     '#64748B',
  blue:            '#3B82F6',
  blueDim:         '#1D4ED840',
  green:           '#10B981',
  greenDim:        '#10B98120',
  red:             '#EF4444',
  coral:           '#F43F5E',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActiveBadge() {
  return (
    <View style={styles.activeBadge}>
      <View style={styles.activeDot} />
      <Text style={styles.activeBadgeText}>CURRENTLY ACTIVE</Text>
    </View>
  );
}

type RoutineCardProps = {
  routine: Routine;
  isRunning: boolean;
  onPlay: () => void;
};

function RoutineCard({ routine, isRunning, onPlay }: RoutineCardProps) {
  const cat = CATEGORY_ICONS[routine.categoryIconIndex] ?? CATEGORY_ICONS[0];
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, routine.isActive && styles.cardActive]}
      onPress={onPlay}
    >
      {routine.isActive && <ActiveBadge />}

      {/* Duration badge top-right */}
      <Text style={styles.cardDuration}>{routine.durationMin} MIN</Text>

      {/* Icon */}
      <View style={[styles.cardIconWrap, { backgroundColor: cat.bgColor }]}>
        <Ionicons name={cat.name as any} size={28} color={cat.color} />
      </View>

      {/* Text */}
      <View style={styles.cardTextBlock}>
        <Text style={styles.cardTitle}>{routine.title}</Text>
        <Text style={styles.cardSubtitle}>{routine.subtitle}</Text>
        <Text style={styles.cardMeta}>{routine.movementCount} MOVEMENTS</Text>
      </View>

      {/* Play button */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.playBtn, isRunning && styles.playBtnActive]}
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

// ─── Create Routine Modal ─────────────────────────────────────────────────────

type CreateModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreate: (routine: Routine) => void;
};

function CreateRoutineModal({ visible, onClose, onCreate }: CreateModalProps) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [durationMin, setDurationMin] = useState('15');
  const [movementCount, setMovementCount] = useState('6');
  const [selectedIcon, setSelectedIcon] = useState(0);

  function handleCreate() {
    if (!title.trim()) return;
    const routine: Routine = {
      id: generateId(),
      title: title.trim(),
      subtitle: subtitle.trim() || CATEGORY_ICONS[selectedIcon].label,
      durationMin: parseInt(durationMin) || 15,
      movementCount: parseInt(movementCount) || 6,
      categoryIconIndex: selectedIcon,
      isActive: false,
      createdAt: Date.now(),
    };
    onCreate(routine);
    // reset
    setTitle(''); setSubtitle(''); setDurationMin('15');
    setMovementCount('6'); setSelectedIcon(0);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <StatusBar barStyle="light-content" />

        {/* Modal header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>New Routine</Text>
          <TouchableOpacity onPress={handleCreate} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[styles.modalCancel, { color: C.blue }]}>Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24 }}>
          {/* Title */}
          <Text style={styles.fieldLabel}>ROUTINE NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Morning Yoga"
            placeholderTextColor={C.textCaption}
            value={title}
            onChangeText={setTitle}
          />

          {/* Subtitle / description */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>DESCRIPTION</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Vinyasa Flow focus"
            placeholderTextColor={C.textCaption}
            value={subtitle}
            onChangeText={setSubtitle}
          />

          {/* Duration + movements row */}
          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>DURATION (MIN)</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={durationMin}
                onChangeText={setDurationMin}
                placeholderTextColor={C.textCaption}
              />
            </View>
            <View style={{ width: 16 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>MOVEMENTS</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={movementCount}
                onChangeText={setMovementCount}
                placeholderTextColor={C.textCaption}
              />
            </View>
          </View>

          {/* Category icon picker */}
          <Text style={[styles.fieldLabel, { marginTop: 24 }]}>CATEGORY</Text>
          <View style={styles.iconGrid}>
            {CATEGORY_ICONS.map((cat, idx) => {
              const isSelected = selectedIcon === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  style={[
                    styles.iconCell,
                    { backgroundColor: isSelected ? cat.bgColor : C.surface },
                    isSelected && { borderColor: cat.color, borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedIcon(idx)}
                >
                  <Ionicons name={cat.name as any} size={26} color={isSelected ? cat.color : C.textMuted} />
                  <Text style={[styles.iconLabel, { color: isSelected ? cat.color : C.textCaption }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [routines, setRoutines] = useAtom(routinesAtom);
  const [activeRoutineId, setActiveRoutineId] = useAtom(activeRoutineIdAtom);
  const isPremium = useAtomValue(isPremiumAtom);
  const [showCreate, setShowCreate] = useState(false);

  // Sort: isActive first, then by createdAt
  const sorted = [...routines].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return a.createdAt - b.createdAt;
  });
  const activeCount = routines.filter((r) => r.isActive).length;

  function handlePlay(routine: Routine) {
    setActiveRoutineId((prev) => (prev === routine.id ? null : routine.id));
  }

  function handleAddRoutine(routine: Routine) {
    setRoutines((prev) => [...prev, routine]);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Your{'\n'}Routines</Text>
              <Text style={styles.headerSub}>
                KINETIC FLOW • {activeCount} ACTIVE
                {isPremium ? ' • PRO' : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.settingsBtn}>
              <Ionicons name="settings-sharp" size={22} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* ── Routine cards ───────────────────────────────────────────────── */}
          <View style={styles.cardList}>
            {sorted.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                isRunning={activeRoutineId === routine.id}
                onPlay={() => handlePlay(routine)}
              />
            ))}

            {/* ── Create button ──────────────────────────────────────────────── */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.createCard}
              onPress={() => setShowCreate(true)}
            >
              <View style={styles.createIconWrap}>
                <Ionicons name="add" size={32} color={C.blue} />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <CreateRoutineModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleAddRoutine}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 48 : 16, paddingBottom: 60 },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 32 },
  headerTitle: { fontSize: 38, fontWeight: '800', color: C.text, lineHeight: 44, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, fontWeight: '700', color: C.textMuted, letterSpacing: 1.2, marginTop: 8 },
  settingsBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.surface,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 4,
  },

  // Routine card
  cardList: { gap: 14 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardActive: { borderWidth: 1, borderColor: C.border },
  activeBadge: {
    position: 'absolute',
    top: 14,
    left: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: C.green,
  },
  activeBadgeText: {
    fontSize: 9, fontWeight: '700', color: C.green, letterSpacing: 1.2,
  },
  cardDuration: {
    position: 'absolute',
    top: 14,
    right: 22,
    fontSize: 11,
    fontWeight: '700',
    color: C.textCaption,
    letterSpacing: 1,
  },
  cardIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
    marginTop: 10, // push below badge row
  },
  cardTextBlock: { flex: 1, marginTop: 10 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 3 },
  cardSubtitle: { fontSize: 14, color: C.textMuted, marginBottom: 4 },
  cardMeta: { fontSize: 10, fontWeight: '700', color: C.textCaption, letterSpacing: 1 },
  playBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.blue,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 12, marginTop: 10,
  },
  playBtnActive: { backgroundColor: C.surfaceHigh, borderWidth: 2, borderColor: C.blue },

  // Create card
  createCard: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 28,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: C.blueDim,
    justifyContent: 'center', alignItems: 'center',
  },

  // Modal
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  modalCancel: { fontSize: 16, color: C.textMuted, fontWeight: '500' },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: C.textCaption, letterSpacing: 1.4, marginBottom: 8 },
  input: {
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  rowInputs: { flexDirection: 'row', marginTop: 20 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  iconCell: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  iconLabel: { fontSize: 9, fontWeight: '600' },
});
