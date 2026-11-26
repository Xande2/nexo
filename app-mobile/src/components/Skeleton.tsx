import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors as c} from '../tokens';
import {radius, space} from '../theme';

/** Três cartões cinza no formato da lista enquanto a primeira carga acontece. */
export function Skeleton() {
  return <View accessible accessibilityRole="progressbar" accessibilityLabel="Carregando tarefas" style={styles.list}>
    {[0, 1, 2].map(key => <View key={key} style={styles.card}>
      <View style={[styles.line, {width: '70%'}]}/>
      <View style={styles.badges}><View style={styles.badge}/><View style={styles.badge}/></View>
      <View style={styles.button}/>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  list: {gap: space.md},
  card: {gap: space.md, padding: space.lg, borderRadius: radius.card, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface},
  line: {height: 18, borderRadius: radius.badge, backgroundColor: c.border},
  badges: {flexDirection: 'row', gap: space.sm},
  badge: {width: 72, height: 24, borderRadius: radius.badge, backgroundColor: c.background},
  button: {height: 48, borderRadius: radius.card, backgroundColor: c.background},
});
