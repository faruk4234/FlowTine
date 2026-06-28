import { BorderRadius, useAppTheme } from '@/src/state/theme';
import { getRandomInspirePrompt } from '@/src/utils/inspirePrompt';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

interface InspireButtonProps {
  /** Function to set the prompt text in the parent component */
  setPromptText: (text: string) => void;
}

/**
 * Compact inline Inspire button.
 * Generates a random prompt and updates the parent via setPromptText.
 */
export const InspireButton: React.FC<InspireButtonProps> = ({ setPromptText }) => {
  const theme = useAppTheme();

  const handlePress = () => {
    const prompt = getRandomInspirePrompt();
    setPromptText(prompt);
  };

  return (
    <TouchableOpacity
      style={styles.button(theme)}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <Ionicons name="sparkles" size={12} color={theme.colors.primary} />
      <Text style={styles.text(theme)}>Inspire</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: (theme) =>
    ({
      height: 36,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.colors.surfaceElevated,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      shadowColor: '#00FFA3',
      shadowOpacity: 0.15,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
      maxWidth: 100
    }) as ViewStyle,
  text: (theme) =>
    ({
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 4,
    }) as TextStyle,
});

