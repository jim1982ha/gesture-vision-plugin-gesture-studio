/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/components/RecordStep.tsx */
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';
import { useStudioSession } from '../hooks/useStudioSession.js';
import type { StudioSessionData } from '../types.js';
import type { SnapshotData } from '#frontend/types/index.js';
import type { FeatureExtractorResult } from '../utils/studio-utils.js';
import type { PluginUIContext } from '#frontend/types/index.js';
import { LandmarkSelector } from './LandmarkSelector.js';
import { AppContext } from '#frontend/contexts/AppContext.js';

interface RecordStepProps {
    context: PluginUIContext;
    sessionData: StudioSessionData;
    onComplete: (analysisResult: FeatureExtractorResult) => void;
    onBack: () => void;
    getLandmarkSnapshot: () => Promise<SnapshotData>;
}

const SampleCanvas = ({ sample, onClick }: { sample: SnapshotData, onClick: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !sample.imageData) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const imageBitmapPromise = createImageBitmap(sample.imageData);
        imageBitmapPromise.then(imageBitmap => {
            if (sample.isMirrored) { ctx.save(); ctx.scale(-1, 1); ctx.translate(-canvas.width, 0); }
            ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
            if (sample.isMirrored) { ctx.restore(); }
            imageBitmap.close();
        });

    }, [sample]);

    return (
        <button onClick={onClick} className="p-0 border-2 border-transparent hover:border-primary rounded-lg transition-colors flex-shrink-0">
            <canvas ref={canvasRef} className="w-[120px] h-[90px] rounded-md" />
        </button>
    );
};

export const RecordStep = ({ context, sessionData, onComplete, onBack, getLandmarkSnapshot }: RecordStepProps) => {
    const coreContext = useContext(AppContext);
    const { translate } = context.services.translationService;
    const { pubsub } = context.services;
    const { samples, addSample, resetSamples, analyzeSamples, focusPoints, setFocusPoints } = useStudioSession(sessionData);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [landmarkSelectorState, setLandmarkSelectorState] = useState<{ show: boolean, sample?: SnapshotData }>({ show: false });
    const countdownTimerRef = useRef<number | null>(null);

    const handleAddSample = useCallback(async () => {
        const snapshot = await getLandmarkSnapshot();
        if (snapshot) {
            addSample(snapshot);
            return true;
        }
        return false;
    }, [getLandmarkSnapshot, addSample]);

    useEffect(() => {
        if (countdown === null) {
            if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
            return;
        }
        if (countdown <= 0) {
            setIsCapturing(true);
            handleAddSample().then((success: boolean) => {
                if (!success) pubsub.publish('ui:showError', { messageKey: "toastSampleCaptureFailedGeneric" });
                setIsCapturing(false);
            });
            setCountdown(null);
            return;
        }
        countdownTimerRef.current = window.setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => { if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current); };
    }, [countdown, handleAddSample, pubsub]);
    
    const allSamplesRecorded = samples.length >= sessionData.samplesNeeded;

    const handleAnalyze = () => {
        const result = analyzeSamples();
        if (!result) { pubsub.publish('ui:showError', { messageKey: 'studioAnalysisStatusFailed' }); return; }
        onComplete(result);
    };

    const handleSelectLandmarks = async () => {
        try {
            const snapshot = await getLandmarkSnapshot();
            if (!snapshot || !snapshot.imageData || !snapshot.landmarks2d) throw new Error("Failed to get a valid camera snapshot.");
            setLandmarkSelectorState({ show: true, sample: { ...snapshot, isMirrored: true } });
        } catch (e) {
            console.error("Error getting snapshot for landmark selection:", e);
            pubsub.publish('ui:showError', { messageKey: "toastSampleCaptureFailedGeneric" });
        }
    };

    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownText = document.getElementById('countdown-overlay-text');
    if(countdownOverlay && countdownText) {
        if(countdown !== null || isCapturing){
            countdownOverlay.style.display = 'flex';
            countdownText.textContent = isCapturing ? '📸' : String(countdown);
        } else {
            countdownOverlay.style.display = 'none';
        }
    }
    
    if (!coreContext) return null;

    return (
        <div id="record-step-container" className="h-full flex flex-col gap-3">
             {landmarkSelectorState.show && landmarkSelectorState.sample && (
                <LandmarkSelector 
                    show={true}
                    sample={landmarkSelectorState.sample}
                    selectionMode="multiple"
                    initialSelection={focusPoints}
                    onClose={() => setLandmarkSelectorState({ show: false })}
                    onConfirm={(indices) => {
                        setFocusPoints(Array.from(indices));
                        setLandmarkSelectorState({ show: false });
                    }}
                />
            )}
            <div className="flex justify-between items-center">
                <p id="record-step-samples-label">{translate('studioSamplesLabel', { captured: samples.length, needed: sessionData.samplesNeeded })}</p>
                <button onClick={handleSelectLandmarks} className="btn btn-secondary">
                    <span ref={el => el && setIcon(el, 'UI_HANDS_LANDMARKS_DROPDOWN_TRIGGER')}></span>
                    <span>{translate("landmarkSelectorTitle")}</span>
                </button>
            </div>
            <div id="record-step-samples-container" className="min-h-[102px] bg-background border border-border rounded-md p-2 flex items-center gap-2 overflow-x-auto">
                {samples.map((sample, index) => (
                    <SampleCanvas key={index} sample={sample} onClick={() => setLandmarkSelectorState({ show: true, sample })} />
                ))}
            </div>
            <div className="flex justify-between items-center mt-auto">
                <button id="record-step-back-button" onClick={onBack} className="btn btn-secondary">
                    <span ref={el => el && setIcon(el, 'UI_UNDO')}></span><span>{translate("studioStartOver")}</span>
                </button>
                <div className="flex gap-2">
                    <button id="record-step-reset-button" onClick={resetSamples} disabled={isCapturing || countdown !== null} className="btn btn-secondary">
                        <span ref={el => el && setIcon(el, 'UI_UNDO')}></span><span>{translate("studioResetSamples")}</span>
                    </button>
                    <button id="record-step-action-button" onClick={allSamplesRecorded ? handleAnalyze : () => setCountdown(3)} disabled={isCapturing || countdown !== null} className="btn btn-primary">
                        <span ref={el => el && setIcon(el, allSamplesRecorded ? 'UI_THREE' : 'UI_ADD')}></span>
                        <span>{allSamplesRecorded ? translate('studioAnalyzeAndGenerate') : translate('studioRecordSample', { count: samples.length, needed: sessionData.samplesNeeded })}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};