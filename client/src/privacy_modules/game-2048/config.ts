import { lazy } from "react";
import { Grid3X3 } from "lucide-react";
import type { PrivacyModuleConfig } from "../types";

export const game2048Config: PrivacyModuleConfig = {
  id: 'game-2048',
  title: 'Game 2048',
  description: 'Простая, но затягивающая головоломка. Соединяйте плитки, чтобы собрать 2048 и наслаждайтесь бесконечными испытаниями.',
  favicon: {
    ios: '/game-icon-ios.svg',
    android: '/game-icon-android.svg',
    default: '/game-icon.svg',
  },
  icon: Grid3X3,
  component: lazy(() => import("@/components/game-2048")),
  unlockMethod: {
    type: 'swipePattern',
    defaultValue: '',
    labelKey: 'swipePatternLabel',
    descriptionKey: 'swipePatternDesc',
  },
  supportsUniversalUnlock: true,
};
