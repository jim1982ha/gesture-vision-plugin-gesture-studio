/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/components/LandmarkSelector.tsx */
import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';
import type { SnapshotData } from '#frontend/types/index.js';

interface LandmarkSelectorProps {
    show: boolean;
    onClose: () => void;
    onConfirm: (selected: Set<number>) => void;
    sample: SnapshotData;
    selectionMode: 'multiple' | 'two_points';
    initialSelection: number[];
}

const LANDMARK_RADIUS = 5;
const COLORS = {
  default: "rgba(0, 119, 182, 0.7)",
  selected: "rgba(76, 175, 80, 1.0)",
  hover: "rgba(255, 183, 3, 1.0)",
};

export const LandmarkSelector = ({ show, onClose, onConfirm, sample, selectionMode, initialSelection }: LandmarkSelectorProps) => {
    const context = useContext(AppContext);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedIndices, setSelectedIndices] = useState(new Set(initialSelection));
    const [hoveredIndex, setHoveredIndex] = useState(-1);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !sample.imageData) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { imageData, landmarks2d, isMirrored } = sample;
        
        const imageBitmapPromise = createImageBitmap(imageData);
        imageBitmapPromise.then(imageBitmap => {
            const imgAspectRatio = imageData.width / imageData.height;
            const parent = canvas.parentElement!;
            const parentRect = parent.getBoundingClientRect();
            const canvasAspectRatio = parentRect.width / parentRect.height;
            
            // Calculate size to fit container while maintaining aspect ratio
            if (imgAspectRatio > canvasAspectRatio) {
                canvas.width = parentRect.width;
                canvas.height = canvas.width / imgAspectRatio;
            } else {
                canvas.height = parentRect.height;
                canvas.width = canvas.height * imgAspectRatio;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // The snapshot from the worker is already non-mirrored/corrected relative to the video feed.
            // If the original stream was mirrored (isMirrored = true), we draw it mirrored
            // to match the expectation from the video element's styling.
            if (isMirrored) { ctx.save(); ctx.scale(-1, 1); ctx.translate(-canvas.width, 0); }
            ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
            if (isMirrored) { ctx.restore(); }
            
            landmarks2d?.forEach((lm, index) => {
                // Landmarker output landmarks are normalized [0, 1].
                // The mirroring is applied here to match the visual flip if 'isMirrored' is true.
                const x = (isMirrored ? 1 - lm.x : lm.x) * canvas.width;
                const y = lm.y * canvas.height;
                ctx.beginPath();
                ctx.arc(x, y, LANDMARK_RADIUS, 0, 2 * Math.PI);
                if (index === hoveredIndex) ctx.fillStyle = COLORS.hover;
                else if (selectedIndices.has(index)) ctx.fillStyle = COLORS.selected;
                else ctx.fillStyle = COLORS.default;
                ctx.fill();
            });

            imageBitmap.close();
        }).catch(err => console.error("Error drawing landmark selector canvas:", err));
    }, [sample, selectedIndices, hoveredIndex]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current || !sample.landmarks2d) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        let foundIndex = -1;
        for (let i = 0; i < sample.landmarks2d.length; i++) {
            const lm = sample.landmarks2d[i];
            // Apply canvas-based mirroring to the landmark position
            const lmX = (sample.isMirrored ? 1 - lm.x : lm.x) * canvasRef.current.width;
            const lmY = lm.y * canvasRef.current.height;
            if (Math.sqrt((mouseX - lmX) ** 2 + (mouseY - lmY) ** 2) < LANDMARK_RADIUS + 2) {
                foundIndex = i;
                break;
            }
        }
        setHoveredIndex(foundIndex);
    };
    
    const handleClick = () => {
        if (hoveredIndex === -1) return;
        const newSelection = new Set(selectedIndices);
        if (selectionMode === 'two_points') {
            if (newSelection.has(hoveredIndex)) newSelection.delete(hoveredIndex);
            else if (newSelection.size < 2) newSelection.add(hoveredIndex);
            if (newSelection.size === 2) onConfirm(newSelection);
        } else {
            if (newSelection.has(hoveredIndex)) newSelection.delete(hoveredIndex);
            else newSelection.add(hoveredIndex);
        }
        setSelectedIndices(newSelection);
    };

    if (!context || !show) return null;
    const { translate } = context.services.translationService;

    return (
        <div id="landmarkSelectorModal" className="modal visible" role="dialog">
            <div className="modal-content !max-w-3xl h-[90vh]">
                <div className="modal-header">
                    <span className="header-title">{translate("landmarkSelectorTitle")}</span>
                    <button onClick={onClose} className="btn btn-icon header-close-btn"><span ref={el => el && setIcon(el, 'UI_CLOSE')}></span></button>
                </div>
                <div className="modal-scrollable-content !p-0">
                    <div id="landmark-selector-canvas-container" className="w-full h-full flex justify-center items-center overflow-hidden relative">
                        {/* We use a max-w-full and max-h-full on the canvas to ensure it fits its parent container */}
                        <canvas ref={canvasRef} onMouseMove={handleMouseMove} onClick={handleClick} className="max-w-full max-h-full object-contain cursor-pointer"></canvas>
                    </div>
                </div>
                <div className="modal-actions !justify-between">
                    <div className="flex gap-2">
                        {selectionMode === 'multiple' && <>
                            <button id="landmark-select-all-button" onClick={() => setSelectedIndices(new Set(Array.from({ length: sample.landmarks2d!.length }, (_, i) => i)))} className="btn btn-secondary">
                                <span ref={el => el && setIcon(el, 'UI_LIST_CHECK')}></span>
                                <span>{translate("selectAll")}</span>
                            </button>
                            <button id="landmark-deselect-all-button" onClick={() => setSelectedIndices(new Set())} className="btn btn-secondary">
                                <span ref={el => el && setIcon(el, 'UI_DELETE_SWEEP')}></span>
                                <span>{translate("deselectAll")}</span>
                            </button>
                        </>}
                    </div>
                    <button id="landmark-confirm-button" onClick={() => onConfirm(selectedIndices)} className="btn btn-primary" disabled={selectionMode === 'two_points' && selectedIndices.size !== 2}>
                        <span ref={el => el && setIcon(el, 'UI_CONFIRM')}></span>
                        <span>{translate("confirmSelection")}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}