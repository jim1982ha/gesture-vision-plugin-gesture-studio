import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';
import { useStudioSession } from '../hooks/useStudioSession.js';
import { useLiveTester } from '../hooks/useLiveTester.js';
import { WEBSOCKET_EVENTS } from '#shared/index.js';
import type { StudioSessionData } from '../GestureStudio.js';
import type { TestResultPayload } from '#frontend/types/index.js';
import type { FeatureExtractorResult } from '../utils/studio-utils.js';

interface TestStepProps {
    analysisResult: FeatureExtractorResult | null;
    sessionData: StudioSessionData;
    onBack: () => void;
    onClose: () => void;
}

const LiveTestDisplay = ({ testResult }: { testResult: TestResultPayload | null }) => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { translate } = context.services.translationService;

    if (!testResult) return null;
    
    const detectedText = testResult.detected ? translate("studioStatusDetected") : translate("studioStatusNotDetected");
    const colorClass = testResult.detected ? 'text-success' : 'text-error';
    const confidenceText = (testResult.confidence != null) ? `${(testResult.confidence * 100).toFixed(1)}%` : "-";

    return (
        <div id="live-test-display-content" className="p-1">
            <div>{translate('studioLiveStatus')}: <strong className={colorClass}>{detectedText}</strong></div>
            <div>{translate('studioLiveConfidence')}: <span>{confidenceText}</span></div>
        </div>
    );
};

export const TestStep = ({ analysisResult, sessionData, onBack, onClose }: TestStepProps) => {
    const context = useContext(AppContext);
    const { generateJsFileContent } = useStudioSession(sessionData);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const { testResult, tolerance, updateTolerance } = useLiveTester(generatedCode, sessionData.type);
    
    useEffect(() => {
        if (analysisResult) {
            const code = generateJsFileContent(analysisResult, tolerance);
            setGeneratedCode(code);
        }
    }, [analysisResult, tolerance, generateJsFileContent]);

    useEffect(() => {
        const liveDisplay = document.getElementById('live-test-display');
        const isDynamic = sessionData?.creationType === 'dynamic';
        if (liveDisplay) liveDisplay.style.display = isDynamic ? 'block' : 'none';
    }, [sessionData?.creationType]);

    if (!context) return null;
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
        <div className="h-full flex flex-col gap-3 justify-between">
            <LiveTestDisplay testResult={testResult} />
            <div className="flex flex-col gap-3">
                <div className="form-group !mb-0">
                    <label htmlFor="gestureToleranceSlider" className="form-label">{translate("studioToleranceLabel")}</label>
                    <div className="slider-group">
                        <output htmlFor="gestureToleranceSlider" className="slider-output">{Math.round(tolerance * 100)}%</output>
                        <div className="slider-container">
                            <input type="range" id="gestureToleranceSlider" className="form-slider" min="0" max="1" step="0.05" value={tolerance} onChange={e => updateTolerance(parseFloat(e.target.value))} />
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
            <div className="flex justify-between items-center mt-auto">
                <button onClick={onBack} className="btn btn-secondary">
                    <span ref={el => el && setIcon(el, 'UI_ONE')}></span>
                    <span>{translate("studioStartOver")}</span>
                </button>
                <button onClick={handleSave} className="btn btn-primary" disabled={!generatedCode}>
                    <span ref={el => el && setIcon(el, 'UI_SAVE')}></span>
                    <span>{translate("studioSaveGesture")}</span>
                </button>
            </div>
        </div>
    );
};