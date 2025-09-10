/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/index.js */

// Ensure the global registry exists
if (!window.GestureVisionPlugins) {
  window.GestureVisionPlugins = {};
}

// FIX: Embed the HTML template directly into the JavaScript to avoid a separate fetch.
const landmarkSelectorTemplate = `
<div id="landmark-selector-modal-content" class="modal-content !max-w-3xl h-[90vh]">
  <div id="landmark-selector-header" class="modal-header">
    <span class="header-icon material-icons"></span>
    <span class="header-title"></span>
    <button id="landmark-selector-close-btn" class="btn btn-icon header-close-btn" aria-label="Close"><span class="mdi"></span></button>
  </div>
  <div class="modal-scrollable-content !p-0">
    <div id="landmark-canvas-container" class="w-full h-full flex justify-center items-center bg-background overflow-hidden relative">
      <canvas id="landmark-selector-canvas" class="max-w-full max-h-full object-contain cursor-pointer"></canvas>
    </div>
  </div>
  <div class="modal-actions !justify-between">
    <div class="flex gap-2">
      <button id="landmark-select-all-btn" class="btn btn-secondary"></button>
      <button id="landmark-deselect-all-btn" class="btn btn-secondary"></button>
    </div>
    <button id="landmark-confirm-selection-btn" class="btn btn-primary"></button>
  </div>
</div>
`;


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
    
    // FIX: The fetch call has been removed. The template is now a local constant.
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