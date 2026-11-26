// Tokens de layout compartilhados pelas telas (cores em tokens.ts).
import {colors as c} from './tokens';
import type {Prioridade} from './api';

export const space = {xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32};
export const radius = {card: 8, badge: 6, pill: 999};
export const touch = 48;

export function priorityColors(priority: Prioridade): {color: string; backgroundColor: string} {
  if (priority === 'Alta') return {color: c.high, backgroundColor: c.highBg};
  if (priority === 'Media') return {color: c.medium, backgroundColor: c.mediumBg};
  return {color: c.low, backgroundColor: c.lowBg};
}
