/* FILE: extensions/plugins/gesture-studio/frontend/logic/feature-extractor.js */
const MIN_SAMPLES_FOR_STATISTICAL_RELEVANCE = 3;
const RULE_PRUNING_FACTOR = 0.75;
const MAX_ABSOLUTE_TOLERANCE_DIST = 0.1; // Max tolerance in normalized coordinates
const MAX_ABSOLUTE_TOLERANCE_ANGLE = 45.0; // Max tolerance in degrees

export class FeatureExtractor {
  #gestureType;
  constructor(gestureType) {
    if (gestureType !== "hand" && gestureType !== "pose")
      throw new Error("Invalid gesture type.");
    this.#gestureType = gestureType;
  }

  #calculateStats(values) {
    const minObserved = Math.min(...values);
    const maxObserved = Math.max(...values);
    const range = maxObserved - minObserved;
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    const variation = avg > 1e-6 ? range / avg : range > 1e-6 ? 1e6 : 0;
    return { avg, min: minObserved, max: maxObserved, variation };
  }

  extract(samples, selectedLandmarkIndices = null) {
    if (!samples || samples.length < MIN_SAMPLES_FOR_STATISTICAL_RELEVANCE) {
      console.warn( `[FeatureExtractor] Need ${ MIN_SAMPLES_FOR_STATISTICAL_RELEVANCE } samples, got ${samples?.length || 0}.` );
      return null;
    }

    const focusPointsForDisplay =
      selectedLandmarkIndices && selectedLandmarkIndices.size > 0
        ? selectedLandmarkIndices
        : this.#getFallbackFocusPoints(samples);

    const allPotentialRules = [];
    const ruleGroups =
      this.#gestureType === "hand"
        ? this.#getHandRuleGroups()
        : this.#getPoseRuleGroups();

    const addRule = (ruleDef, type) => {
      const values = samples
        .map((s) =>
          type === "distance"
            ? self.GestureUtils.calculateDistance(
                s.landmarks[ruleDef.p1],
                s.landmarks[ruleDef.p2]
              )
            : self.GestureUtils.calculateAngle(
                s.landmarks[ruleDef.p1],
                s.landmarks[ruleDef.p2],
                s.landmarks[ruleDef.p3]
              )
        )
        .filter((v) => v !== null && isFinite(v));

      if (values.length >= MIN_SAMPLES_FOR_STATISTICAL_RELEVANCE) {
        allPotentialRules.push({
          type: type,
          points: ruleDef,
          stats: this.#calculateStats(values),
        });
      }
    };

    ruleGroups.relativeDistances.forEach((indices) =>
      addRule({ p1: indices[0], p2: indices[1] }, "distance")
    );
    ruleGroups.jointAngles.forEach((indices) =>
      addRule(
        { p1: indices[0], p2: indices[1], p3: indices[2] },
        "angle"
      )
    );

    allPotentialRules.sort((a, b) => a.stats.variation - b.stats.variation);

    const numberOfRulesToKeep = Math.max(
      5,
      Math.floor(allPotentialRules.length * RULE_PRUNING_FACTOR)
    );
    const bestRules = allPotentialRules.slice(0, numberOfRulesToKeep);

    const finalExtractedRules = {
      type: this.#gestureType,
      relativeDistances: [],
      jointAngles: [],
    };

    bestRules.forEach((rule) => {
      const ruleData = { ...rule.points, ...rule.stats };
      delete ruleData.variation;
      if (rule.type === "distance")
        finalExtractedRules.relativeDistances.push(ruleData);
      else if (rule.type === "angle")
        finalExtractedRules.jointAngles.push(ruleData);
    });

    if (
      finalExtractedRules.relativeDistances.length === 0 &&
      finalExtractedRules.jointAngles.length === 0
    ) {
      console.warn("[FeatureExtractor] No valid rules could be generated.");
      return null;
    }

    return {
      rules: finalExtractedRules,
      focusPoints: Array.from(focusPointsForDisplay),
    };
  }

  #getFallbackFocusPoints(samples) {
    const numLandmarks =
      this.#gestureType === "hand"
        ? self.GestureUtils.HandLandmarks.PINKY_TIP + 1
        : self.GestureUtils.PoseLandmarks.RIGHT_FOOT_INDEX + 1;
    const landmarkVariations = Array(numLandmarks)
      .fill(0)
      .map(() => ({ x: [], y: [] }));

    samples.forEach((sample) => {
      for (let i = 0; i < numLandmarks; i++) {
        if (sample.landmarks[i]) {
          landmarkVariations[i].x.push(sample.landmarks[i].x);
          landmarkVariations[i].y.push(sample.landmarks[i].y);
        }
      }
    });

    const landmarkMovementScores = landmarkVariations.map((v, i) => {
      if (v.x.length < 2) return { index: i, score: 0 };
      const rangeX = Math.max(...v.x) - Math.min(...v.x);
      const rangeY = Math.max(...v.y) - Math.min(...v.y);
      return { index: i, score: rangeX + rangeY };
    });
    landmarkMovementScores.sort((a, b) => b.score - a.score);
    const numFocusPoints = this.#gestureType === "hand" ? 12 : 16;
    return new Set(
      landmarkMovementScores.slice(0, numFocusPoints).map((item) => item.index)
    );
  }

  generateJsFileContent(definition) {
    const { metadata, rules } = definition;
    const checkFn = metadata.type === "pose" ? "checkPose" : "checkGesture";
    
    const rulesJsonString = JSON.stringify(rules, null, 2);

    return `// Custom Gesture: ${metadata.name} (Type: ${metadata.type})
// Description: ${metadata.description}
// Generated by GestureVision Studio on ${new Date().toLocaleDateString()}
export const metadata = {
  "name": "${metadata.name}",
  "description": "${metadata.description}",
  "type": "${metadata.type}"
};

const MAX_ABSOLUTE_TOLERANCE_DIST = ${MAX_ABSOLUTE_TOLERANCE_DIST};
const MAX_ABSOLUTE_TOLERANCE_ANGLE = ${MAX_ABSOLUTE_TOLERANCE_ANGLE};
const baseRules = ${rulesJsonString};

function applyToleranceToRule(rule, isAngle, tolerance) {
    const { avg, min: minObserved, max: maxObserved } = rule;
    
    // The inherent variance of the recorded samples.
    const observedRange = maxObserved - minObserved;
    
    // The maximum possible extra tolerance we can add.
    const maxAddedTolerance = isAngle ? MAX_ABSOLUTE_TOLERANCE_ANGLE : MAX_ABSOLUTE_TOLERANCE_DIST;
    
    // Use an easing curve for smoother control.
    const easedTolerance = Math.pow(tolerance, 1.5);
    
    // The final range is the inherent variance PLUS an additional amount controlled by the slider.
    const finalRange = observedRange + (maxAddedTolerance * easedTolerance);
    const toleranceAmount = finalRange / 2;

    const center = (minObserved + maxObserved) / 2;
    const newMin = Math.max(0, center - toleranceAmount);
    const newMax = center + toleranceAmount;

    return { ...rule, min: newMin, max: newMax };
}

export function ${checkFn}(_landmarks, _worldLandmarks, tolerance = 0.0) {
  const finalRules = {
      ...baseRules,
      relativeDistances: baseRules.relativeDistances.map(r => applyToleranceToRule(r, false, tolerance)),
      jointAngles: baseRules.jointAngles.map(r => applyToleranceToRule(r, true, tolerance)),
  };
  return { rules: finalRules };
}`;
  }

  #getHandRuleGroups() {
    const HL = self.GestureUtils.HandLandmarks;
    return {
      relativeDistances: [
        [HL.THUMB_TIP, HL.INDEX_FINGER_TIP],
        [HL.THUMB_TIP, HL.MIDDLE_FINGER_TIP],
        [HL.INDEX_FINGER_TIP, HL.PINKY_TIP],
      ],
      jointAngles: [
        [HL.WRIST, HL.THUMB_CMC, HL.THUMB_MCP],
        [HL.THUMB_CMC, HL.THUMB_MCP, HL.THUMB_IP],
        [HL.THUMB_MCP, HL.THUMB_IP, HL.THUMB_TIP],
        [HL.WRIST, HL.INDEX_FINGER_MCP, HL.INDEX_FINGER_PIP],
        [HL.INDEX_FINGER_MCP, HL.INDEX_FINGER_PIP, HL.INDEX_FINGER_DIP],
      ],
    };
  }
  #getPoseRuleGroups() {
    const PL = self.GestureUtils.PoseLandmarks;
    return {
      relativeDistances: [
        [PL.LEFT_WRIST, PL.RIGHT_WRIST],
        [PL.LEFT_SHOULDER, PL.RIGHT_SHOULDER],
        [PL.LEFT_HIP, PL.RIGHT_HIP],
        [PL.NOSE, PL.LEFT_HIP],
        [PL.NOSE, PL.RIGHT_HIP],
      ],
      jointAngles: [
        [PL.LEFT_SHOULDER, PL.LEFT_ELBOW, PL.LEFT_WRIST],
        [PL.RIGHT_SHOULDER, PL.RIGHT_ELBOW, PL.RIGHT_WRIST],
        [PL.LEFT_ELBOW, PL.LEFT_SHOULDER, PL.LEFT_HIP],
        [PL.RIGHT_ELBOW, PL.RIGHT_SHOULDER, PL.RIGHT_HIP],
      ],
    };
  }
}