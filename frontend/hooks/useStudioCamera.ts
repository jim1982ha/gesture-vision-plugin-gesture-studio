/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/hooks/useStudioCamera.ts */
import { useRef, useCallback, useEffect } from 'react';
import { LandmarkDrawer } from '#frontend/camera/rendering/landmark-drawer.js';
import type { StudioSessionData, GestureType } from '../types.js';
import type { HandLandmarkerResult, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import type { SnapshotData } from '#frontend/types/index.js';
// FIX: Added WEBCAM_EVENTS import
import { GESTURE_EVENTS, pubsub, WEBCAM_EVENTS } from '#shared/index.js';

type WorkerMessage = {
    type: 'results',
    results: {
        handGestureResults?: HandLandmarkerResult;
        poseLandmarkerResults?: PoseLandmarkerResult;
        snapshot?: SnapshotData;
    },
    processingTime?: number;
};

export const useStudioCamera = (sessionData: StudioSessionData | null) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const animationFrameId = useRef<number | null>(null);
    const snapshotPromiseRef = useRef<{ resolve: (value: SnapshotData) => void, reject: (reason?: unknown) => void } | null>(null);
    const landmarkDrawer = useRef(new LandmarkDrawer());

    const lastFrameTimeRef = useRef(0);
    // Use a base interval for the studio to keep the visualizer fluid.
    const frameIntervalRef = useRef(1000 / 60);

    const drawLandmarks = useCallback((handResults?: HandLandmarkerResult, poseResults?: PoseLandmarkerResult) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video || !video.videoWidth) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const isMirrored = video.classList.contains('mirrored');
        const drawer = landmarkDrawer.current;

        // Apply visual mirroring correction to the drawn landmarks ONLY if the video is visually mirrored.
        const transformLandmarks = (results: HandLandmarkerResult | PoseLandmarkerResult | undefined, connectionsFn: () => Array<{start: number; end: number}> | undefined, color: string, lineWidth: number, radius: number) => {
            if (!results?.landmarks?.length) return;

            const transformed = results.landmarks.map(lms => lms.map(lm => {
                // FIX: Apply mirroring only to the drawn coordinate based on CSS mirroring.
                const x = (isMirrored ? (1 - lm.x) : lm.x) * canvas.width;
                const y = lm.y * canvas.height;
                return { x, y, color: 'white' };
            }));
            drawer.draw(ctx, transformed, { color, lineWidth, radius, connections: connectionsFn() });
        };

        transformLandmarks(handResults, LandmarkDrawer.getHandConnections, '#00FF00', 2, 4);
        transformLandmarks(poseResults, LandmarkDrawer.getPoseConnections, '#FF0000', 2, 4);

    }, []);

    const processingLoop = useCallback(async (timestamp: number) => {
        animationFrameId.current = requestAnimationFrame(processingLoop);
        
        const video = videoRef.current;
        const worker = workerRef.current;

        if (!worker || !video || video.paused || video.ended || video.videoWidth === 0) return;

        // Throttling only if the last frame was sent too recently.
        if (timestamp - lastFrameTimeRef.current < frameIntervalRef.current) return;
        
        lastFrameTimeRef.current = timestamp;
        try {
            const imageBitmap = await self.createImageBitmap(video);
            worker.postMessage({
                type: 'process_frame',
                payload: { imageBitmap, timestamp: performance.now(), requestSnapshot: !!snapshotPromiseRef.current }
            }, [imageBitmap]);
        } catch (error) {
            if (!(error instanceof Error) || error.name !== 'InvalidStateError') {
                 console.error('[StudioCamera] Error in processing loop:', error);
            }
        }
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !sessionData?.cameraId) return;

        let isCancelled = false;
        let stream: MediaStream | null = null;

        const start = async (cameraId: string, gestureType: GestureType) => {
            const worker = new Worker(new URL('#frontend/workers/gesture-worker.ts', import.meta.url), { type: 'classic' });
            workerRef.current = worker;

            worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
                if (isCancelled || !event.data.results) return;
                const { results, processingTime } = event.data;
                
                if (typeof processingTime === 'number') {
                    const targetInterval = 1000 / 60;
                    const minAllowedInterval = Math.max(targetInterval, processingTime * 1.5);
                    frameIntervalRef.current = Math.min(1000 / 5, minAllowedInterval);
                }
                
                if (snapshotPromiseRef.current && results.snapshot) {
                    const videoElement = videoRef.current;
                    results.snapshot.isMirrored = videoElement ? videoElement.classList.contains('mirrored') : true; 
                    
                    snapshotPromiseRef.current.resolve(results.snapshot);
                    snapshotPromiseRef.current = null;
                }
                pubsub.publish(GESTURE_EVENTS.RENDER_OUTPUT, results);
                drawLandmarks(results.handGestureResults, results.poseLandmarkerResults);
            };

            const constraints = { video: { deviceId: { exact: cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } } };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (isCancelled) { stream.getTracks().forEach(track => track.stop()); return; }
            
            video.srcObject = stream;
            await video.play();

            if (isCancelled) return;
            
            animationFrameId.current = requestAnimationFrame(processingLoop);
            
            // Start monitoring performance immediately when stream starts
            // FIX: Corrected constant reference
            pubsub.publish(WEBCAM_EVENTS.STREAM_START, { studio: true });
            
            worker.postMessage({
                type: 'initialize',
                payload: {
                    enableHandProcessing: gestureType === 'hand',
                    enablePoseProcessing: gestureType === 'pose',
                    numHands: 1,
                    enableBuiltInHandGestures: false,
                    enableCustomHandGestures: false,
                }
            });
        };

        start(sessionData.cameraId, sessionData.type).catch(error => {
            if (!isCancelled) {
                console.error('[GestureStudio] Failed to start camera:', error);
                const reason = error instanceof Error ? error.message : String(error);
                pubsub.publish('ui:showError', { messageKey: "studioLaunchError", substitutions: { reason } });
            }
        });
        
        return () => {
            isCancelled = true;
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
            workerRef.current?.terminate();
            workerRef.current = null;
            stream?.getTracks().forEach(track => track.stop());
            if (video) {
                video.srcObject = null;
                video.pause();
            }
            // Stop monitoring performance when studio unmounts
            // FIX: Corrected constant reference
            pubsub.publish(WEBCAM_EVENTS.STREAM_STOP); 
        };
    }, [sessionData, processingLoop, drawLandmarks]);

    const getLandmarkSnapshot = useCallback((): Promise<SnapshotData> => {
        return new Promise((resolve, reject) => {
            snapshotPromiseRef.current = { resolve, reject };
        });
    }, []);

    return { videoRef, canvasRef, getLandmarkSnapshot };
};