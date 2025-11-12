/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/components/DynamicStep.tsx */
import React, { useState, useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { setIcon, clsx } from '#frontend/ui/helpers/ui-helpers.js';
import { useStudioSession } from '../hooks/useStudioSession.js';
import { LandmarkSelector } from './LandmarkSelector.js';
import type { StudioSessionData } from '../types.js';
import type { SnapshotData } from '#frontend/types/index.js';
import type { FeatureExtractorResult } from '../utils/studio-utils.js';

interface DynamicStepProps {
    sessionData: StudioSessionData;
    onComplete: (result: FeatureExtractorResult | object | null) => void;
    onBack: () => void;
    getLandmarkSnapshot: () => Promise<SnapshotData>;
}

export const DynamicStep = ({ sessionData, onComplete, onBack, getLandmarkSnapshot }: DynamicStepProps) => {
    const context = useContext(AppContext);
    const { dynLandmarks, setDynLandmarks, minDistance, maxDistance, calibrateDistance } = useStudioSession(sessionData);
    const [landmarkSelectorState, setLandmarkSelectorState] = useState<{ show: boolean, sample?: SnapshotData }>({ show: false });

    if (!context) return null;
    
    const { translate } = context.services.translationService;
    const { pubsub } = context.services;

    const isLandmarksSelected = dynLandmarks.length === 2;
    const isMinCalibrated = minDistance !== null;
    const isMaxCalibrated = maxDistance !== null;
    const isFullyCalibrated = isLandmarksSelected && isMinCalibrated && isMaxCalibrated;

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
    
    const handleAnalyze = () => {
        // For dynamic gestures, we don't analyze samples. We pass an empty object to signal completion.
        onComplete({});
    };

    const handleCalibrate = async (type: 'min' | 'max') => {
        const snapshot = await getLandmarkSnapshot();
        if (snapshot) {
            calibrateDistance(type, snapshot);
        }
    };

    return (
        <div id="dynamic-step-container" className="h-full flex flex-col gap-4">
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
            <div className="flex flex-col lg:flex-row gap-4">
                {/* --- Step 1: Select Landmarks --- */}
                <div id="dynamic-step-select-landmarks-section" className="form-section p-3 border rounded-lg border-border-light flex-1 flex flex-col">
                    <div className="flex justify-between items-center">
                        <label className="form-label !mb-0 font-semibold">① {translate("landmarkSelectorTitle")}</label>
                        {isLandmarksSelected && <span ref={el => el && setIcon(el, 'UI_CHECK_CIRCLE')} className="material-icons text-success"></span>}
                    </div>
                    <p className="text-xs text-text-secondary mt-1 flex-grow">{translate('studioSelectTwoPointsPrompt')}</p>
                    <button id="dynamic-step-select-landmarks-button" onClick={handleSelectLandmarks} className={clsx("btn w-full mt-2", isLandmarksSelected ? "btn-secondary" : "btn-primary")}>
                        <span ref={el => el && setIcon(el, 'UI_HANDS_LANDMARKS_DROPDOWN_TRIGGER')}></span>
                        <span>{isLandmarksSelected ? `${translate('Points')}: ${dynLandmarks[0]}, ${dynLandmarks[1]}` : translate("landmarkSelectorTitle")}</span>
                    </button>
                </div>

                {/* --- Step 2: Calibrate Distances --- */}
                <div id="dynamic-step-calibrate-section" className={clsx("p-3 border rounded-lg border-border-light transition-opacity flex-1 flex flex-col", !isLandmarksSelected && "opacity-50")}>
                    <label className="form-label !mb-0 font-semibold">② {translate("studioTabCalibrate")}</label>
                    <div className="flex flex-col gap-3 mt-2 flex-grow justify-center">
                        <div className="flex items-center gap-2">
                            <button id="dynamic-step-record-min-button" onClick={() => handleCalibrate('min')} className={clsx("btn flex-1", isLandmarksSelected && !isMinCalibrated ? 'btn-primary' : 'btn-secondary')} disabled={!isLandmarksSelected}>
                                <span ref={el => el && setIcon(el, 'UI_RECORD')}></span>
                                <span>{translate("studioRecordMin")}</span>
                            </button>
                            <div className="text-sm w-40">{translate('studioMinDistance')}: {isMinCalibrated ? `${minDistance.toFixed(1)} cm` : '...'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button id="dynamic-step-record-max-button" onClick={() => handleCalibrate('max')} className={clsx("btn flex-1", isMinCalibrated && !isMaxCalibrated ? 'btn-primary' : 'btn-secondary')} disabled={!isMinCalibrated}>
                                <span ref={el => el && setIcon(el, 'UI_RECORD')}></span>
                                <span>{translate("studioRecordMax")}</span>
                            </button>
                            <div className="text-sm w-40">{translate('studioMaxDistance')}: {isMaxCalibrated ? `${maxDistance.toFixed(1)} cm` : '...'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Footer Actions --- */}
            <div className="flex justify-between items-center mt-auto">
                <button id="dynamic-step-back-button" onClick={onBack} className="btn btn-secondary">
                    <span ref={el => el && setIcon(el, 'UI_UNDO')}></span>
                    <span>{translate("studioStartOver")}</span>
                </button>
                <button id="dynamic-step-complete-button" onClick={handleAnalyze} className="btn btn-primary" disabled={!isFullyCalibrated}>
                    <span ref={el => el && setIcon(el, 'UI_THREE')}></span>
                    <span>{translate('studioAnalyzeAndGenerate')}</span>
                </button>
            </div>
        </div>
    );
};