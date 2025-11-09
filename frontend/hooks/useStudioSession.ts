import { useState, useCallback, useRef, useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { FeatureExtractor, type FeatureExtractorResult } from '../utils/studio-utils.js';
import type { StudioSessionData } from '../GestureStudio.js';
import type { SnapshotData } from '#frontend/types/index.js';
import type { Landmark } from '@mediapipe/tasks-vision';

export const useStudioSession = (sessionData: StudioSessionData | null) => {
    const context = useContext(AppContext);
    const [samples, setSamples] = useState<SnapshotData[]>([]);
    const featureExtractorRef = useRef(sessionData ? new FeatureExtractor(sessionData.type) : null);

    const [dynLandmarks, setDynLandmarks] = useState<number[]>([]);
    const [minDistance, setMinDistance] = useState<number | null>(null);
    const [maxDistance, setMaxDistance] = useState<number | null>(null);

    const addSample = useCallback(async () => {
        if (!context?.services.cameraService) return false;
        const snapshot = await context.services.cameraService.getLandmarkSnapshot();
        const isMirrored = context.services.cameraService.getCameraManager().isMirrored();

        if (snapshot && snapshot.landmarks2d && snapshot.imageData) {
            setSamples(prev => [...prev, { ...snapshot, isMirrored }]);
            return true;
        }
        return false;
    }, [context]);

    const calibrateDistance = useCallback(async (type: 'min' | 'max') => {
        if (!context?.services.cameraService || dynLandmarks.length !== 2 || !sessionData) return;
        try {
            const snapshot = await context.services.cameraService.getLandmarkSnapshot();
            const landmarks = snapshot?.landmarks2d;
            if (!landmarks || landmarks.length < 2) throw new Error("Could not get landmarks for calibration.");
            
            const [p1_idx, p2_idx] = dynLandmarks;
            const ref_idx = sessionData.type === 'hand' ? [5, 8] : [11, 12];
            const knownDist = sessionData.type === 'hand' ? 9.0 : 25.0;
            const [ref1_idx, ref2_idx] = ref_idx;

            const p1 = landmarks[p1_idx]; const p2 = landmarks[p2_idx];
            const ref1 = landmarks[ref1_idx]; const ref2 = landmarks[ref2_idx];
            
            if (!p1 || !p2 || !ref1 || !ref2) throw new Error("Required landmarks not found in snapshot.");
    
            const vectorDistance = (v1: Landmark, v2: Landmark) => Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2));
            const measuredPx = vectorDistance(p1, p2);
            const referencePx = vectorDistance(ref1, ref2);
            if (referencePx < 1e-6) throw new Error("Reference landmarks are too close to measure.");
            
            const pixelsPerCm = referencePx / knownDist;
            const distanceInCm = measuredPx / pixelsPerCm;
            
            if (type === 'min') setMinDistance(distanceInCm);
            else setMaxDistance(distanceInCm);
        } catch (e) {
            console.error(`Calibration failed for type ${type}:`, e);
            context.services.pubsub.publish('ui:showError', { messageKey: "toastSampleCaptureFailedGeneric" });
        }
    }, [context, dynLandmarks, sessionData]);

    const resetSamples = useCallback(() => {
        setSamples([]);
        setDynLandmarks([]);
        setMinDistance(null);
        setMaxDistance(null);
    }, []);

    const analyzeSamples = useCallback(() => {
        if (!featureExtractorRef.current) return null;
        return featureExtractorRef.current.extract(samples);
    }, [samples]);
    
    const generateJsFileContent = useCallback((analysisResult: FeatureExtractorResult | null, tolerance: number): string | null => {
        if (!sessionData || !featureExtractorRef.current) return null;
        
        if (sessionData.creationType === 'dynamic') {
            if (dynLandmarks.length !== 2 || minDistance === null || maxDistance === null) return null;
            const dynamicDefinition = {
                metadata: { ...sessionData },
                landmark1: dynLandmarks[0],
                landmark2: dynLandmarks[1],
                minDistance,
                maxDistance,
                tolerance
            };
            return featureExtractorRef.current.generateDynamicGestureJsFileContent(dynamicDefinition);
        } else { // Static
            if (!analysisResult?.rules) return null;
            const staticDefinition = {
                metadata: { ...sessionData },
                rules: analysisResult.rules,
                focusPoints: analysisResult.focusPoints,
                tolerance,
            };
            return featureExtractorRef.current.generateStaticGestureJsFileContent(staticDefinition);
        }
    }, [sessionData, dynLandmarks, minDistance, maxDistance]);

    return {
        samples,
        addSample,
        resetSamples,
        analyzeSamples,
        generateJsFileContent,
        dynLandmarks,
        setDynLandmarks,
        minDistance,
        setMinDistance,
        maxDistance,
        setMaxDistance,
        calibrateDistance
    };
};