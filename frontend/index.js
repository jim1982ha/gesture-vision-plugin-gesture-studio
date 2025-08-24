/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/index.js */
// The static import is removed. Code will be loaded dynamically on demand.

// Access core functionalities from the passed context object
function launchModal(context, manifest) {
  const { services } = context;
  const { pubsub, translate } = services;
  const { globalSettingsModalManager } = context;

  if (!globalSettingsModalManager) {
    console.error("[GestureStudio] Cannot launch, GlobalSettingsModalManager not found in context.");
    pubsub.publish('ui:showError', { message: translate('errorGeneric', { message: `Could not open Gesture Studio.` }) });
    return;
  }
  
  globalSettingsModalManager.closeModal();

  // Dynamically import the studio-app module
  import('./studio-app.js')
    .then(({ initializeStudioUI }) => {
      fetch(`/api/plugins/assets/${manifest.id}/frontend/studio-modal.html`)
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
            // Call the imported function only after the module is loaded
            initializeStudioUI(context, studioModalElement, manifest);
          } else {
            throw new Error("Failed to parse studio-modal.html: #studio-shell not found");
          }
        })
        .catch(error => {
          console.error('Failed to load gesture studio assets or initialize:', error);
          pubsub.publish('ui:showError', { message: translate('errorGeneric', { message: 'Could not open Gesture Studio.' }) });
        });
    })
    .catch(error => {
      console.error('Failed to dynamically load gesture studio module:', error);
      pubsub.publish('ui:showError', { message: translate('errorGeneric', { message: 'Could not load Gesture Studio module.' }) });
    });
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