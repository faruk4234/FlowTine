import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_ICONS, type Routine } from '@/src/state/atoms';

const C = {
  surface:     '#1A1D23',
  surfaceHigh: '#22262F',
  border:      '#2A2E38',
  text:        '#F1F5F9',
  textMuted:   '#9CA3AF',
  textDim:     '#64748B',
  blue:        '#3B82F6',
  green:       '#10B981',
};

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
          color="#FFF"
          style={{ marginLeft: isRunning ? 0 : 3 }}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
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
});
