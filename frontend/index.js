/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/index.js */

async function launchModal(context, manifest) {
  const { services, globalSettingsModalManager } = context;
  const { pubsub } = services;

  if (!globalSettingsModalManager) {
    console.error("[GestureStudio] Cannot launch, GlobalSettingsModalManager not found in context.");
    pubsub.publish('ui:showError', { messageKey: 'studioLaunchError', substitutions: { reason: "Component not found."} });
    return;
  }
  
  globalSettingsModalManager.closeModal();

  try {
    const { initializeStudioUI } = await import('./studio-app.js');
    
    // FIX: Use the correct asset path that works in both dev and prod
    const response = await fetch(`/api/plugins/${manifest.id}/assets/frontend/studio-modal.html`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html.trim();
    
    const studioModalElement = tempContainer.querySelector('#studio-shell');

    if (studioModalElement) {
        document.body.appendChild(studioModalElement);
        initializeStudioUI(context, studioModalElement, manifest);
    } else {
        throw new Error("Failed to find #studio-shell in fetched HTML. The file might be corrupt or the dev server isn't serving it correctly.");
    }
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
        launchModal(context, manifest);
    });
    
    context.pluginUIService.registerContribution('custom-gestures-actions', createBtn, manifest.id);
  }
};

export default gestureStudioPlugin;