import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { pubsub, CAMERA_SOURCE_EVENTS } from '#shared/index.js';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';
import type { StudioSessionData, GestureType } from '../GestureStudio.js';

interface SetupStepProps {
    sessionData: Partial<StudioSessionData>;
    onSetupComplete: (data: StudioSessionData) => void;
    onBack: () => void;
}

export const SetupStep = ({ sessionData, onSetupComplete, onBack }: SetupStepProps) => {
    const context = useContext(AppContext);
    const [name, setName] = useState(sessionData.name || '');
    const [description, setDescription] = useState(sessionData.description || '');
    const [gestureType, setGestureType] = useState<GestureType>(sessionData.type || 'hand');
    const [samplesNeeded, setSamplesNeeded] = useState(sessionData.samplesNeeded || 3);
    const [cameraId, setCameraId] = useState(sessionData.cameraId || '');
    const [deviceMap, setDeviceMap] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        if (!context) return;
        const { cameraService } = context.services;
        const updateMap = (map: unknown) => {
            const newMap = new Map(map as Map<string, string>);
            setDeviceMap(newMap);
            if (!cameraId && newMap.size > 0) {
                const firstKey = newMap.keys().next().value;
                if (firstKey) setCameraId(firstKey);
            }
        };
        const unsubscribe = pubsub.subscribe(CAMERA_SOURCE_EVENTS.MAP_UPDATED, updateMap);
        cameraService?.getCameraManager().getCameraSourceManager().refreshDeviceList();
        return () => unsubscribe();
    }, [context, cameraId]);
    
    if (!context) return null;
    const { translate } = context.services.translationService;
    
    const handleSubmit = () => {
        if (!name) {
            pubsub.publish('ui:showError', { messageKey: "toastGestureNameRequired" });
            return;
        }
        onSetupComplete({
            name, description, samplesNeeded, cameraId, type: gestureType,
            creationType: sessionData.creationType!,
        });
    };

    return (
        <div className="h-full flex flex-col justify-between">
            <div className="flex flex-col gap-3">
                <div className="form-group !mb-0">
                    <label htmlFor="gesture-name" className="form-label">{translate("studioGestureName")}</label>
                    <input type="text" id="gesture-name" className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder={translate("studioGestureNamePlaceholder")} />
                </div>
                <div className="form-group !mb-0">
                    <label htmlFor="gesture-description" className="form-label">{translate("studioGestureDesc")}</label>
                    <textarea id="gesture-description" className="form-control" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder={translate("studioGestureDescPlaceholder")} />
                </div>
                <div className="form-group !mb-0">
                    <label htmlFor="gesture-type" className="form-label">{translate("studioGestureType")}</label>
                    <select id="gesture-type" className="form-control" value={gestureType} onChange={e => setGestureType(e.target.value as GestureType)}>
                        <option value="hand">{translate("studioGestureTypeHand")}</option>
                        <option value="pose">{translate("studioGestureTypePose")}</option>
                    </select>
                </div>
                <div className="form-group !mb-0">
                    <label htmlFor="studio-camera-select" className="form-label">{translate("selectCameraSource")}</label>
                    <select id="studio-camera-select" className="form-control" value={cameraId} onChange={e => setCameraId(e.target.value)}>
                        {[...deviceMap.entries()].map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                    </select>
                </div>
                {sessionData.creationType === 'static' && (
                    <div className="form-group !mb-0">
                        <label htmlFor="samples-to-record" className="form-label">{translate("studioSamplesToRecord")}</label>
                        <input type="number" id="samples-to-record" className="form-control" value={samplesNeeded} onChange={e => setSamplesNeeded(parseInt(e.target.value, 10))} min="3" max="10" />
                    </div>
                )}
            </div>
            <div className="flex justify-between items-center mt-auto">
                <button onClick={onBack} className="btn btn-secondary">
                    <span ref={el => el && setIcon(el, 'UI_ONE')}></span>
                    <span>{translate("studioStartOver")}</span>
                </button>
                <button onClick={handleSubmit} className="btn btn-primary">
                    <span ref={el => el && setIcon(el, 'UI_TWO')}></span>
                    <span>{translate("studioConfirmAndStart")}</span>
                </button>
            </div>
        </div>
    );
};