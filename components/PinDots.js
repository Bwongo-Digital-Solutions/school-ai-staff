import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

const FILLED_COUNT = 4;
const TOTAL_COUNT = 6;

export default function PinDots() {
  const dots = Array.from({ length: TOTAL_COUNT });
  return (
    <View style={styles.row}>
      {dots.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index < FILLED_COUNT ? styles.filled : styles.empty,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  filled: {
    backgroundColor: colors.accent,
  },
  empty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.neutral[600],
  },
});
