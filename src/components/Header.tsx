import { Spacing, Typography, useAppTheme } from '@/src/state/theme';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

export interface HeaderProps {
  title: string;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

export function Header({ title, rightElement, style }: HeaderProps) {
  const theme = useAppTheme();
  return (
    <View style={[s.header, style]}>
      <Text style={[s.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {rightElement && <View style={s.rightSlot}>{rightElement}</View>}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.hero,
    fontSize: 25,
    fontWeight: '800',
    flex: 1,
  },
  rightSlot: {
    marginLeft: Spacing.sm,
  },
});
