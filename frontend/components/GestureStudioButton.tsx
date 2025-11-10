/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/components/GestureStudioButton.tsx */
import { useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';

export const GestureStudioButton = () => {
  const context = useContext(AppContext);
  
  if (!context) return null;

  const { translate } = context.services.translationService;
  const { actions } = context.appStore.getState();

  const handleOpenStudio = () => {
    // First, dispatch action to close the settings modal.
    actions.closeCurrentOverlay();
    // Then, dispatch action to open the Gesture Studio modal.
    actions.openOverlay('gesture-studio');
  };

  return (
    <button
      id="create-new-gesture-studio-btn"
      type="button"
      className="btn btn-primary"
      onClick={handleOpenStudio}
      title={translate("studioCreateNewTooltip")}
    >
      <span ref={(el: Element | null) => el && setIcon(el, "UI_ADD")} className="material-icons" />
      <span>{translate("studioCreateNew")}</span>
    </button>
  );
};