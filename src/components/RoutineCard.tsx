import { CATEGORY_ICONS, type Routine } from '@/src/state/atoms';
import { BorderRadius, Spacing, Typography } from '@/src/state/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppPalette as C } from '@/src/state/colors';

function ActiveBadge() {
  return (
    <View style={s.activeBadge}>
      <View style={s.activeDot} />
      <Text style={s.activeBadgeText}>CURRENTLY ACTIVE</Text>
    </View>
  );
}

export type CardProps = {
  routine: Routine;
  isRunning: boolean;
  onPress: () => void;  // tap card body → routine detail
  onPlay: () => void;   // tap play btn → timer
  onEdit: () => void;   // tap pencil → edit modal
};

export default function RoutineCard({ routine, isRunning, onPress, onPlay, onEdit }: CardProps) {
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
          color={C.white}
          style={{ marginLeft: isRunning ? 0 : 3 }}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: BorderRadius.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center' },
  cardActive: { borderWidth: 1, borderColor: C.border },

  activeBadge: { position: 'absolute', top: Spacing.md, left: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  activeDot: { width: 7, height: 7, borderRadius: BorderRadius.round, backgroundColor: C.green },
  activeBadgeText: { ...Typography.caption, fontSize: 9, fontWeight: '700', color: C.green, letterSpacing: 1.2 },

  cardTopRight: { position: 'absolute', top: Spacing.md, right: Spacing.lg, flexDirection: 'row', alignItems: 'center' },
  cardDuration: { ...Typography.caption, fontWeight: '700', color: C.textDim, letterSpacing: 1 },

  cardIconWrap: { width: 64, height: 64, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md, marginTop: Spacing.sm },
  cardTextBlock: { flex: 1, marginTop: Spacing.sm },
  cardTitle: { ...Typography.heading, fontWeight: '700', color: C.text, marginBottom: Spacing.xs },
  cardSubtitle: { ...Typography.bodySmall, color: C.textMuted, marginBottom: Spacing.xs },
  cardMeta: { ...Typography.caption, fontWeight: '700', color: C.textDim, letterSpacing: 1 },

  playBtn: { width: 52, height: 52, borderRadius: BorderRadius.round, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center', marginLeft: Spacing.sm, marginTop: Spacing.md },
  playBtnPaused: { backgroundColor: C.surfaceHigh, borderWidth: 2, borderColor: C.blue },
});
