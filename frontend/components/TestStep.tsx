/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/components/TestStep.tsx */
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';
import { useStudioSession } from '../hooks/useStudioSession.js';
import { WEBSOCKET_EVENTS } from '#shared/index.js';
import type { StudioSessionData } from '../types.js';
import type { FeatureExtractorResult } from '../utils/studio-utils.js';

interface TestStepProps {
    analysisResult: FeatureExtractorResult | null;
    sessionData: StudioSessionData | null;
    generatedCode: string | null;
    setGeneratedCode: (code: string | null) => void;
    onBack: () => void;
    onClose: () => void;
    getLandmarkSnapshot?: () => Promise<unknown>; // Prop is optional as it's not used here, but passed by wrapper
}

export const TestStep = ({ analysisResult, sessionData, generatedCode, setGeneratedCode, onBack, onClose }: TestStepProps) => {
    const context = useContext(AppContext);
    const [tolerance, setTolerance] = useState(sessionData?.creationType === 'static' ? 0.2 : 0.5);
    const { generateJsFileContent } = useStudioSession(sessionData);
    
    useEffect(() => {
        if (analysisResult) {
            const code = generateJsFileContent(analysisResult, tolerance);
            setGeneratedCode(code);
        }
    }, [analysisResult, tolerance, generateJsFileContent, setGeneratedCode]);

    if (!context || !sessionData) return null;
    
    const { translate } = context.services.translationService;
    const { webSocketService, pubsub } = context.services;

    const handleSave = () => {
        if (!generatedCode || !sessionData) {
            pubsub.publish('ui:showError', { messageKey: 'toastNoGeneratedCode' });
            return;
        }
        webSocketService.sendMessage({
            type: WEBSOCKET_EVENTS.UPLOAD_CUSTOM_GESTURE,
            payload: { ...sessionData, codeString: generatedCode, source: 'studio' }
        });
        onClose();
    };

    return (
        <div id="test-step-container" className="h-full flex flex-col gap-3 justify-between">
            <div className="flex flex-col gap-3">
                <div className="form-group !mb-0">
                    <label htmlFor="gestureToleranceSlider" className="form-label">{translate("studioToleranceLabel")}</label>
                    <div className="slider-group">
                        <output htmlFor="gestureToleranceSlider" className="slider-output">{Math.round(tolerance * 100)}%</output>
                        <div className="slider-container">
                            <input type="range" id="gestureToleranceSlider" className="form-slider" min="0" max="1" step="0.05" value={tolerance} onChange={e => setTolerance(parseFloat(e.target.value))} />
                        </div>
                    </div>
                </div>
                <details id="studio-analysis-details" className="border rounded p-2">
                    <summary className="cursor-pointer font-medium flex items-center gap-1 list-none">
                        <span ref={el => el && setIcon(el, 'UI_ANALYZE')}></span>
                        <span>{translate("studioAnalysis")}</span>
                    </summary>
                    <pre id="studio-analysis-pre" className="text-xs font-mono border rounded p-2 mt-2 min-h-[100px] max-h-[150px] overflow-auto whitespace-pre-wrap">
                        {analysisResult && analysisResult.rules ? JSON.stringify(analysisResult.rules, null, 2) : translate("studioAnalysisStatusAnalyzing")}
                    </pre>
                </details>
                <details id="studio-generated-code-details" className="border rounded p-2" open>
                    <summary className="cursor-pointer font-medium flex items-center gap-1 list-none">
                        <span ref={el => el && setIcon(el, 'code')}></span>
                        <span>{translate("studioGeneratedJS")}</span>
                    </summary>
                    <div className="mt-2">
                        <textarea id="studio-generated-code-textarea" className="form-control text-xs font-mono" rows={10} value={generatedCode || '...'} readOnly></textarea>
                    </div>
                </details>
            </div>
            <div className="flex justify-between items-center mt-auto pt-4">
                <button id="test-step-back-button" onClick={onBack} className="btn btn-secondary">
                    <span ref={el => el && setIcon(el, 'UI_UNDO')}></span>
                    <span>{translate("studioStartOver")}</span>
                </button>
                <button id="test-step-save-button" onClick={handleSave} className="btn btn-primary" disabled={!generatedCode}>
                    <span ref={el => el && setIcon(el, 'UI_SAVE')}></span>
                    <span>{translate("studioSaveGesture")}</span>
                </button>
            </div>
        </div>
    );
};