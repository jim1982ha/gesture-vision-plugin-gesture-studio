/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/components/StudioStepWrapper.tsx */
import React from 'react';
import { useStudioCamera } from '../hooks/useStudioCamera.js';
import type { StudioSessionData } from '../types.js';
import { LiveTestDisplay } from './LiveTestDisplay.js';

interface StudioStepWrapperProps {
    sessionData: StudioSessionData;
    children: (getLandmarkSnapshot: ReturnType<typeof useStudioCamera>['getLandmarkSnapshot']) => React.ReactElement;
    isTestStep?: boolean;
    generatedCode?: string | null;
    tolerance?: number;
}

export const StudioStepWrapper = ({ sessionData, children, isTestStep = false, generatedCode, tolerance }: StudioStepWrapperProps) => {
    const { videoRef, canvasRef, getLandmarkSnapshot } = useStudioCamera(sessionData);

    return (
        <div className="grid grid-rows-[1fr_auto] h-full gap-4">
            <div id="studio-video-placeholder" className="relative flex items-center justify-center rounded-md overflow-hidden bg-background">
                <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover mirrored" autoPlay playsInline muted></video>
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-cover mirrored"></canvas>
                <div id="countdown-overlay" className="absolute inset-0 bg-black/50 text-white text-6xl font-bold items-center justify-center hidden">
                    <span id="countdown-overlay-text">3</span>
                </div>
                {isTestStep && (
                    <LiveTestDisplay
                        isVisible={true}
                        gestureType={sessionData?.type}
                        generatedCode={generatedCode ?? null}
                        tolerance={tolerance ?? 0.5}
                    />
                )}
            </div>
            {children(getLandmarkSnapshot)}
        </div>
    );
};