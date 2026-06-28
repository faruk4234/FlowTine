import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, BorderRadius } from '@/src/state/theme';

export interface SegmentedOption {
  id: string;
  label: string;
  icon?: string;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  height?: number;
  style?: ViewStyle;
}

export function SegmentedControl({
  options,
  selectedId,
  onSelect,
  height = 48,
  style,
}: SegmentedControlProps) {
  const theme = useAppTheme();
  
  return (
    <View
      style={[
        s.container,
        { backgroundColor: theme.colors.surfaceElevated, height },
        style,
      ]}
    >
      {options.map((option) => {
        const isActive = option.id === selectedId;
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              s.button,
              isActive && [s.activeButton, { backgroundColor: theme.colors.surface }],
            ]}
            onPress={() => onSelect(option.id)}
            activeOpacity={0.9}
          >
            <View style={s.labelContainer}>
              {option.icon && (
                <Ionicons
                  name={option.icon as any}
                  size={16}
                  color={isActive ? theme.colors.primary : theme.colors.text}
                  style={s.icon}
                />
              )}
              <Text
                style={[
                  s.text,
                  { color: theme.colors.text },
                  isActive && { color: theme.colors.primary, fontWeight: '700' },
                ]}
              >
                {option.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: 4,
    width: '100%',
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md - 2,
    flexDirection: 'row',
  },
  activeButton: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
