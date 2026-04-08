import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, StyleSheet, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_ICONS, type Routine } from '@/src/state/atoms';
import { BorderRadius, Spacing, Typography } from '@/src/state/theme';

const C = {
  bg:          '#0F1115',
  surface:     '#1A1D23',
  surfaceHigh: '#22262F',
  border:      '#2A2E38',
  text:        '#F1F5F9',
  textMuted:   '#9CA3AF',
  textDim:     '#64748B',
  blue:        '#3B82F6',
};

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export type FormMode = { mode: 'create' } | { mode: 'edit'; routine: Routine };

export type FormProps = {
  visible: boolean;
  formMode: FormMode;
  onClose: () => void;
  onSave: (routine: Routine) => void;
  onDelete?: (id: string) => void;
};

export default function RoutineFormModal({ visible, formMode, onClose, onSave, onDelete }: FormProps) {
  const isEdit   = formMode.mode === 'edit';
  const existing = isEdit ? formMode.routine : null;

  const [title,        setTitle]        = useState(existing?.title             ?? '');
  const [subtitle,     setSubtitle]     = useState(existing?.subtitle          ?? '');
  const [selectedIcon, setSelectedIcon] = useState(existing?.categoryIconIndex ?? 0);

  // Sync fields when switching between edit targets
  React.useEffect(() => {
    if (visible) {
      setTitle(existing?.title ?? '');
      setSubtitle(existing?.subtitle ?? '');
      setSelectedIcon(existing?.categoryIconIndex ?? 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handleSave() {
    if (!title.trim()) return;
    const movements = existing?.movements ?? [];
    // Duration and movement count are derived from actual movements
    const totalSec  = movements.reduce((acc, m) => acc + m.durationMin * 60 + m.durationSec, 0);
    const routine: Routine = {
      id:                existing?.id ?? generateId(),
      title:             title.trim(),
      subtitle:          subtitle.trim() || CATEGORY_ICONS[selectedIcon].label,
      durationMin:       Math.max(1, Math.ceil(totalSec / 60)),
      movementCount:     movements.length,
      categoryIconIndex: selectedIcon,
      isActive:          existing?.isActive ?? false,
      createdAt:         existing?.createdAt ?? Date.now(),
      movements,
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
          <TextInput
            style={[s.input, { height: 120, textAlignVertical: 'top', paddingTop: 14 }]}
            placeholder="What is this routine about?"
            placeholderTextColor={C.textDim}
            value={subtitle}
            onChangeText={setSubtitle}
            multiline
            numberOfLines={4}
          />

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

const s = StyleSheet.create({
  modalContainer:{ flex: 1, backgroundColor: C.bg },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md + 4, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle:    { ...Typography.bodyMedium, fontSize: 17, fontWeight: '700', color: C.text },
  modalCancel:   { ...Typography.bodyMedium, color: C.textMuted, fontWeight: '500' },
  fieldLabel:    { ...Typography.caption, fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.4, marginBottom: Spacing.sm },
  input:         { backgroundColor: C.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md - 2, ...Typography.bodyMedium, color: C.text, borderWidth: 1, borderColor: C.border },
  iconGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm + 4, marginTop: Spacing.xs },
  iconCell:      { width: '18%', aspectRatio: 1, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', gap: Spacing.xs },
  iconLabel:     { ...Typography.caption, fontSize: 9, fontWeight: '600' },
  deleteBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl + 4, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  deleteBtnText: { color: '#EF4444', ...Typography.bodyMedium, fontSize: 15, fontWeight: '600' },
});
