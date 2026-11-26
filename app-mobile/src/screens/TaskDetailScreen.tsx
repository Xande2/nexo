import React, {useEffect} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {colors as c} from '../tokens';
import {priorityColors, radius, space} from '../theme';
import {formatDate} from '../format';
import type {TaskState, TaskStore} from '../store';
import {PriorityBadge, StatusBadge} from '../components/Badge';
import {Button} from '../components/Button';
import {ErrorBox, Notice} from '../components/Feedback';

type Props = {model: TaskStore; state: TaskState; id: number; onBack: () => void};

export function TaskDetailScreen({model, state, id, onBack}: Props) {
  const task = state.tasks.find(item => item.id === id);
  // A tarefa pode ter sido excluída na Web: após uma atualização, volta para a lista.
  useEffect(() => {if (!task) onBack();}, [task, onBack]);
  if (!task) return null;

  const busy = state.writing !== null;
  const done = task.status === 'Concluido';
  const action = done ? 'Reabrir tarefa' : 'Concluir tarefa';
  return <ScrollView contentContainerStyle={styles.container}>
    <View style={styles.back}>
      <Button variant="ghost" compact icon="arrow-left" label="Voltar para tarefas" disabled={busy} onPress={onBack}/>
    </View>
    <View style={styles.card}>
      <View style={[styles.stripe, {backgroundColor: priorityColors(task.prioridade).color}]}/>
      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">{task.titulo}</Text>
        <View style={styles.badges}>
          <PriorityBadge priority={task.prioridade}/>
          <StatusBadge status={task.status}/>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Descrição</Text>
          <Text style={task.descricao ? styles.description : styles.placeholder}>{task.descricao || 'Sem descrição'}</Text>
        </View>
        <View style={styles.dateRow}>
          <Feather name="calendar" size={16} color={c.muted}/>
          <Text style={styles.placeholder}>Criada em {formatDate(task.criado_em)}</Text>
        </View>
      </View>
    </View>
    <ErrorBox text={state.listError} retryLabel={state.refreshing ? 'Atualizando…' : 'Atualizar tarefa'}
      busy={busy || state.refreshing} onRetry={() => {void model.refresh();}}/>
    <Notice text={state.notice} onDismiss={model.dismissNotice}/>
    <Button icon={done ? 'rotate-ccw' : 'check'} label={state.writing === id ? 'Atualizando…' : action}
      disabled={busy} onPress={() => {void model.toggle(id);}}/>
  </ScrollView>;
}

const styles = StyleSheet.create({
  back: {alignSelf: 'flex-start', marginLeft: -space.md},
  container: {paddingHorizontal: space.xl, paddingVertical: space.lg, gap: space.lg},
  card: {flexDirection: 'row', overflow: 'hidden', backgroundColor: c.surface, borderRadius: radius.card, borderWidth: 1, borderColor: c.border},
  stripe: {width: 4},
  body: {flex: 1, padding: space.xl, gap: space.lg},
  title: {fontSize: 24, lineHeight: 30, fontWeight: '700', color: c.primary},
  badges: {flexDirection: 'row', flexWrap: 'wrap', gap: space.sm},
  section: {gap: space.xs},
  label: {fontSize: 13, fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5},
  description: {fontSize: 15, lineHeight: 22, color: c.primary},
  placeholder: {fontSize: 15, lineHeight: 22, color: c.muted},
  dateRow: {flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.md, borderTopWidth: 1, borderColor: c.border},
});
