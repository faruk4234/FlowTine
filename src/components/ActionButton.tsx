import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, BorderRadius } from '@/src/state/theme';

export interface ActionButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  iconColor?: string;
}

export function ActionButton({ 
  title, 
  onPress, 
  loading = false, 
  disabled = false, 
  icon, 
  style,
  textStyle,
  iconColor = "#050D0A"
}: ActionButtonProps) {
  const theme = useAppTheme();
  
  return (
    <TouchableOpacity
      style={[
        s.btn, 
        { backgroundColor: theme.colors.primary }, 
        disabled && s.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#050D0A" />
      ) : (
        <>
          {icon && <Ionicons name={icon as any} size={16} color={iconColor} style={s.icon} />}
          <Text style={[s.btnText, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    height: 56,
    borderRadius: BorderRadius.round,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#00FFA3',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#050D0A',
  },
  icon: {
    marginRight: 6,
  },
  disabled: {
    opacity: 0.6,
  },
});
