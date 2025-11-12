/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/components/LiveTestDisplay.tsx */
import { useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { useLiveTester } from '../hooks/useLiveTester.js';
import type { GestureType } from '../types.js';

export const LiveTestDisplay = ({ isVisible, gestureType, generatedCode, tolerance }: { isVisible: boolean, gestureType: GestureType | undefined, generatedCode: string | null, tolerance: number }) => {
    const context = useContext(AppContext);
    const { testResult } = useLiveTester(generatedCode, gestureType, tolerance);
    if (!context || !isVisible || !testResult) return null;

    const { translate } = context.services.translationService;
    const detectedText = testResult.detected ? translate("studioStatusDetected") : translate("studioStatusNotDetected");
    const colorClass = testResult.detected ? 'text-success' : 'text-error';
    const confidenceText = (testResult.confidence != null) ? `${(testResult.confidence * 100).toFixed(1)}%` : "-";

    return (
        <div id="live-test-display" className="absolute z-10 bottom-2 left-2 p-2 rounded-md shadow-lg leading-tight backdrop-blur-sm bg-surface/80 text-xs">
            <div>{translate('studioLiveStatus')}: <strong className={colorClass}>{detectedText}</strong></div>
            <div>{translate('studioLiveConfidence')}: <span>{confidenceText}</span></div>
            <div>{translate('studioRequiredConfidenceLabel')}: <span>{(tolerance * 100).toFixed(0)}%</span></div>
        </div>
    );
};