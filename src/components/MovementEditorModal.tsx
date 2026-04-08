import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { type Movement } from '@/src/state/atoms';

const C = {
  bg: '#0F1115',
  surface: '#1A1D23',
  surfaceHigh: '#22262F',
  border: '#2A2E38',
  text: '#F1F5F9',
  textMuted: '#9CA3AF',
  textDim: '#64748B',
  blue: '#3B82F6',
  red: '#EF4444',
  redDim: 'rgba(239,68,68,0.1)',
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function generateId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

type EditorProps = {
  visible: boolean;
  movement: Movement | null;  // null = new
  onClose: () => void;
  onSave: (m: Movement) => void;
  onDelete?: (id: string) => void;
  isPremium: boolean;
};

export default function MovementEditorModal({ visible, movement, onClose, onSave, onDelete, isPremium }: EditorProps) {
  const isEdit = !!movement;

  const [name, setName] = useState(movement?.name ?? '');
  const [description, setDescription] = useState(movement?.description ?? '');
  const [durMin, setDurMin] = useState(movement?.durationMin ?? 0);
  const [durSec, setDurSec] = useState(movement?.durationSec ?? 30);
  const [restSec, setRestSec] = useState(movement?.restSec ?? 30);

  React.useEffect(() => {
    if (visible) {
      setName(movement?.name ?? '');
      setDescription(movement?.description ?? '');
      setDurMin(movement?.durationMin ?? 0);
      setDurSec(movement?.durationSec ?? 30);
      setRestSec(movement?.restSec ?? 30);
    }
  }, [visible, movement]);

  function clamp(v: number, lo: number, hi: number) { return Math.min(Math.max(v, lo), hi); }

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: movement?.id ?? generateId(),
      name: name.trim(),
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
            <View style={{ flex: 1, marginHorizontal: 14 }}>
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

const e = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },
  headerRight: { fontSize: 12, fontWeight: '700', color: C.textDim, letterSpacing: 1.5 },
  editorTitle: { fontSize: 34, fontWeight: '800', color: C.text, marginBottom: 6 },
  titleUnderline: { height: 3, width: 36, backgroundColor: C.blue, borderRadius: 2, marginBottom: 28 },

  fieldLabel: { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.4, marginBottom: 8 },
  input: { backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border },

  // Duration picker
  durationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  durationCol: { alignItems: 'center' },
  durationColon: { fontSize: 48, fontWeight: '800', color: C.blue, marginHorizontal: 12, marginBottom: 8 },
  durationNum: { fontSize: 56, fontWeight: '800', color: C.blue, lineHeight: 64 },
  durBtn: { padding: 4 },
  durationLabels: { flexDirection: 'row', marginTop: 4 },
  durationLabel: { fontSize: 11, fontWeight: '700', color: C.textDim, letterSpacing: 1 },
  durationProgress: { height: 3, backgroundColor: C.blue, borderRadius: 2, marginTop: 16, marginBottom: 24, marginHorizontal: 0, opacity: 0.4 },

  // Rest
  restCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  restTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  restSub: { fontSize: 12, color: C.textDim },
  restBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surfaceHigh, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  restBtnText: { fontSize: 20, color: C.text, fontWeight: '700', lineHeight: 22 },
  restValue: { fontSize: 16, fontWeight: '700', color: C.blue, minWidth: 52, textAlign: 'center' },

  // Haptic
  hapticRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border, marginBottom: 24 },
  hapticTitle: { fontSize: 15, fontWeight: '600' },
  hapticSub: { fontSize: 12, color: C.textDim },

  doneBtn: { backgroundColor: C.blue, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  bottomBar: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: C.redDim, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', marginTop: 12 },
  deleteBtnText: { color: C.red, fontSize: 15, fontWeight: '600' },
});
