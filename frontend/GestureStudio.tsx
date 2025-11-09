import React, { useState, useEffect } from 'react';
import type { PluginUIContext } from '#frontend/types/index.js';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';
import { useStudioCamera } from './hooks/useStudioCamera.js';
import { SetupStep } from './components/SetupStep.js';
import { RecordStep } from './components/RecordStep.js';
import { TestStep } from './components/TestStep.js';
import { DynamicStep } from './components/DynamicStep.js';
import type { FeatureExtractorResult } from './utils/studio-utils.js';
import { pubsub } from '#shared/index.js';

export type StudioStep = 'select_type' | 'define' | 'record' | 'dynamic_calibrate' | 'test';
export type CreationType = 'static' | 'dynamic';
export type GestureType = 'hand' | 'pose';

export interface StudioSessionData {
  name: string;
  description: string;
  type: GestureType;
  creationType: CreationType;
  samplesNeeded: number;
  cameraId: string;
}

export const GestureStudio = ({ context, onClose }: { context: PluginUIContext, onClose: () => void }) => {
    const [step, setStep] = useState<StudioStep>('select_type');
    const [sessionData, setSessionData] = useState<StudioSessionData | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FeatureExtractorResult | null>(null);
    const { startCamera, stopAndRestoreCamera } = useStudioCamera(context);

    useEffect(() => {
        context.coreStateManager.getState().actions.pushToModalStack('gesture-studio');
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            context.coreStateManager.getState().actions.removeFromModalStack('gesture-studio');
            stopAndRestoreCamera();
        };
    }, [onClose, context, stopAndRestoreCamera]);

    const { translate } = context.services.translationService;

    const handleCreationTypeSelect = (creationType: CreationType) => {
        setSessionData({ creationType } as StudioSessionData);
        setStep('define');
    };

    const handleSetupComplete = async (data: StudioSessionData) => {
        setSessionData(data);
        try {
            await startCamera(data);
            setStep(data.creationType === 'static' ? 'record' : 'dynamic_calibrate');
        } catch (error) {
            console.error('[GestureStudio] Failed to start camera for session:', error);
            pubsub.publish('ui:showError', { messageKey: 'studioLaunchError', substitutions: { reason: (error as Error).message } });
        }
    };

    const handleRecordComplete = (result: FeatureExtractorResult) => {
        setAnalysisResult(result);
        setStep('test');
    };
    
    const handleCalibrateComplete = () => {
        const dummyResult: FeatureExtractorResult = {
            rules: { type: sessionData!.type, chirality: 'none', vectors: [], relativePositions: [] },
            focusPoints: []
        };
        setAnalysisResult(dummyResult);
        setStep('test');
    };

    const handleBackToSetup = () => {
        stopAndRestoreCamera();
        setStep('define');
    };

    const handleStartOver = () => {
        stopAndRestoreCamera();
        setSessionData(null);
        setStep('select_type');
    };

    const renderStepContent = () => {
        if (!sessionData) {
            return (
                <div id="creation-type-selection-section">
                    <p className="form-label">{translate("studioCreationTypeTitle")}</p>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                        <button onClick={() => handleCreationTypeSelect('static')} className="btn btn-secondary !h-auto !p-3 !items-start !text-left"><div className="flex flex-col"><strong>{translate("studioCreationTypeStatic")}</strong><small>{translate("studioCreationTypeStaticDesc")}</small></div></button>
                        <button onClick={() => handleCreationTypeSelect('dynamic')} className="btn btn-secondary !h-auto !p-3 !items-start !text-left"><div className="flex flex-col"><strong>{translate("studioCreationTypeDynamic")}</strong><small>{translate("studioCreationTypeDynamicDesc")}</small></div></button>
                    </div>
                </div>
            );
        }
        switch (step) {
            case 'define': return <SetupStep sessionData={sessionData} onSetupComplete={handleSetupComplete} onBack={handleStartOver} />;
            case 'record': return <RecordStep context={context} sessionData={sessionData} onComplete={handleRecordComplete} onBack={handleBackToSetup} />;
            case 'dynamic_calibrate': return <DynamicStep sessionData={sessionData} onComplete={handleCalibrateComplete} onBack={handleBackToSetup} />;
            case 'test': return <TestStep sessionData={sessionData} analysisResult={analysisResult} onBack={handleBackToSetup} onClose={onClose} />;
            default: return null;
        }
    };
    
    return (
        <div id="gesture-studio-modal" className="modal visible" role="dialog" aria-modal="true">
            <div className="modal-content !max-w-6xl h-[90vh]">
                <div className="modal-header">
                    <span ref={el => el && setIcon(el, 'gesture')} className="header-icon material-icons"></span>
                    <span className="header-title">{translate('pluginStudioName')}</span>
                    <button onClick={onClose} className="btn btn-icon header-close-btn" aria-label="Close">
                        <span ref={el => el && setIcon(el, 'UI_CLOSE')}></span>
                    </button>
                </div>
                <div className="modal-scrollable-content p-2 desktop:p-4">
                    <div className="flex flex-col desktop:flex-row gap-4 w-full h-full">
                        <div className="flex-grow-[2] min-w-0 min-h-[200px] desktop:min-h-0 relative flex">
                            <div id="studio-video-placeholder" className="relative flex-grow flex items-center justify-center rounded-md overflow-hidden">
                                <div id="live-test-display" className="absolute z-10 p-2 rounded-md shadow-lg leading-tight backdrop-blur-sm hidden"></div>
                            </div>
                        </div>
                        <div className="flex-grow min-w-[320px] flex flex-col">
                            <div id="studio-controls-panel" className="rounded-lg shadow-sm p-3 flex flex-col h-full">
                                {renderStepContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};