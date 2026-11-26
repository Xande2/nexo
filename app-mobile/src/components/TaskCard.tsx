import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {colors as c} from '../tokens';
import {priorityColors, radius, space} from '../theme';
import {formatDate} from '../format';
import {PriorityBadge, StatusBadge} from './Badge';
import {Button} from './Button';
import type {Chamado} from '../api';

type Props = {task: Chamado; busy: boolean; updating: boolean; onOpen: () => void; onToggle: () => void};

export function TaskCard({task, busy, updating, onOpen, onToggle}: Props) {
  const done = task.status === 'Concluido';
  const action = done ? 'Reabrir' : 'Concluir';
  return <View style={styles.card}>
    <View style={[styles.stripe, {backgroundColor: priorityColors(task.prioridade).color}]}/>
    <View style={styles.body}>
      <Pressable accessibilityRole="button" accessibilityLabel={task.titulo} accessibilityHint="Abre os detalhes"
        onPress={onOpen} style={({pressed}) => [styles.open, pressed && styles.pressed]}>
        <View style={styles.titleRow}>
          {done ? <Feather name="check-circle" size={18} color={c.success}/> : null}
          <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>{task.titulo}</Text>
          <Feather name="chevron-right" size={20} color={c.muted}/>
        </View>
        <View style={styles.meta}>
          <PriorityBadge priority={task.prioridade}/>
          <StatusBadge status={task.status}/>
          <Text style={styles.date}>{formatDate(task.criado_em)}</Text>
        </View>
      </Pressable>
      <Button variant="secondary" compact icon={done ? 'rotate-ccw' : 'check'}
        label={updating ? 'Atualizando…' : action} accessibilityLabel={`${action} tarefa: ${task.titulo}`}
        disabled={busy} onPress={onToggle}/>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: {flexDirection: 'row', overflow: 'hidden', backgroundColor: c.surface, borderRadius: radius.card, borderWidth: 1, borderColor: c.border},
  stripe: {width: 4},
  body: {flex: 1, padding: space.lg, gap: space.md},
  open: {gap: space.sm, minHeight: 48, borderRadius: radius.badge},
  pressed: {opacity: 0.7},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: space.sm},
  title: {flex: 1, fontSize: 17, lineHeight: 24, color: c.primary, fontWeight: '600'},
  titleDone: {color: c.muted},
  meta: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm},
  date: {fontSize: 13, lineHeight: 20, color: c.muted},
});
