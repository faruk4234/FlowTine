import { type Movement } from "@/src/state/atoms";
import { BorderRadius, Spacing, Typography } from "@/src/state/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const C = {
  surface: "#1A1D23",
  border: "#2A2E38",
  text: "#F1F5F9",
  textDim: "#64748B",
  blue: "#3B82F6",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDuration(min: number, sec: number) {
  return `${pad(min)}:${pad(sec)}`;
}

function formatRest(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${pad(m)}:${pad(s)} Rest` : `0:${pad(s)} Rest`;
}

type MovRowProps = {
  movement: Movement;
  onPress: () => void;
  onDelete: (id: string) => void;
  onLongPressDrag?: () => void;
  isDragging?: boolean;
};

export default function MovementRow({
  movement,
  onPress,
  onDelete,
  onLongPressDrag,
  isDragging = false,
}: MovRowProps) {
  const repeat = Math.max(1, movement.repeatCount ?? 1);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[r.movRow, isDragging && r.movRowDragging]}
      onPress={onPress}
    >
      <Pressable
        onLongPress={onLongPressDrag}
        delayLongPress={180}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name="reorder-three"
          size={22}
          color={C.textDim}
          style={{ marginRight: Spacing.sm + 4 }}
        />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={r.movName}>{movement.name}</Text>
        <View style={r.movMeta}>
          <Ionicons name="time" size={13} color={C.blue} />
          <Text style={r.movMetaText}>
            {formatDuration(movement.durationMin, movement.durationSec)}
          </Text>
          <Ionicons
            name="timer-outline"
            size={13}
            color={C.textDim}
            style={{ marginLeft: Spacing.sm }}
          />
          <Text style={[r.movMetaText, { color: C.textDim }]}>
            {formatRest(movement.restSec)}
          </Text>
          {repeat > 1 && (
            <>
              <Ionicons
                name="repeat"
                size={13}
                color={C.textDim}
                style={{ marginLeft: Spacing.sm }}
              />
              <Text style={[r.movMetaText, { color: C.textDim }]}>x{repeat}</Text>
            </>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          onDelete(movement.id);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={18} color={C.textDim} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const r = StyleSheet.create({
  movRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  movRowDragging: {
    opacity: 0.92,
  },
  movName: {
    ...Typography.bodyMedium,
    fontWeight: "600",
    color: C.text,
    marginBottom: Spacing.xs,
  },
  movMeta: { flexDirection: "row", alignItems: "center" },
  movMetaText: {
    ...Typography.caption,
    fontSize: 13,
    color: C.blue,
    marginLeft: Spacing.xs,
  },
});
