import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

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
  
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = options.findIndex((opt) => opt.id === selectedId);
  const translateX = useSharedValue(0);

  const padding = 4;
  const segmentWidth = containerWidth ? (containerWidth - padding * 2) / options.length : 0;

  useEffect(() => {
    if (segmentWidth && activeIndex >= 0) {
      translateX.value = withTiming(activeIndex * segmentWidth, {
        duration: 200,
      });
    }
  }, [activeIndex, segmentWidth, translateX]);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const handlePress = (id: string) => {
    if (id !== selectedId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onSelect(id);
    }
  };

  const rSliderStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View
      style={[
        s.container,
        { backgroundColor: theme.colors.surfaceElevated, height },
        style,
      ]}
      onLayout={onLayout}
    >
      {/* Sliding Background */}
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            s.activeSlider,
            {
              width: segmentWidth,
              backgroundColor: theme.colors.surface,
              top: padding,
              bottom: padding,
              left: padding,
            },
            rSliderStyle,
          ]}
        />
      )}

      {/* Segment Buttons */}
      {options.map((option) => {
        const isActive = option.id === selectedId;
        return (
          <TouchableOpacity
            key={option.id}
            style={s.button}
            onPress={() => handlePress(option.id)}
            activeOpacity={0.9}
          >
            <View style={s.labelContainer}>
              {option.icon && (
                <Ionicons
                  name={option.icon as any}
                  size={16}
                  color={isActive ? theme.colors.primary : theme.colors.mutedText}
                  style={s.icon}
                />
              )}
              <Text
                style={[
                  s.text,
                  { color: theme.colors.mutedText },
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
    position: 'relative',
  },
  activeSlider: {
    position: 'absolute',
    borderRadius: BorderRadius.md - 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    flexDirection: 'row',
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
