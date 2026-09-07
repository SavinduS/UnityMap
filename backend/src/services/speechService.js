const SpeechPrompt = require('../models/SpeechPrompt');
const HazardCue = require('../models/HazardCue');

/**
 * Interpolate template placeholders like {{distance}} {{maneuver}} {{landmark}}
 */
const interpolateTemplate = (template, params = {}) => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{{${key}}}`;
  });
};

/**
 * Generate turn-by-turn speech snippets for a computed route.
 * Ephemeral — caller may persist as RouteSpeechSnippet if needed.
 * @param {Array} pathNodes - ordered Node docs
 * @param {Array} pathways - ordered Pathway docs
 * @param {Object} options - { locale, verbosity }
 */
const generateTurnSnippets = async (pathNodes = [], pathways = [], options = {}) => {
  const { locale = 'en', verbosity = 'standard' } = options;
  const snippets = [];

  for (let i = 0; i < pathways.length; i++) {
    const pathway = pathways[i];
    const node = pathNodes[i + 1];
    let prompt = null;

    // Select prompt by triggerType and locale
    try {
      const query = { triggerType: 'approaching_turn', locale, verbosity, isActive: true };
      prompt = await SpeechPrompt.findOne(query).lean();
      if (!prompt) {
        prompt = await SpeechPrompt.findOne({ triggerType: 'approaching_turn', locale: 'en', isActive: true }).lean();
      }
    } catch (_) {}

    const maneuver = pathway.pathType === 'ramp' ? 'ramp' : pathway.pathType === 'elevator' ? 'elevator' : 'straight';
    const landmark = node?.name || `Node ${i + 1}`;
    const distance = Math.round(pathway.distanceMeters || 0);

    let spokenText = `In ${distance} meters continue ${maneuver}`;
    if (prompt?.template) {
      spokenText = interpolateTemplate(prompt.template, { distance, maneuver, landmark });
    } else if (maneuver === 'ramp') {
      spokenText = `In ${distance} meters take ramp toward ${landmark}`;
    } else if (maneuver === 'elevator') {
      spokenText = `In ${distance} meters take elevator at ${landmark}`;
    }

    // Attach hazard cue if pathway has incline warning
    let hazardCueId = null;
    if (Math.abs(pathway.inclineDegrees) > 5) {
      try {
        const cue = await HazardCue.findOne({ obstacleType: 'construction', isActive: true }).lean();
        if (cue) hazardCueId = cue._id;
      } catch (_) {}
    }

    snippets.push({
      stepIndex: i,
      nodeId: node?._id || null,
      pathwayId: pathway._id,
      maneuver,
      spokenText,
      distanceToNextMeters: distance,
      inclineDegrees: pathway.inclineDegrees,
      hazardCueId,
      speechPromptId: prompt?._id || null,
      locale,
    });
  }

  // Destination arrived snippet
  try {
    const destPrompt = await SpeechPrompt.findOne({ triggerType: 'destination_arrived', locale, isActive: true }).lean();
    if (destPrompt) {
      snippets.push({
        stepIndex: pathways.length,
        maneuver: 'straight',
        spokenText: destPrompt.template || 'You have arrived at your destination',
        distanceToNextMeters: 0,
        speechPromptId: destPrompt._id,
        locale,
      });
    }
  } catch (_) {}

  return snippets;
};

/**
 * Get launcher prompt for given locale with fallback to en
 */
const getLauncherPrompt = async (locale = 'en') => {
  try {
    let prompt = await SpeechPrompt.findOne({ triggerType: 'launcher_prompt', locale, isActive: true }).lean();
    if (!prompt) {
      prompt = await SpeechPrompt.findOne({ triggerType: 'launcher_prompt', locale: 'en', isActive: true }).lean();
    }
    return prompt;
  } catch (_) {
    return null;
  }
};

module.exports = {
  interpolateTemplate,
  generateTurnSnippets,
  getLauncherPrompt,
};
