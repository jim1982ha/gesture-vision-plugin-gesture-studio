/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/hooks/useLiveTester.ts */
import { useState, useRef, useEffect, useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { GESTURE_EVENTS } from '#shared/index.js';
import type { TestResultPayload } from '#frontend/types/index.js';
import type { Landmark } from '@mediapipe/tasks-vision';
import type { GestureType } from '../types.js';

type CheckFunction = (landmarks: Landmark[], worldLandmarks: Landmark[], tolerance: number) => TestResultPayload;

interface RenderData {
    handGestureResults?: { landmarks?: Landmark[][], worldLandmarks?: Landmark[][] };
    poseLandmarkerResults?: { landmarks?: Landmark[][], worldLandmarks?: Landmark[][] };
}

export const useLiveTester = (codeString: string | null, gestureType: GestureType | undefined, tolerance: number) => {
    const context = useContext(AppContext);
    const [testResult, setTestResult] = useState<TestResultPayload | null>(null);
    const checkFunctionRef = useRef<CheckFunction | null>(null);

    useEffect(() => {
        let objectUrl: string | null = null;
        if (!codeString || !gestureType) {
            checkFunctionRef.current = null;
            return;
        }

        try {
            const blob = new Blob([codeString], { type: 'application/javascript' });
            objectUrl = URL.createObjectURL(blob);
            import(/* @vite-ignore */ objectUrl).then(module => {
                if (module.baseRules?.type === 'static') {
                    checkFunctionRef.current = null;
                } else { 
                    checkFunctionRef.current = gestureType === 'pose' ? module.checkPose : module.checkGesture;
                }
            });
        } catch (e) {
            console.error("[LiveTester] Error compiling gesture code:", e);
            checkFunctionRef.current = null;
        }
        
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [codeString, gestureType]);

    useEffect(() => {
        if (!context) return;

        const handleRender = (data: unknown) => {
            if (!checkFunctionRef.current) {
                setTestResult(null);
                return;
            }
            
            const renderData = data as RenderData;
            let landmarks: Landmark[] | undefined;
            let worldLandmarks: Landmark[] | undefined;

            if (gestureType === 'hand' && renderData?.handGestureResults) {
                landmarks = renderData.handGestureResults.landmarks?.[0];
                worldLandmarks = renderData.handGestureResults.worldLandmarks?.[0];
            } else if (gestureType === 'pose' && renderData?.poseLandmarkerResults) {
                landmarks = renderData.poseLandmarkerResults.landmarks?.[0];
                worldLandmarks = renderData.poseLandmarkerResults.worldLandmarks?.[0];
            }
            
            if (landmarks && worldLandmarks) {
                const result = checkFunctionRef.current(landmarks, worldLandmarks, tolerance);
                setTestResult(result);
            } else {
                setTestResult(null);
            }
        };
        // This subscription comes from the dedicated worker in useStudioCamera
        const unsubscribe = context.services.pubsub.subscribe(GESTURE_EVENTS.RENDER_OUTPUT, handleRender);
        return () => unsubscribe();
    }, [context, tolerance, gestureType]);

    return { testResult, tolerance };
};