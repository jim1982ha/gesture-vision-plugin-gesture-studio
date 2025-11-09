import React, { useState, useEffect, useRef } from 'react';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';
import { useStudioSession } from '../hooks/useStudioSession.js';
import type { StudioSessionData } from '../GestureStudio.js';
import type { SnapshotData } from '#frontend/types/index.js';
import type { FeatureExtractorResult } from '../utils/studio-utils.js';
import type { PluginUIContext } from '#frontend/types/index.js';

interface RecordStepProps {
    context: PluginUIContext;
    sessionData: StudioSessionData;
    onComplete: (analysisResult: FeatureExtractorResult) => void;
    onBack: () => void;
}

const SampleCanvas = ({ sample }: { sample: SnapshotData }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !sample.imageData) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        createImageBitmap(sample.imageData).then(imageBitmap => {
            if (sample.isMirrored) { ctx.save(); ctx.scale(-1, 1); ctx.translate(-canvas.width, 0); }
            ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
            if (sample.isMirrored) { ctx.restore(); }
        });

    }, [sample]);

    return <canvas ref={canvasRef} className="w-[120px] h-[90px] border border-border rounded-md" />;
};

export const RecordStep = ({ context, sessionData, onComplete, onBack }: RecordStepProps) => {
    const { translate } = context.services.translationService;
    const { pubsub } = context.services;
    const { samples, addSample, resetSamples, analyzeSamples } = useStudioSession(sessionData);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    
    useEffect(() => {
        if (countdown === null) return;
        if (countdown <= 0) {
            setIsCapturing(true);
            addSample().then(success => {
                if (!success) pubsub.publish('ui:showError', { messageKey: "toastSampleCaptureFailedGeneric" });
                setIsCapturing(false);
            });
            setCountdown(null);
            return;
        }
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, addSample, pubsub]);
    
    const allSamplesRecorded = samples.length >= sessionData.samplesNeeded;

    const handleAnalyze = () => {
        const result = analyzeSamples();
        if (!result) {
            pubsub.publish('ui:showError', { messageKey: 'studioAnalysisStatusFailed' });
            return;
        }
        onComplete(result);
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

    return (
        <div className="h-full flex flex-col gap-3">
            <p>{translate('studioSamplesLabel', { captured: samples.length, needed: sessionData.samplesNeeded })}</p>
            <div className="flex-grow min-h-[110px] bg-background border border-border rounded-md p-2 flex flex-wrap justify-center content-start items-center gap-1 overflow-y-auto">
                {samples.map((sample, index) => (
                    <SampleCanvas key={index} sample={sample} />
                ))}
            </div>
            <div className="flex justify-between items-center mt-auto">
                <button onClick={onBack} className="btn btn-secondary">
                    <span ref={el => el && setIcon(el, 'UI_ONE')}></span><span>{translate("studioStartOver")}</span>
                </button>
                <div className="flex gap-2">
                    <button onClick={resetSamples} disabled={isCapturing || countdown !== null} className="btn btn-secondary">
                        <span ref={el => el && setIcon(el, 'UI_UNDO')}></span><span>{translate("studioResetSamples")}</span>
                    </button>
                    <button onClick={allSamplesRecorded ? handleAnalyze : () => setCountdown(3)} disabled={isCapturing || countdown !== null} className="btn btn-primary">
                        <span ref={el => el && setIcon(el, allSamplesRecorded ? 'UI_THREE' : 'UI_ADD')}></span>
                        <span>{allSamplesRecorded ? translate('studioAnalyzeAndGenerate') : translate('studioRecordSample', { count: samples.length, needed: sessionData.samplesNeeded })}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};