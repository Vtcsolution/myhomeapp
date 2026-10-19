import type { CategoryIcon } from '@myhome/shared';
import {
  AirVent,
  BugOff,
  Cctv,
  Droplet,
  Hammer,
  type LucideIcon,
  PaintRoller,
  Sparkles,
  WashingMachine,
  Wrench,
  Zap,
} from 'lucide-react-native';

/** Maps the data layer's semantic icon names to one consistent line-icon set. */
export const categoryIcons: Record<CategoryIcon, LucideIcon> = {
  'air-conditioner': AirVent,
  sparkles: Sparkles,
  droplet: Droplet,
  zap: Zap,
  'shield-bug': BugOff,
  'paint-roller': PaintRoller,
  hammer: Hammer,
  'washing-machine': WashingMachine,
  wrench: Wrench,
  cctv: Cctv,
};
