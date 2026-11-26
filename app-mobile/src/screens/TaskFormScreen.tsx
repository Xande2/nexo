import React from 'react';
import {ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {colors as c, priorityLabels} from '../tokens';
import {priorityColors, radius, space, touch} from '../theme';
import type {Prioridade} from '../api';
import type {TaskState, TaskStore} from '../store';
import {Button} from '../components/Button';
import {ErrorBox} from '../components/Feedback';

type Props = {model: TaskStore; state: TaskState; onDone: () => void; onBack: () => void};

export function TaskFormScreen({model, state, onDone, onBack}: Props) {
  const busy = state.writing !== null;
  const titleLength = [...state.form.titulo].length;
  const submit = async () => {
    if (await model.submit()) {Keyboard.dismiss(); onDone();}
  };
  return <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <View style={styles.header}>
      <Text style={styles.brand}>nexo.</Text>
      <Text style={styles.heading} accessibilityRole="header">Nova tarefa</Text>
      <Text style={styles.subtitle}>Organize a próxima demanda da equipe.</Text>
    </View>
    <ErrorBox text={state.formError}/>

    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Título <Text style={styles.hint}>obrigatório</Text></Text>
        <Text style={styles.hint} accessibilityLabel={`${titleLength} de 200 caracteres`}>{titleLength}/200</Text>
      </View>
      <TextInput style={[styles.input, !!state.fields.titulo && styles.invalidInput]} value={state.form.titulo}
        accessibilityLabel="Título obrigatório" accessibilityHint="Até 200 caracteres" autoFocus editable={!busy}
        maxLength={200} placeholder="Ex.: Preparar pauta da reunião" placeholderTextColor={c.muted}
        onChangeText={titulo => model.editForm({titulo})} returnKeyType="next"/>
      {state.fields.titulo ? <FieldError text={state.fields.titulo}/> : null}
    </View>

    <View style={styles.field}>
      <Text style={styles.label}>Descrição <Text style={styles.hint}>opcional</Text></Text>
      <TextInput style={[styles.input, styles.description, !!state.fields.descricao && styles.invalidInput]}
        value={state.form.descricao} multiline textAlignVertical="top" editable={!busy} maxLength={5000}
        accessibilityLabel="Descrição opcional" accessibilityHint="Até 5000 caracteres"
        placeholder="Inclua os detalhes da demanda" placeholderTextColor={c.muted}
        onChangeText={descricao => model.editForm({descricao})}/>
      {state.fields.descricao ? <FieldError text={state.fields.descricao}/> : null}
    </View>

    <View style={styles.field}>
      <Text style={styles.label}>Prioridade</Text>
      <View style={styles.priorities} accessibilityRole="radiogroup" accessibilityLabel="Prioridade">
        {(['Baixa', 'Media', 'Alta'] as Prioridade[]).map(value => {
          const selected = state.form.prioridade === value;
          return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={priorityLabels[value]}
            accessibilityState={{checked: selected, disabled: busy}} disabled={busy}
            onPress={() => model.editForm({prioridade: value})}
            style={[styles.priority, selected && styles.prioritySelected, busy && styles.dimmed]}>
            <View style={[styles.dot, {backgroundColor: priorityColors(value).color}]}/>
            <Text style={[styles.priorityText, selected && styles.priorityTextSelected]}>{priorityLabels[value]}</Text>
          </Pressable>;
        })}
      </View>
      {state.fields.prioridade ? <FieldError text={state.fields.prioridade}/> : null}
    </View>

    <View style={styles.note}>
      <Feather name="circle" size={14} color={c.muted}/>
      <Text style={styles.hint}>A tarefa será cadastrada com status Aberto.</Text>
    </View>
    {state.writing === 'create' ? <ActivityIndicator color={c.primary} accessibilityLabel="Enviando tarefa"/> : null}
    <Button icon="plus" label={state.writing === 'create' ? 'Cadastrando…' : 'Cadastrar tarefa'} disabled={busy} onPress={() => {void submit();}}/>
    <Button variant="secondary" icon="arrow-left" label="Voltar para tarefas" disabled={busy} onPress={() => {Keyboard.dismiss(); onBack();}}/>
  </ScrollView>;
}

function FieldError({text}: {text: string}) {
  return <View style={styles.fieldError}>
    <Feather name="alert-circle" size={16} color={c.high}/>
    <Text accessibilityLiveRegion="polite" style={styles.errorText}>{text}</Text>
  </View>;
}

const styles = StyleSheet.create({
  form: {paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.xxl, gap: space.lg},
  header: {gap: space.xs},
  brand: {color: c.primary, fontSize: 28, fontWeight: '800', letterSpacing: -1},
  heading: {color: c.primary, fontSize: 28, lineHeight: 34, fontWeight: '700'},
  subtitle: {color: c.muted, fontSize: 15, lineHeight: 22},
  field: {gap: space.sm},
  labelRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'},
  label: {fontSize: 15, lineHeight: 22, color: c.primary, fontWeight: '600'},
  hint: {fontSize: 13, lineHeight: 20, color: c.muted, fontWeight: '400'},
  input: {backgroundColor: c.surface, borderColor: c.muted, borderWidth: 1, borderRadius: radius.card, minHeight: touch, padding: space.md, color: c.primary, fontSize: 15, lineHeight: 22},
  description: {minHeight: 120},
  invalidInput: {borderColor: c.high, borderWidth: 2},
  priorities: {flexDirection: 'row', gap: space.sm},
  priority: {flex: 1, minHeight: touch, flexDirection: 'row', gap: space.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.secondary, borderRadius: radius.card, backgroundColor: c.surface},
  prioritySelected: {backgroundColor: c.primary, borderColor: c.primary},
  dot: {width: 8, height: 8, borderRadius: 4},
  priorityText: {fontSize: 15, lineHeight: 22, color: c.primary},
  priorityTextSelected: {color: c.surface, fontWeight: '600'},
  dimmed: {opacity: 0.55},
  note: {flexDirection: 'row', alignItems: 'center', gap: space.sm},
  fieldError: {flexDirection: 'row', alignItems: 'center', gap: 6},
  errorText: {flex: 1, color: c.high, fontSize: 14, lineHeight: 20},
});
