/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/ui/landmark-selector.js */
const LANDMARK_RADIUS = 5;
const COLORS = {
  default: "rgba(0, 119, 182, 0.7)",
  selected: "rgba(76, 175, 80, 1.0)",
  hover: "rgba(255, 183, 3, 1.0)",
};

export class LandmarkSelector {
  #modalElement;
  #canvas;
  #ctx;
  #onConfirm;
  #onCancel;
  #currentSample = null;
  #selectedIndices = new Set();
  #hoveredIndex = -1;
  #translate;
  #setIcon;
  #context;
  #boundEscapeHandler;
  #selectionMode = 'multiple'; // 'multiple' or 'two_points'

  constructor({ onCancel, translate, setIcon, context }) {
    this.#onCancel = onCancel;
    this.#translate = translate;
    this.#setIcon = setIcon;
    this.#context = context;
    this.#boundEscapeHandler = this.hide.bind(this, true);

    this.#modalElement = document.createElement('div');
    this.#modalElement.id = 'landmark-selector-modal';
    this.#modalElement.className = 'modal hidden';
    document.body.appendChild(this.#modalElement);

    this.#createUI();

    this.#canvas = this.#modalElement.querySelector("#landmark-selector-canvas");
    this.#ctx = this.#canvas.getContext("2d");

    this.#attachEventListeners();
    this.#applyTranslations();
  }
  
  #createUI() {
    this.#modalElement.innerHTML = `
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
  }

  #attachEventListeners() {
    const closeBtn = this.#modalElement.querySelector("#landmark-selector-close-btn");
    closeBtn?.addEventListener("click", () => this.hide(true));
    
    this.#modalElement
      .querySelector("#landmark-confirm-selection-btn")
      ?.addEventListener("click", this.#handleConfirm);
    this.#modalElement
      .querySelector("#landmark-select-all-btn")
      ?.addEventListener("click", this.#selectAll);
    this.#modalElement
      .querySelector("#landmark-deselect-all-btn")
      ?.addEventListener("click", this.#deselectAll);
    this.#canvas.addEventListener("mousemove", this.#handleMouseMove);
    this.#canvas.addEventListener("click", this.#handleClick);
  }

  destroy() {
    this.#modalElement?.remove();
    this.#modalElement = null;
    this.#context.services.pubsub.unsubscribe('escape-for-landmark-selector', this.#boundEscapeHandler);
  }

  show({ sample, initialSelection, selectionMode, onConfirm }) {
    if (!this.#modalElement) return;
    this.#currentSample = sample;
    this.#selectedIndices = new Set(initialSelection);
    this.#selectionMode = selectionMode || 'multiple';
    this.#onConfirm = onConfirm; // Set the specific confirm callback for this session
    
    this.#modalElement.querySelector("#landmark-select-all-btn").style.display = this.#selectionMode === 'multiple' ? 'flex' : 'none';
    this.#modalElement.querySelector("#landmark-deselect-all-btn").style.display = this.#selectionMode === 'multiple' ? 'flex' : 'none';

    this.#modalElement.classList.remove("hidden");
    this.#modalElement.classList.add("visible");
    document.body.classList.add("modal-open");
    
    this.#context.uiComponents.modalStack.push('landmark-selector');
    this.#context.services.pubsub.subscribe('escape-for-landmark-selector', this.#boundEscapeHandler);

    requestAnimationFrame(() => {
      this.#draw();
    });
  }

  hide(wasCancelled = false) {
    if (!this.#modalElement) return;
    this.#modalElement.classList.add("hidden");
    this.#modalElement.classList.remove("visible");
    document.body.classList.remove("modal-open");

    this.#context.uiComponents.modalStack.remove('landmark-selector');
    this.#context.services.pubsub.unsubscribe('escape-for-landmark-selector', this.#boundEscapeHandler);

    if (wasCancelled && this.#onCancel) this.#onCancel();
  }
  
  #draw = async () => {
    if (!this.#ctx || !this.#currentSample) return;
    
    const { imageData, landmarks2d, isMirrored } = this.#currentSample;
    const canvas = this.#canvas;

    // Guard clause: If there's no image data or landmarks, we can't draw anything.
    if (!imageData || !landmarks2d) {
        this.#ctx.clearRect(0, 0, canvas.width, canvas.height);
        console.warn("[LandmarkSelector] Cannot draw: sample is missing imageData or landmarks2d.");
        return;
    }
    
    const imgAspectRatio = imageData.width / imageData.height;
    const canvasAspectRatio = canvas.parentElement.clientWidth / canvas.parentElement.clientHeight;

    if (imgAspectRatio > canvasAspectRatio) {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.width / imgAspectRatio;
    } else {
      canvas.height = canvas.parentElement.clientHeight;
      canvas.width = canvas.height * imgAspectRatio;
    }

    this.#ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (isMirrored) {
        this.#ctx.save();
        this.#ctx.scale(-1, 1);
        this.#ctx.translate(-canvas.width, 0);
    }

    try {
      const imageBitmap = await createImageBitmap(imageData);
      this.#ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
      imageBitmap.close();
    } catch (e) {
      console.error("Error drawing ImageData:", e);
      if (isMirrored) this.#ctx.restore();
      return;
    }
    
    landmarks2d.forEach((lm, index) => {
      const x = lm.x * canvas.width;
      const y = lm.y * canvas.height;

      this.#ctx.beginPath();
      this.#ctx.arc(x, y, LANDMARK_RADIUS, 0, 2 * Math.PI);

      if (index === this.#hoveredIndex) this.#ctx.fillStyle = COLORS.hover;
      else if (this.#selectedIndices.has(index))
        this.#ctx.fillStyle = COLORS.selected;
      else this.#ctx.fillStyle = COLORS.default;

      this.#ctx.fill();
    });

    if (isMirrored) {
      this.#ctx.restore();
    }
  };

  #handleMouseMove = (e) => {
    const landmarks = this.#currentSample?.landmarks2d;
    if (!landmarks) return;

    const isMirrored = this.#currentSample.isMirrored;
    const rect = this.#canvas.getBoundingClientRect();
    const mouseXCanvas = e.clientX - rect.left;
    const mouseYCanvas = e.clientY - rect.top;

    let foundIndex = -1;
    for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        const landmarkX = isMirrored ? 1 - lm.x : lm.x;
        const lmX = landmarkX * this.#canvas.width;
        const lmY = lm.y * this.#canvas.height;
        if (Math.sqrt((mouseXCanvas - lmX) ** 2 + (mouseYCanvas - lmY) ** 2) < LANDMARK_RADIUS + 2) {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex !== this.#hoveredIndex) {
      this.#hoveredIndex = foundIndex;
      this.#draw();
    }
  };

  #handleClick = () => {
    if (this.#hoveredIndex === -1) return;

    if (this.#selectionMode === 'two_points') {
      if (this.#selectedIndices.has(this.#hoveredIndex)) {
        this.#selectedIndices.delete(this.#hoveredIndex);
      } else if (this.#selectedIndices.size < 2) {
        this.#selectedIndices.add(this.#hoveredIndex);
      }
      if (this.#selectedIndices.size === 2) {
        this.#handleConfirm();
      }
    } else { // 'multiple' mode
      if (this.#selectedIndices.has(this.#hoveredIndex)) {
        this.#selectedIndices.delete(this.#hoveredIndex);
      } else {
        this.#selectedIndices.add(this.#hoveredIndex);
      }
    }
    this.#draw();
  };

  #selectAll = () => {
    if (!this.#currentSample) return;
    this.#selectedIndices = new Set(
      Array.from({ length: this.#currentSample.landmarks2d.length }, (_, i) => i)
    );
    this.#draw();
  };

  #deselectAll = () => {
    this.#selectedIndices.clear();
    this.#draw();
  };

  #handleConfirm = () => {
    if (this.#onConfirm) this.#onConfirm(new Set(this.#selectedIndices));
    this.hide();
  };

  #applyTranslations() {
    const el = this.#modalElement;
    const titleEl = el.querySelector('.header-title');
    const iconEl = el.querySelector('.header-icon');
    const closeBtn = el.querySelector('#landmark-selector-close-btn');

    if (titleEl) titleEl.textContent = this.#translate("landmarkSelectorTitle");
    if (iconEl) this.#setIcon(iconEl, 'UI_HANDS_LANDMARKS_DROPDOWN_TRIGGER');
    if (closeBtn) this.#setIcon(closeBtn, 'UI_CLOSE');

    const setupButton = (buttonId, iconKey, textKey) => {
        const button = el.querySelector(`#${buttonId}`);
        if (!button) return;

        button.innerHTML = '';

        const iconSpan = document.createElement('span');
        this.#setIcon(iconSpan, iconKey);
        
        const textSpan = document.createElement('span');
        textSpan.textContent = this.#translate(textKey);

        button.appendChild(iconSpan);
        button.appendChild(textSpan);
    };

    setupButton("landmark-select-all-btn", "UI_CHECK_CIRCLE", "selectAll");
    setupButton("landmark-deselect-all-btn", "UI_HIGHLIGHT_OFF", "deselectAll");
    setupButton("landmark-confirm-selection-btn", "UI_CONFIRM", "confirmSelection");
  }
}