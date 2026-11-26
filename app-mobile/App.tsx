import React, {useCallback, useEffect, useState, useSyncExternalStore} from 'react';
import {BackHandler, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {createApi} from './src/api';
import {createTaskStore} from './src/store';
import type {TaskStore} from './src/store';
import type {StatusFilter} from './src/format';
import {colors as c} from './src/tokens';
import {TaskListScreen} from './src/screens/TaskListScreen';
import {TaskDetailScreen} from './src/screens/TaskDetailScreen';
import {TaskFormScreen} from './src/screens/TaskFormScreen';

const store = createTaskStore(createApi({baseUrl: process.env.EXPO_PUBLIC_API_URL ?? ''}));

type Screen = {name: 'list'} | {name: 'detail'; id: number} | {name: 'form'};

/** Navegação por estado: três telas não justificam uma biblioteca de navegação. */
export function TasksScreen({model}: {model: TaskStore}) {
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  const [screen, setScreen] = useState<Screen>({name: 'list'});
  const [filter, setFilter] = useState<StatusFilter>('Todas');
  const toList = useCallback(() => setScreen({name: 'list'}), []);
  const busy = state.writing !== null;

  useEffect(() => {void model.refresh();}, [model]);

  // Botão voltar do Android: fecha detalhes/formulário, exceto durante um envio.
  useEffect(() => {
    if (screen.name === 'list') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy) toList();
      return true;
    });
    return () => subscription.remove();
  }, [screen.name, busy, toList]);

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content"/>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        {screen.name === 'form'
          ? <TaskFormScreen model={model} state={state} onDone={() => {setFilter('Todas'); toList();}} onBack={toList}/>
          : screen.name === 'detail'
            ? <TaskDetailScreen model={model} state={state} id={screen.id} onBack={toList}/>
            : <TaskListScreen model={model} state={state} filter={filter} onFilter={setFilter}
                onOpen={id => setScreen({name: 'detail', id})} onNew={() => setScreen({name: 'form'})}/>}
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export default function App() {
  return <SafeAreaProvider><TasksScreen model={store}/></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: c.background},
  flex: {flex: 1},
  container: {flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center'},
});
