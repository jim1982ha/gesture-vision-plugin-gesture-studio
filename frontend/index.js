/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/index.js */

// Ensure the global registry exists
if (!window.GestureVisionPlugins) {
  window.GestureVisionPlugins = {};
}

async function launchModal(context) {
  const { services, globalSettingsModalManager, manifest } = context;
  const { pubsub } = services;

  if (!globalSettingsModalManager) {
    console.error("[GestureStudio] Cannot launch, GlobalSettingsModalManager not found in context.");
    pubsub.publish('ui:showError', { messageKey: 'studioLaunchError', substitutions: { reason: "Component not found."} });
    return;
  }
  
  globalSettingsModalManager.closeModal();

  try {
    const { initializeStudioUI } = await import('./studio-app.js');
    
    // This fetch now works because the new NPM advanced config proxies /plugins/ correctly.
    const response = await fetch(`/plugins/${manifest.id}/frontend/ui/landmark-selector.html`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const landmarkSelectorTemplate = await response.text();

    const studioModalElement = document.createElement('div');
    studioModalElement.id = 'studio-shell';
    studioModalElement.className = 'modal visible';
    studioModalElement.setAttribute('role', 'dialog');
    studioModalElement.setAttribute('aria-modal', 'true');
    studioModalElement.setAttribute('aria-labelledby', 'studio-header-title-text');
    
    document.body.appendChild(studioModalElement);
    
    initializeStudioUI(context, studioModalElement, { landmarkSelectorTemplate });

  } catch(error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error('Failed to load gesture studio assets or initialize:', error);
      pubsub.publish('ui:showError', { messageKey: 'studioLaunchError', substitutions: { reason } });
  }
}

const gestureStudioPlugin = {
  async init(context) {
    if (document.getElementById('create-new-gesture-studio-btn')) {
        console.warn('[GestureStudio Plugin] "Create New..." button already exists. Skipping re-creation.');
        return;
    }
    
    const { coreStateManager: appStore, services, uiComponents, manifest } = context;
    const { translate } = services;
    const { setIcon } = uiComponents;
    
    const createBtn = document.createElement('button');
    createBtn.id = 'create-new-gesture-studio-btn';
    createBtn.type = 'button';
    createBtn.className = 'btn btn-primary';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'material-icons';
    createBtn.appendChild(iconSpan);

    const textSpan = document.createElement('span');
    textSpan.id = 'create-new-gesture-studio-btn-text';
    createBtn.appendChild(textSpan);
    
    const updateButtonTextAndIcon = () => {
        textSpan.textContent = translate("studioCreateNew");
        createBtn.title = translate("studioCreateNewTooltip", { defaultValue: "Create a new gesture using the Gesture Studio" });
        setIcon(createBtn, "UI_ADD");
    };
    
    updateButtonTextAndIcon(); 
    appStore.subscribe((state, prevState) => {
        if (state.languagePreference !== prevState.languagePreference) {
            updateButtonTextAndIcon();
        }
    });

    createBtn.addEventListener('click', () => {
        launchModal(context);
    });
    
    context.pluginUIService.registerContribution('custom-gestures-actions-slot', createBtn, manifest.id);
  }
};

window.GestureVisionPlugins['gesture-vision-plugin-gesture-studio'] = gestureStudioPlugin;

export default gestureStudioPlugin;