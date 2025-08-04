/* FILE: extensions/plugins/gesture-studio/frontend/index.js */
import { initializeStudioUI } from './studio-app.js';

// Access core functionalities from the passed context object
function launchModal(context) {
  const { pubsub, globalSettingsModalManager } = context;

  if (!globalSettingsModalManager) {
    console.error("[GestureStudio] Cannot launch, GlobalSettingsModalManager not found in context.");
    pubsub.publish('ui:showError', { message: `Error: Could not open Gesture Studio.` });
    return;
  }
  
  globalSettingsModalManager.closeModal();

  fetch('/api/plugins/assets/gesture-studio/frontend/studio-modal.html')
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
    })
    .then(html => {
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = html.trim();
      
      const studioModalElement = tempContainer.firstElementChild;

      if (studioModalElement && studioModalElement.id === 'studio-shell') {
        document.body.appendChild(studioModalElement);
        initializeStudioUI(context, studioModalElement);
      } else {
        throw new Error("Failed to parse studio-modal.html: #studio-shell not found");
      }
    })
    .catch(error => {
      console.error('Failed to load or initialize gesture studio:', error);
      pubsub.publish('ui:showError', { message: `Error: Could not open Gesture Studio.` });
    });
}

const gestureStudioPlugin = {
  manifest: { /* Injected by PluginUIService */ },
  
  async init(context) {
    if (document.getElementById('create-new-gesture-studio-btn')) {
        console.warn('[GestureStudio Plugin] "Create New..." button already exists. Skipping re-creation.');
        return;
    }
    
    const { coreStateManager: appStore, services, uiComponents } = context;
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
    
    context.pluginUIService.registerContribution('custom-gestures-actions', createBtn, this.manifest.id);
  }
};

export default gestureStudioPlugin;