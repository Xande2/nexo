import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {colors as c} from '../tokens';
import {radius, space} from '../theme';
import {Button} from './Button';

/** Erro persistente: nunca some sozinho, oferece nova tentativa quando há uma. */
export function ErrorBox({text, onRetry, retryLabel = 'Tentar novamente', busy}: {text: string; onRetry?: () => void; retryLabel?: string; busy?: boolean}) {
  if (!text) return null;
  return <View style={styles.error}>
    <View style={styles.row}>
      <Feather name="alert-circle" size={20} color={c.high}/>
      <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.text, {color: c.high}]}>{text}</Text>
    </View>
    {onRetry ? <Button variant="secondary" icon="refresh-cw" label={retryLabel} disabled={busy} onPress={onRetry}/> : null}
  </View>;
}

export const NOTICE_MS = 4000;

/** Aviso de sucesso: anunciado ao leitor de tela e dispensado após NOTICE_MS. */
export function Notice({text, onDismiss}: {text: string; onDismiss: () => void}) {
  useEffect(() => {
    if (!text) return;
    const timer = setTimeout(onDismiss, NOTICE_MS);
    return () => clearTimeout(timer);
  }, [text, onDismiss]);
  if (!text) return null;
  return <View style={[styles.row, styles.notice]}>
    <Feather name="check-circle" size={20} color={c.low}/>
    <Text accessibilityLiveRegion="polite" style={[styles.text, {color: c.low}]}>{text}</Text>
  </View>;
}

const styles = StyleSheet.create({
  error: {gap: space.md, padding: space.md, borderRadius: radius.card, backgroundColor: c.highBg},
  notice: {padding: space.md, borderRadius: radius.card, backgroundColor: c.lowBg},
  row: {flexDirection: 'row', alignItems: 'center', gap: space.sm},
  text: {flex: 1, fontSize: 15, lineHeight: 22},
});
