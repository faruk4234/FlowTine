import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Modal, StyleSheet, Text, View, TouchableWithoutFeedback, Image, Alert, Platform } from 'react-native';
import { useAppTheme, BorderRadius, Spacing } from '@/src/state/theme';
import { ActionButton } from '@/src/components';
import { AppPalette as C } from '@/src/state/colors';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertOptions = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  imageUrl?: string;
};

type AlertContextType = {
  showAlert: (title: string, message?: string, buttons?: AlertButton[], imageUrl?: string) => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within AlertProvider');
  return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const theme = useAppTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);

  const showAlert = (title: string, message?: string, buttons?: AlertButton[], imageUrl?: string) => {
    const alertButtons = buttons || [{ text: 'OK' }];

    setOptions({ title, message, buttons: alertButtons, imageUrl });
    setIsVisible(true);
  };

  const closeAlert = () => {
    setIsVisible(false);
    setTimeout(() => setOptions(null), 300); // Wait for fade out animation
  };

  const handleButtonPress = (btn: AlertButton) => {
    closeAlert();
    if (btn.onPress) btn.onPress();
  };

  // Default to an "OK" button if none provided
  const buttons = options?.buttons || [{ text: 'OK' }];

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeAlert}
      >
        <TouchableWithoutFeedback onPress={closeAlert}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[
                styles.dialog,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border || 'rgba(255, 255, 255, 0.12)',
                  borderWidth: 1,
                }
              ]}>
                {options?.imageUrl && (
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: options.imageUrl }} style={styles.circleImage} />
                  </View>
                )}
                {options?.title && (
                  <Text style={[styles.title, { color: theme.colors.text }]}>
                    {options.title}
                  </Text>
                )}
                {options?.message && (
                  <Text style={[styles.message, { color: theme.colors.mutedText }]}>
                    {options.message}
                  </Text>
                )}
                <View style={styles.buttonContainer}>
                  {buttons.map((btn, index) => {
                    const isCancel = btn.style === 'cancel';
                    const isDestructive = btn.style === 'destructive';
                    
                    return (
                      <ActionButton
                        key={index}
                        title={btn.text}
                        onPress={() => handleButtonPress(btn)}
                        style={[
                          styles.button,
                          isCancel && { backgroundColor: theme.colors.surface, borderColor: theme.colors.border || 'rgba(255,255,255,0.1)', borderWidth: 1 },
                          isDestructive && { backgroundColor: theme.colors.accent },
                          buttons.length > 1 && { flex: 1, minWidth: 0 }
                        ]}
                        textStyle={[
                          isCancel && { color: theme.colors.text },
                          isDestructive && { color: C.white }
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  circleImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#00FFA3',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    justifyContent: 'center'
  },
  button: {
    height: 44, // Slightly smaller than standard 56px action button
  }
});
