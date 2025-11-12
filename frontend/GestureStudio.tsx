/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/GestureStudio.tsx */
import type { PluginUIContext } from '#frontend/types/index.js';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';
import { useGestureStudio } from './hooks/useGestureStudio.js';
import { Tabs } from '#frontend/components/shared/Tabs.js';

export const GestureStudio = ({ context, onClose }: { context: PluginUIContext, onClose: () => void }) => {
    const {
        activeTabKey,
        setActiveTabKey,
        tabs,
        translate,
    } = useGestureStudio(context, onClose);

    return (
        <div id="gesture-studio-modal" className="modal visible" role="dialog" aria-modal="true">
            <div className="modal-content modal-content-lg">
                <div id="gesture-studio-modal-header" className="modal-header">
                    <span ref={el => el && setIcon(el, 'gesture')} className="header-icon material-icons"></span>
                    <span id="gesture-studio-modal-title" className="header-title">{translate('pluginStudioName')}</span>
                    <button id="gesture-studio-modal-close-button" onClick={onClose} className="btn btn-icon header-close-btn" aria-label="Close">
                        <span ref={el => el && setIcon(el, 'UI_CLOSE')}></span>
                    </button>
                </div>
                <Tabs tabs={tabs} activeTab={activeTabKey} onTabChange={(key: string) => setActiveTabKey(key as ReturnType<typeof useGestureStudio>['activeTabKey'])} />
            </div>
        </div>
    );
};