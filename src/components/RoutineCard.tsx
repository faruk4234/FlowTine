import { CATEGORY_ICONS, type Routine } from '@/src/state/atoms';
import { AppPalette as C } from '@/src/state/colors';
import { BorderRadius, Spacing, Typography } from '@/src/state/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function ActiveBadge() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={s.activeBadge}>
      <Animated.View style={[s.activeDot, { opacity }]} />
      <Text style={s.activeBadgeText}>CURRENTLY ACTIVE</Text>
    </View>
  );
}

export type CardProps = {
  routine: Routine;
  isActive: boolean;
  activeStepLabel?: string;
  onPress: () => void;
  onPlay: () => void;
  onEdit: () => void;
};

export default function RoutineCard({
  routine,
  isActive,
  activeStepLabel,
  onPress,
  onPlay,
  onEdit,
}: CardProps) {
  const cat = CATEGORY_ICONS[routine.categoryIconIndex] ?? CATEGORY_ICONS[0];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[s.card, isActive && s.cardActive]}
    >
      <View style={s.cardInner}>
        <View style={s.topRow}>
          {isActive ? (
            <ActiveBadge />
          ) : (
            <View style={[s.cardIconWrap, { backgroundColor: cat.bgColor }]}>
              <Ionicons name={cat.name as keyof typeof Ionicons.glyphMap} size={22} color={cat.color} />
            </View>
          )}
          <View style={s.topRowRight}>
            <Text style={s.cardDuration}>{routine.durationMin} MIN</Text>
            <TouchableOpacity
              onPress={onEdit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={s.editBtn}
            >
              <Ionicons name="pencil" size={15} color={C.textDim} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.bodyRow}>
          <View style={s.textCol}>
            {isActive && activeStepLabel ? (
              <View style={s.stepRow}>
                <View style={s.stepBar} />
                <Text style={s.stepLabel}>{activeStepLabel}</Text>
              </View>
            ) : null}
            <Text style={s.cardTitle}>{routine.title}</Text>
            <Text style={s.cardSubtitle}>{routine.subtitle}</Text>
            <Text style={s.cardMeta}>{routine.movementCount} MOVEMENTS</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[s.playBtn, isActive ? s.playBtnActive : s.playBtnInactive]}
            onPress={onPlay}
          >
            <Ionicons
              name="play"
              size={22}
              color={isActive ? C.white : C.blue}
              style={{ marginLeft: 3 }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardActive: {
    backgroundColor: C.surfaceHigh,
    borderColor: C.border,
  },
  cardInner: { gap: Spacing.md },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  topRowRight: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  cardDuration: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: C.text,
    letterSpacing: 1.2,
  },
  editBtn: { marginLeft: Spacing.sm },

  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  activeDot: { width: 7, height: 7, borderRadius: BorderRadius.round, backgroundColor: C.green },
  activeBadgeText: {
    ...Typography.caption,
    fontSize: 9,
    fontWeight: '800',
    color: C.green,
    letterSpacing: 1.4,
  },

  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bodyRow: { flexDirection: 'row', alignItems: 'center' },
  textCol: { flex: 1, paddingRight: Spacing.md, gap: Spacing.xs },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  stepBar: { width: 3, height: 28, borderRadius: 2, backgroundColor: C.textDim },
  stepLabel: {
    fontSize: 36,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -1,
    lineHeight: 40,
  },

  cardTitle: {
    ...Typography.heading,
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  cardSubtitle: { ...Typography.bodySmall, color: C.textMuted, lineHeight: 20 },
  cardMeta: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: C.textDim,
    letterSpacing: 1.2,
    marginTop: Spacing.xs,
  },

  playBtn: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnActive: {
    backgroundColor: C.blue,
    borderWidth: 2,
    borderColor: C.bg,
    shadowColor: C.blue,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  playBtnInactive: {
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.blue,
  },
});
