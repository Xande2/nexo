import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {colors as c, priorityLabels, statusLabels} from '../tokens';
import {priorityColors, radius, space} from '../theme';
import type {Prioridade, Status} from '../api';

export function PriorityBadge({priority}: {priority: Prioridade}) {
  const {color, backgroundColor} = priorityColors(priority);
  return <View style={[styles.badge, {backgroundColor}]} accessible accessibilityLabel={`Prioridade ${priorityLabels[priority]}`}>
    <View style={[styles.dot, {backgroundColor: color}]}/>
    <Text style={[styles.text, {color}]}>{priorityLabels[priority]}</Text>
  </View>;
}

export function StatusBadge({status}: {status: Status}) {
  const done = status === 'Concluido';
  const color = done ? c.low : c.open;
  return <View style={[styles.badge, {backgroundColor: done ? c.lowBg : c.openBg}]} accessible accessibilityLabel={`Status ${statusLabels[status]}`}>
    <Feather name={done ? 'check-circle' : 'circle'} size={13} color={color}/>
    <Text style={[styles.text, {color}]}>{statusLabels[status]}</Text>
  </View>;
}

const styles = StyleSheet.create({
  badge: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.badge},
  dot: {width: 8, height: 8, borderRadius: 4},
  text: {fontSize: 13, lineHeight: 20, fontWeight: '600'},
});
