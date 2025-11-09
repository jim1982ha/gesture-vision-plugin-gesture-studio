import { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { GESTURE_EVENTS } from '#shared/index.js';
import type { TestResultPayload } from '#frontend/types/index.js';
import type { Landmark } from '@mediapipe/tasks-vision';
import type { GestureType } from '../GestureStudio.js';

type CheckFunction = (landmarks: Landmark[], worldLandmarks: Landmark[], tolerance: number) => TestResultPayload;

interface RenderData {
    handGestureResults?: { landmarks?: Landmark[][], worldLandmarks?: Landmark[][] };
    poseLandmarkerResults?: { landmarks?: Landmark[][], worldLandmarks?: Landmark[][] };
}

export const useLiveTester = (codeString: string | null, gestureType: GestureType) => {
    const context = useContext(AppContext);
    const [testResult, setTestResult] = useState<TestResultPayload | null>(null);
    const [tolerance, setTolerance] = useState(0.2);
    const checkFunctionRef = useRef<CheckFunction | null>(null);

    useEffect(() => {
        if (!codeString) {
            checkFunctionRef.current = null;
            return;
        }

        try {
            const blob = new Blob([codeString], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            import(/* @vite-ignore */ url).then(module => {
                if (module.baseRules) {
                    checkFunctionRef.current = null;
                } else { 
                    checkFunctionRef.current = gestureType === 'pose' ? module.checkPose : module.checkGesture;
                }
            }).finally(() => URL.revokeObjectURL(url));
        } catch (e) {
            console.error("[LiveTester] Error compiling gesture code:", e);
            checkFunctionRef.current = null;
        }
    }, [codeString, gestureType]);

    useEffect(() => {
        if (!context || !checkFunctionRef.current) {
            setTestResult(null);
            return;
        };

        const handleRender = (data: unknown) => {
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
            
            if (landmarks && worldLandmarks && checkFunctionRef.current) {
                const result = checkFunctionRef.current(landmarks, worldLandmarks, tolerance);
                setTestResult(result);
            } else {
                setTestResult(null);
            }
        };

        const unsubscribe = context.services.pubsub.subscribe(GESTURE_EVENTS.RENDER_OUTPUT, handleRender);
        return () => unsubscribe();
    }, [context, tolerance, gestureType]);

    const updateTolerance = useCallback((newTolerance: number) => {
        setTolerance(newTolerance);
    }, []);

    return { testResult, tolerance, updateTolerance };
};