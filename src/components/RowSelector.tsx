import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, BorderRadius } from '@/src/state/theme';

export interface RowSelectorProps {
  icon: string;
  label: string;
  value: string;
  primaryValue?: boolean;
  onPress: () => void;
}

export function RowSelector({ icon, label, value, primaryValue = true, onPress }: RowSelectorProps) {
  const theme = useAppTheme();
  return (
    <TouchableOpacity
      style={[s.rowCard, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={s.rowLeft}>
        <Ionicons name={icon as any} size={20} color={theme.colors.primary} />
        <Text style={[s.rowLabel, { color: theme.colors.text }]}>{label}</Text>
      </View>
      <View style={s.rowRight}>
        <Text style={[primaryValue ? s.rowValue : s.rowValueMuted, { color: primaryValue ? theme.colors.primary : theme.colors.mutedText }]}>
          {value}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedText} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  rowCard: {
    flexDirection: 'row',
    height: 56,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowValueMuted: {
    fontSize: 15,
    fontWeight: '600',
  },
});
