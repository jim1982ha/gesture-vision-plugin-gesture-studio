/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/components/DynamicStep.tsx */
import React, { useState, useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';
import { useStudioSession } from '../hooks/useStudioSession.js';
import { LandmarkSelector } from './LandmarkSelector.js';
import type { StudioSessionData } from '../GestureStudio.js';
import type { SnapshotData } from '#frontend/types/index.js';

interface DynamicStepProps {
    sessionData: StudioSessionData;
    onComplete: () => void;
    onBack: () => void;
}

export const DynamicStep = ({ sessionData, onComplete, onBack }: DynamicStepProps) => {
    const context = useContext(AppContext);
    const { dynLandmarks, setDynLandmarks, minDistance, maxDistance, calibrateDistance } = useStudioSession(sessionData);
    const [landmarkSelectorState, setLandmarkSelectorState] = useState<{ show: boolean, sample?: SnapshotData }>({ show: false });

    if (!context) return null;
    
    const { translate } = context.services.translationService;
    const { cameraService, pubsub, gestureProcessor } = context.services;

    const handleSelectLandmarks = async () => {
        if (!gestureProcessor?.isModelLoaded({ enableHandProcessing: sessionData.type === 'hand', enablePoseProcessing: sessionData.type === 'pose' })) {
            pubsub.publish('ui:showError', { messageKey: "modelLoading" });
            return;
        }
        try {
            const snapshot = await cameraService!.getLandmarkSnapshot();
            const isMirrored = cameraService!.getCameraManager().isMirrored();
            if (!snapshot || !snapshot.imageData || !snapshot.landmarks2d) throw new Error("Failed to get a valid camera snapshot.");
            setLandmarkSelectorState({ show: true, sample: { ...snapshot, isMirrored } });
        } catch (e) {
            console.error("Error getting snapshot for landmark selection:", e);
            pubsub.publish('ui:showError', { messageKey: "toastSampleCaptureFailedGeneric" });
        }
    };
    
    const isCalibrated = minDistance !== null && maxDistance !== null;

    return (
        <div className="h-full flex flex-col gap-3 justify-between">
            {landmarkSelectorState.show && landmarkSelectorState.sample && (
                <LandmarkSelector 
                    show={true}
                    sample={landmarkSelectorState.sample}
                    selectionMode="two_points"
                    initialSelection={dynLandmarks}
                    onClose={() => setLandmarkSelectorState({ show: false })}
                    onConfirm={(indices) => {
                        setDynLandmarks(Array.from(indices));
                        setLandmarkSelectorState({ show: false });
                    }}
                />
            )}
            <div className="flex flex-col gap-3">
                <div className="form-group !mb-0">
                    <button onClick={handleSelectLandmarks} className="btn btn-secondary w-full">
                        <span ref={el => el && setIcon(el, 'UI_HANDS_LANDMARKS_DROPDOWN_TRIGGER')}></span>
                        <span>{translate("landmarkSelectorTitle")}</span>
                    </button>
                    <p className="text-xs text-center text-text-secondary mt-1">
                        {dynLandmarks.length === 2 ? `Points: ${dynLandmarks[0]}, ${dynLandmarks[1]}` : translate('studioTwoPointsRequired')}
                    </p>
                </div>
                <div className="form-group !mb-0">
                    <p className="form-label">{translate("studioCalibrateMinPrompt")}</p>
                    <button onClick={() => calibrateDistance('min')} className="btn btn-secondary w-full" disabled={dynLandmarks.length !== 2}>
                        <span ref={el => el && setIcon(el, 'UI_RECORD')}></span>
                        <span>{translate("studioRecordMin")}</span>
                    </button>
                </div>
                <div className="form-group !mb-0">
                    <p className="form-label">{translate("studioCalibrateMaxPrompt")}</p>
                    <button onClick={() => calibrateDistance('max')} className="btn btn-secondary w-full" disabled={dynLandmarks.length !== 2}>
                        <span ref={el => el && setIcon(el, 'UI_RECORD')}></span>
                        <span>{translate("studioRecordMax")}</span>
                    </button>
                </div>
                <div className="form-group !mb-0">
                    <p className="form-label">{translate("studioCalibrationResult")}</p>
                    <div id="studio-calibration-result-box" className="text-sm p-2 rounded">
                        <span>{translate('studioMinDistance')}: {minDistance !== null ? `${minDistance.toFixed(2)} cm` : translate('studioNotCalibrated')}</span><br/>
                        <span>{translate('studioMaxDistance')}: {maxDistance !== null ? `${maxDistance.toFixed(2)} cm` : translate('studioNotCalibrated')}</span>
                    </div>
                </div>
            </div>
            <div className="flex justify-between items-center mt-auto">
                <button onClick={onBack} className="btn btn-secondary">
                    <span ref={el => el && setIcon(el, 'UI_ONE')}></span>
                    <span>{translate("studioStartOver")}</span>
                </button>
                <button onClick={onComplete} className="btn btn-primary" disabled={!isCalibrated}>
                    <span ref={el => el && setIcon(el, 'UI_THREE')}></span>
                    <span>{translate('studioAnalyzeAndGenerate')}</span>
                </button>
            </div>
        </div>
    );
};