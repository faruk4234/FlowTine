import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius } from '../state/theme';

import { AppPalette as C, palette } from '@/src/state/colors';

interface SettingRowProps {
    icon: string;
    title: string;
    subtitle?: string;
    isSwitch?: boolean;
    switchValue?: boolean;
    onValueChange?: (value: boolean) => void;
    onPress?: () => void;
    isLink?: boolean;
}

export const SettingRow = ({ icon, title, subtitle, isSwitch, switchValue, onValueChange, onPress, isLink }: SettingRowProps) => (
    <TouchableOpacity
        style={styles.settingRow}
        activeOpacity={isSwitch ? 1 : 0.7}
        onPress={isSwitch ? () => onValueChange?.(!switchValue) : onPress}
    >
        <View style={styles.iconContainer}>
            <Ionicons name={icon} size={20} color={C.blue} />
        </View>
        <View style={styles.textContainer}>
            <Text style={styles.rowTitle}>{title}</Text>
            {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
        </View>
        {isSwitch ? (
            <Switch
                value={switchValue}
                onValueChange={onValueChange}
                trackColor={{ false: C.surfaceHigh, true: C.blue }}
                thumbColor={Platform.OS === 'ios' ? C.white : (switchValue ? C.white : palette.switchThumbOff)}
            />
        ) : isLink ? (
            <Ionicons name="chevron-forward" size={20} color={C.textDim} />
        ) : (
            <Ionicons name="open-outline" size={20} color={C.textDim} />
        )}
    </TouchableOpacity>
);

export default SettingRow;

const styles = StyleSheet.create({
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.sm,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    rowTitle: {
        color: C.text,
        fontSize: 16,
        fontWeight: '600',
    },
    rowSubtitle: {
        color: C.textDim,
        fontSize: 13,
        marginTop: 2,
    },
});
