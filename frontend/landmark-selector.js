/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/landmark-selector.js */
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

  constructor({ modalElement, onConfirm, onCancel, translate, setIcon }) {
    this.#modalElement = modalElement;
    this.#canvas = this.#modalElement.querySelector(
      "#landmark-selector-canvas"
    );
    this.#ctx = this.#canvas.getContext("2d");
    this.#onConfirm = onConfirm;
    this.#onCancel = onCancel;
    this.#translate = translate;
    this.#setIcon = setIcon;
    this.#attachEventListeners();
    this.#applyTranslations();
    // FIX: Set the header icon on initialization
    this.#setIcon(this.#modalElement.querySelector(".header-icon"), 'UI_HANDS_LANDMARKS_DROPDOWN_TRIGGER');
  }

  #attachEventListeners() {
    this.#modalElement
      .querySelector("#landmark-selector-close-btn")
      ?.addEventListener("click", () => this.hide());
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
    this.#setIcon(this.#modalElement.querySelector("#landmark-selector-close-btn"), 'UI_CLOSE');
  }

  show(sample, initialSelection) {
    this.#currentSample = sample;
    this.#selectedIndices = new Set(initialSelection);

    this.#modalElement.classList.remove("hidden");
    this.#modalElement.classList.add("visible");
    document.body.classList.add("modal-open");

    requestAnimationFrame(() => {
      this.#draw();
    });
  }

  hide() {
    this.#modalElement.classList.add("hidden");
    this.#modalElement.classList.remove("visible");
    document.body.classList.remove("modal-open");
    if (this.#onCancel) this.#onCancel();
  }

  #draw = async () => {
    if (!this.#currentSample || !this.#ctx) return;
    const { imageData, landmarks } = this.#currentSample;
    const canvas = this.#canvas;

    const imgAspectRatio = imageData.width / imageData.height;
    const canvasAspectRatio =
      canvas.parentElement.clientWidth / canvas.parentElement.clientHeight;

    if (imgAspectRatio > canvasAspectRatio) {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.width / imgAspectRatio;
    } else {
      canvas.height = canvas.parentElement.clientHeight;
      canvas.width = canvas.height * imgAspectRatio;
    }

    this.#ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const imageBitmap = await createImageBitmap(imageData);
      this.#ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
      imageBitmap.close();
    } catch (e) {
      console.error("Error drawing ImageData:", e);
      return;
    }

    landmarks.forEach((lm, index) => {
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
  };

  #handleMouseMove = (e) => {
    const rect = this.#canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let foundIndex = -1;
    if (this.#currentSample) {
      for (let i = 0; i < this.#currentSample.landmarks.length; i++) {
        const lm = this.#currentSample.landmarks[i];
        const lmX = lm.x * this.#canvas.width;
        const lmY = lm.y * this.#canvas.height;
        if (Math.sqrt((x - lmX) ** 2 + (y - lmY) ** 2) < LANDMARK_RADIUS + 2) {
          foundIndex = i;
          break;
        }
      }
    }

    if (foundIndex !== this.#hoveredIndex) {
      this.#hoveredIndex = foundIndex;
      this.#draw();
    }
  };

  #handleClick = () => {
    if (this.#hoveredIndex !== -1) {
      if (this.#selectedIndices.has(this.#hoveredIndex))
        this.#selectedIndices.delete(this.#hoveredIndex);
      else this.#selectedIndices.add(this.#hoveredIndex);
      this.#draw();
    }
  };

  #selectAll = () => {
    if (!this.#currentSample) return;
    this.#selectedIndices = new Set(
      Array.from({ length: this.#currentSample.landmarks.length }, (_, i) => i)
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
    el.querySelector("#landmark-selector-title").textContent = this.#translate(
      "landmarkSelectorTitle"
    );

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