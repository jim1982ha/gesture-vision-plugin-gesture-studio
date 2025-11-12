/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/components/SetupStep.tsx */
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { pubsub, CAMERA_SOURCE_EVENTS } from '#shared/index.js';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';
import type { StudioSessionData, GestureType, CreationType } from '../types.js';

interface SetupStepProps {
    onSetupComplete: (data: StudioSessionData) => void;
}

export const SetupStep = ({ onSetupComplete }: SetupStepProps) => {
    const context = useContext(AppContext);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [gestureType, setGestureType] = useState<GestureType>('hand');
    const [creationType, setCreationType] = useState<CreationType>('static');
    const [samplesNeeded, setSamplesNeeded] = useState(3);
    const [cameraId, setCameraId] = useState('');
    const [deviceMap, setDeviceMap] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        if (!context || !context.services.cameraService) return;
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
        cameraService.refreshDeviceList();
        return () => unsubscribe();
    }, [context, cameraId]);
    
    if (!context) return null;
    const { translate } = context.services.translationService;
    
    const handleSubmit = () => {
        if (!name.trim()) { pubsub.publish('ui:showError', { messageKey: "toastGestureNameRequired" }); return; }
        onSetupComplete({ name, description, samplesNeeded, cameraId, type: gestureType, creationType });
    };

    return (
        <div id="setup-step-container" className="h-full flex flex-col justify-between">
            <div className="flex flex-col gap-3">
                <div className="form-group !mb-0">
                    <p className="form-label">{translate("studioCreationTypeTitle")}</p>
                    <div className="button-toggle-group">
                        <button onClick={() => setCreationType('static')} className={`btn btn-secondary ${creationType === 'static' ? 'active' : ''}`}>
                            <span ref={el => el && setIcon(el, 'UI_GESTURE')}></span><span>{translate("studioCreationTypeStatic")}</span>
                        </button>
                        <button onClick={() => setCreationType('dynamic')} className={`btn btn-secondary ${creationType === 'dynamic' ? 'active' : ''}`}>
                            <span ref={el => el && setIcon(el, 'UI_ANALYZE')}></span><span>{translate("studioCreationTypeDynamic")}</span>
                        </button>
                    </div>
                </div>
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
                {creationType === 'static' && (
                    <div className="form-group !mb-0">
                        <label htmlFor="samples-to-record" className="form-label">{translate("studioSamplesToRecord")}</label>
                        <input type="number" id="samples-to-record" className="form-control" value={samplesNeeded} onChange={e => setSamplesNeeded(parseInt(e.target.value, 10))} min="3" max="10" />
                    </div>
                )}
            </div>
            <div className="flex justify-end items-center mt-auto pt-4">
                <button id="setup-step-complete-button" onClick={handleSubmit} className="btn btn-primary" disabled={!name.trim()}>
                    <span ref={el => el && setIcon(el, 'UI_TWO')}></span>
                    <span>{translate("studioConfirmAndStart")}</span>
                </button>
            </div>
        </div>
    );
};