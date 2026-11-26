import React, {useCallback, useMemo} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {colors as c} from '../tokens';
import {radius, space} from '../theme';
import {countByStatus, filterTasks, summary} from '../format';
import type {StatusFilter} from '../format';
import type {TaskState, TaskStore} from '../store';
import {Button, IconButton} from '../components/Button';
import {ErrorBox, Notice} from '../components/Feedback';
import {FilterChips} from '../components/FilterChips';
import {Skeleton} from '../components/Skeleton';
import {TaskCard} from '../components/TaskCard';

type Props = {
  model: TaskStore; state: TaskState; filter: StatusFilter;
  onFilter: (filter: StatusFilter) => void; onOpen: (id: number) => void; onNew: () => void;
};

const filterEmpty: Record<StatusFilter, string> = {
  Todas: 'Nenhuma tarefa por aqui', Aberto: 'Nenhuma tarefa aberta', Concluido: 'Nenhuma tarefa concluída',
};

export function TaskListScreen({model, state, filter, onFilter, onOpen, onNew}: Props) {
  const busy = state.writing !== null;
  const counts = useMemo(() => countByStatus(state.tasks), [state.tasks]);
  const visible = useMemo(() => filterTasks(state.tasks, filter), [state.tasks, filter]);
  const refresh = useCallback(() => {void model.refresh();}, [model]);
  const dismiss = useCallback(() => model.dismissNotice(), [model]);

  const empty = !state.loaded
    ? state.refreshing ? <Skeleton/> : <EmptyState icon="download-cloud" title="Vamos carregar suas tarefas"
        text="Use Atualizar lista para buscar as demandas da equipe."/>
    : state.tasks.length === 0
      ? <EmptyState icon="inbox" title="Nenhuma tarefa por aqui" text="Cadastre uma nova demanda para começar.">
          <Button label="Nova tarefa" icon="plus" disabled={busy} onPress={onNew}/>
        </EmptyState>
      : <EmptyState icon="filter" title={filterEmpty[filter]} text="Tente outro filtro para ver as demais tarefas.">
          <Button variant="secondary" label="Ver todas" onPress={() => onFilter('Todas')}/>
        </EmptyState>;

  return <>
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.brand}>nexo.</Text>
          <Text style={styles.heading} accessibilityRole="header">Tarefas</Text>
          <Text style={styles.subtitle}>{state.loaded ? summary(counts) : 'Conectando demandas a resultados.'}</Text>
        </View>
        <IconButton icon="refresh-cw" label={state.refreshing ? 'Atualizando lista' : 'Atualizar lista'}
          disabled={busy || state.refreshing} onPress={refresh}/>
      </View>
      <FilterChips value={filter} counts={counts} onChange={onFilter}/>
      <ErrorBox text={state.listError} onRetry={refresh} busy={busy || state.refreshing}
        retryLabel={state.refreshing ? 'Atualizando…' : 'Tentar novamente'}/>
      <Notice text={state.notice} onDismiss={dismiss}/>
    </View>
    <FlatList data={visible} keyExtractor={task => String(task.id)}
      contentContainerStyle={styles.list} refreshing={state.refreshing && state.loaded} onRefresh={refresh}
      renderItem={({item}) => <TaskCard task={item} busy={busy} updating={state.writing === item.id}
        onOpen={() => onOpen(item.id)} onToggle={() => {void model.toggle(item.id);}}/>}
      ListEmptyComponent={empty}/>
    <View style={styles.footer}>
      <Button label="Nova tarefa" icon="plus" disabled={busy} onPress={onNew}/>
    </View>
  </>;
}

function EmptyState({icon, title, text, children}: {icon: React.ComponentProps<typeof Feather>['name']; title: string; text: string; children?: React.ReactNode}) {
  return <View style={styles.empty}>
    <View style={styles.emptyIcon}><Feather name={icon} size={28} color={c.secondary}/></View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={[styles.subtitle, styles.center]}>{text}</Text>
    {children ? <View style={styles.emptyAction}>{children}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  header: {paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.md, gap: space.md},
  headerRow: {flexDirection: 'row', alignItems: 'flex-start', gap: space.md},
  headerText: {flex: 1, gap: space.xs},
  brand: {color: c.primary, fontSize: 28, fontWeight: '800', letterSpacing: -1},
  heading: {color: c.primary, fontSize: 28, lineHeight: 34, fontWeight: '700'},
  subtitle: {color: c.muted, fontSize: 15, lineHeight: 22},
  center: {textAlign: 'center'},
  list: {paddingHorizontal: space.xl, paddingBottom: space.lg, gap: space.md, flexGrow: 1},
  footer: {padding: space.xl, paddingTop: space.lg, borderTopWidth: 1, borderColor: c.border, backgroundColor: c.background},
  empty: {alignItems: 'center', paddingVertical: space.xxl, gap: space.sm},
  emptyIcon: {width: 64, height: 64, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: c.openBg, marginBottom: space.sm},
  emptyTitle: {fontSize: 20, color: c.primary, fontWeight: '600', textAlign: 'center'},
  emptyAction: {alignSelf: 'stretch', marginTop: space.md},
});
