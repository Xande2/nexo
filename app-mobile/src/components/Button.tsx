import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {colors as c} from '../tokens';
import {radius, space, touch} from '../theme';

export type IconName = React.ComponentProps<typeof Feather>['name'];
type Variant = 'primary' | 'secondary' | 'ghost';
type Props = {
  label: string; onPress: () => void; disabled?: boolean; variant?: Variant;
  icon?: IconName; accessibilityLabel?: string; compact?: boolean;
};

export function Button({label, onPress, disabled, variant = 'primary', icon, accessibilityLabel, compact}: Props) {
  const textColor = variant === 'primary' ? c.surface : c.primary;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{disabled: !!disabled}} disabled={disabled} onPress={onPress}
    style={({pressed}) => [styles.base, styles[variant], compact && styles.compact, (disabled || pressed) && styles.dimmed]}>
    {icon ? <Feather name={icon} size={18} color={textColor}/> : null}
    <Text style={[styles.text, {color: textColor}]}>{label}</Text>
  </Pressable>;
}

/** Botão só com ícone; o rótulo acessível é obrigatório. */
export function IconButton({icon, label, onPress, disabled}: {icon: IconName; label: string; onPress: () => void; disabled?: boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled: !!disabled}}
    disabled={disabled} onPress={onPress} hitSlop={4}
    style={({pressed}) => [styles.icon, (disabled || pressed) && styles.dimmed]}>
    <Feather name={icon} size={20} color={c.primary}/>
  </Pressable>;
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch, flexDirection: 'row', gap: space.sm, alignItems: 'center', justifyContent: 'center',
    paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radius.card, borderWidth: 1,
  },
  primary: {backgroundColor: c.primary, borderColor: c.primary},
  secondary: {backgroundColor: c.surface, borderColor: c.secondary},
  ghost: {backgroundColor: 'transparent', borderColor: 'transparent'},
  compact: {paddingHorizontal: space.md},
  text: {fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center'},
  icon: {
    width: touch, height: touch, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.card, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
  },
  dimmed: {opacity: 0.55},
});
