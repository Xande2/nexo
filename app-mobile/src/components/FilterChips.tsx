import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors as c} from '../tokens';
import {radius, space, touch} from '../theme';
import type {StatusCounts, StatusFilter} from '../format';

const options: {value: StatusFilter; label: string; key: keyof StatusCounts}[] = [
  {value: 'Todas', label: 'Todas', key: 'total'},
  {value: 'Aberto', label: 'Abertas', key: 'Aberto'},
  {value: 'Concluido', label: 'Concluídas', key: 'Concluido'},
];

export function FilterChips({value, counts, onChange}: {value: StatusFilter; counts: StatusCounts; onChange: (v: StatusFilter) => void}) {
  return <View style={styles.row} accessibilityRole="tablist" accessibilityLabel="Filtrar por status">
    {options.map(option => {
      const selected = option.value === value;
      return <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{selected}}
        accessibilityLabel={`${option.label}, ${counts[option.key]}`} onPress={() => onChange(option.value)}
        style={[styles.chip, selected && styles.selected]}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
        <View style={[styles.count, selected && styles.countSelected]}>
          <Text style={[styles.countText, selected && styles.labelSelected]}>{counts[option.key]}</Text>
        </View>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: space.xs, padding: space.xs, borderRadius: radius.card, backgroundColor: c.border},
  chip: {flex: 1, minHeight: touch, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.badge},
  selected: {backgroundColor: c.surface},
  label: {fontSize: 14, fontWeight: '600', color: c.muted},
  labelSelected: {color: c.primary},
  count: {minWidth: 22, paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: c.background, alignItems: 'center'},
  countSelected: {backgroundColor: c.openBg},
  countText: {fontSize: 12, lineHeight: 18, fontWeight: '700', color: c.muted},
});
