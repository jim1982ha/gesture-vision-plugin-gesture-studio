/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/index.tsx */
import type { FrontendPluginModule } from '#frontend/types/index.js';
import { GestureStudioButton } from './components/GestureStudioButton.js';
import './style.css';

const gestureStudioPlugin: FrontendPluginModule = {
  UIComponent: GestureStudioButton,
  pluginSlot: 'custom-gestures-actions-slot',
};

export default gestureStudioPlugin;