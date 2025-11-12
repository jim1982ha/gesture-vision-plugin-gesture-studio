/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/hooks/useGestureStudio.tsx */
import { useState, useMemo, useCallback } from 'react';
import type { PluginUIContext } from '#frontend/types/index.js';
import { SetupStep } from '../components/SetupStep.js';
import { RecordStep } from '../components/RecordStep.js';
import { TestStep } from '../components/TestStep.js';
import { DynamicStep } from '../components/DynamicStep.js';
import type { FeatureExtractorResult } from '../utils/studio-utils.js';
import { useStudioSession } from './useStudioSession.js';
import { type Tab } from '#frontend/components/shared/Tabs.js';
import type { StudioSection, StudioSessionData } from '../types.js';
import { StudioStepWrapper } from '../components/StudioStepWrapper.js';

export const useGestureStudio = (context: PluginUIContext, onClose: () => void) => {
    const [activeTabKey, setActiveTabKey] = useState<StudioSection>('define');
    const [sessionData, setSessionData] = useState<StudioSessionData | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FeatureExtractorResult | object | null>(null);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const { generateJsFileContent } = useStudioSession(sessionData);

    const { translate } = context.services.translationService;

    const handleSetupComplete = useCallback((data: StudioSessionData) => {
        setSessionData(data);
        setAnalysisResult(null); // Clear previous results when starting a new session
        setActiveTabKey(data.creationType === 'static' ? 'record' : 'dynamic_calibrate');
    }, []);

    const handleRecordComplete = useCallback((result: FeatureExtractorResult) => {
        setAnalysisResult(result);
        const code = generateJsFileContent(result, 0.2);
        setGeneratedCode(code);
        setActiveTabKey('test');
    }, [generateJsFileContent]);

    const handleCalibrateComplete = useCallback((result: FeatureExtractorResult | object | null) => {
        setAnalysisResult(result); // This will be an empty object for dynamic gestures
        const code = generateJsFileContent(null, 0.5); // Pass null for dynamic, as it gets data from the hook
        setGeneratedCode(code);
        setActiveTabKey('test');
    }, [generateJsFileContent]);

    const handleStartOver = useCallback(() => {
        setSessionData(null);
        setAnalysisResult(null);
        setGeneratedCode(null);
        setActiveTabKey('define');
    }, []);

    const tabs: Tab[] = useMemo(() => {
        const recordKey = sessionData?.creationType === 'static' ? 'record' : 'dynamic_calibrate';
        
        // The 'disabled' check for the 'test' tab now correctly handles an empty object as a valid signal.
        const isTestStepDisabled = !sessionData || analysisResult === null;

        return [
            { key: 'define', label: translate('studioTabDefine'), icon: 'UI_TUNE', component: <SetupStep onSetupComplete={handleSetupComplete} /> },
            { 
                key: recordKey,
                label: translate(sessionData?.creationType === 'static' ? 'studioTabRecord' : 'studioTabCalibrate'), 
                icon: 'UI_CAMERA', 
                disabled: !sessionData,
                component: sessionData && (
                    <StudioStepWrapper sessionData={sessionData}>
                        {(getLandmarkSnapshot) => sessionData.creationType === 'static' 
                            ? <RecordStep context={context} sessionData={sessionData} onComplete={handleRecordComplete} onBack={handleStartOver} getLandmarkSnapshot={getLandmarkSnapshot} />
                            : <DynamicStep sessionData={sessionData} onComplete={handleCalibrateComplete} onBack={handleStartOver} getLandmarkSnapshot={getLandmarkSnapshot} />
                        }
                    </StudioStepWrapper>
                )
            },
            { 
                key: 'test', 
                label: translate('studioTabTest'), 
                icon: 'UI_ANALYZE',
                disabled: isTestStepDisabled,
                component: sessionData && !isTestStepDisabled && (
                    <StudioStepWrapper sessionData={sessionData} isTestStep generatedCode={generatedCode} tolerance={sessionData.creationType === 'static' ? 0.2 : 0.5}>
                        {(_getLandmarkSnapshot) => (
                           <TestStep sessionData={sessionData} analysisResult={analysisResult as FeatureExtractorResult | null} generatedCode={generatedCode} setGeneratedCode={setGeneratedCode} onBack={handleStartOver} onClose={onClose} />
                        )}
                    </StudioStepWrapper>
                )
            },
        ];
    }, [translate, sessionData, context, analysisResult, generatedCode, handleSetupComplete, handleRecordComplete, handleCalibrateComplete, handleStartOver, onClose]);

    return {
        activeTabKey,
        setActiveTabKey,
        tabs,
        translate,
    };
};