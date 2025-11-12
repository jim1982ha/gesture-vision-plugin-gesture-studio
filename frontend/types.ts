/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/types.ts */

export type StudioSection = 'define' | 'record' | 'dynamic_calibrate' | 'test';

export type GestureType = 'hand' | 'pose';

export type CreationType = 'static' | 'dynamic';

export interface StudioSessionData {
  name: string;
  description?: string;
  samplesNeeded: number;
  cameraId: string;
  type: GestureType;
  creationType: CreationType;
}