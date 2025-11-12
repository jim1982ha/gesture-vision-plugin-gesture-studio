/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/index.tsx */
import type { FrontendPluginModule } from '#frontend/types/index.js';
import { GestureStudioButton } from './components/GestureStudioButton.js';
import { GestureStudio } from './GestureStudio.js';
import './style.css';

const gestureStudioPlugin: FrontendPluginModule = {
  // This is the button that appears in the "Custom Gestures" tab
  UIComponent: GestureStudioButton,
  pluginSlot: 'custom-gestures-actions-slot',

  // This is the full-screen modal component
  OverlayComponent: GestureStudio,
  overlayId: 'gesture-studio',
};

export default gestureStudioPlugin;