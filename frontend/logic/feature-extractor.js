/* FILE: extensions/plugins/gesture-studio/frontend/logic/feature-extractor.js */
const MIN_SAMPLES_FOR_STATISTICAL_RELEVANCE = 3;
const RULE_PRUNING_FACTOR = 0.75;

export class FeatureExtractor {
  #gestureType;
  constructor(gestureType) {
    if (gestureType !== "hand" && gestureType !== "pose")
      throw new Error("Invalid gesture type.");
    this.#gestureType = gestureType;
  }

  #calculateStats(values, metricType) {
    const RELATIVE_TOLERANCE_FACTOR = 0.25;
    const MIN_ABSOLUTE_TOLERANCE_DIST = 0.02;
    const MIN_ABSOLUTE_TOLERANCE_ANGLE = 5.0;

    const minObserved = Math.min(...values);
    const maxObserved = Math.max(...values);
    const range = maxObserved - minObserved;
    const avg = (minObserved + maxObserved) / 2;

    const relativeTolerance = range * RELATIVE_TOLERANCE_FACTOR;
    const absoluteMinTolerance =
      metricType === "angle"
        ? MIN_ABSOLUTE_TOLERANCE_ANGLE
        : MIN_ABSOLUTE_TOLERANCE_DIST;
    const finalTolerance = Math.max(relativeTolerance, absoluteMinTolerance);

    const finalMin = Math.max(0, minObserved - finalTolerance);
    const finalMax = maxObserved + finalTolerance;

    const variation = avg > 1e-6 ? range / avg : range > 1e-6 ? 1e6 : 0;
    return { avg, min: finalMin, max: finalMax, variation };
  }

  extract(samples, selectedLandmarkIndices = null) {
    if (!samples || samples.length < MIN_SAMPLES_FOR_STATISTICAL_RELEVANCE) {
      console.warn(
        `[FeatureExtractor] Need ${
          MIN_SAMPLES_FOR_STATISTICAL_RELEVANCE
        } samples, got ${samples?.length || 0}.`
      );
      return null;
    }

    // The user's selection is now primarily for visualization. We'll use a fallback
    // of all possible points for rule generation to ensure robustness.
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
          stats: this.#calculateStats(values, type),
        });
      }
    };

    // MODIFICATION: Generate rules from ALL possible landmark combinations,
    // ignoring the user's manual selection for the algorithm.
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
      focusPoints: Array.from(focusPointsForDisplay), // Return this for visualization
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
    const { metadata, rules, tolerance } = definition;
    const landmarkMap =
      this.#gestureType === "hand"
        ? self.GestureUtils.HandLandmarks
        : self.GestureUtils.PoseLandmarks;
    const getName = (idx) => {
      for (const [name, index] of Object.entries(landmarkMap))
        if (index === idx) return `Landmarks.${name}`;
      return idx;
    };

    const applyToleranceToRule = (rule) => {
      const { min, max } = rule;
      const originalRange = max - min;
      const toleranceAmount = (originalRange / 2) * tolerance;
      return {
        ...rule,
        min: Math.max(0, min - toleranceAmount),
        max: max + toleranceAmount,
      };
    };

    const formatRule = (ruleWithTolerance) => {
      const pointKeys = Object.keys(ruleWithTolerance).filter((k) =>
        k.startsWith("p")
      );
      const statKeys = Object.keys(ruleWithTolerance).filter(
        (k) => !k.startsWith("p")
      );
      const points = pointKeys
        .map((k) => `${k}: ${getName(ruleWithTolerance[k])}`)
        .join(", ");
      const stats = statKeys
        .map((k) => `${k}: ${ruleWithTolerance[k].toFixed(4)}`)
        .join(", ");
      return `{ ${points}, ${stats} }`;
    };

    const distRules = rules.relativeDistances
      .map((rule) => formatRule(applyToleranceToRule(rule)))
      .join(",\n      ");
    const angleRules = rules.jointAngles
      .map((rule) => formatRule(applyToleranceToRule(rule)))
      .join(",\n      ");

    const checkFn = metadata.type === "pose" ? "checkPose" : "checkGesture";
    return `// Custom Gesture: ${metadata.name} (Type: ${metadata.type})
// Description: ${metadata.description}
// Generated by GestureVision Studio on ${new Date().toLocaleDateString()}
export const metadata = {
  "name": "${metadata.name}",
  "description": "${metadata.description}",
  "type": "${metadata.type}"
};
export function ${checkFn}(_landmarks, _worldLandmarks) {
  // This function is executed by the worker to get the gesture definition.
  // It must return an object with a 'rules' key.
  const Landmarks = self.${
    metadata.type === "hand" ? "HandLandmarks" : "PoseLandmarks"
  };
  const rules = {
    type: "${metadata.type}",
    relativeDistances: [
      ${distRules}
    ],
    jointAngles: [
      ${angleRules}
    ]
  };
  return { rules };
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