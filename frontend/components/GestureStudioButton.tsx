import React, { useState, useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import type { PluginUIContext } from '#frontend/types/index.js';
import { GestureStudio } from '../GestureStudio.js';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';

export const GestureStudioButton = () => {
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const context = useContext(AppContext);
  
  if (!context) return null;

  const { translate } = context.services.translationService;
  const pluginUIContext: PluginUIContext = context.services.pluginUIService.getPluginUIContext('gesture-vision-plugin-gesture-studio');

  return (
    <>
      <button
        id="create-new-gesture-studio-btn"
        type="button"
        className="btn btn-primary"
        onClick={() => setIsStudioOpen(true)}
        title={translate("studioCreateNewTooltip")}
      >
        <span ref={(el: Element | null) => el && setIcon(el, "UI_ADD")} className="material-icons" />
        <span>{translate("studioCreateNew")}</span>
      </button>
      {isStudioOpen && (
        <GestureStudio context={pluginUIContext} onClose={() => setIsStudioOpen(false)} />
      )}
    </>
  );
};