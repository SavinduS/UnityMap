const SpeechPrompt = require('../models/SpeechPrompt');
const HazardCue = require('../models/HazardCue');
const { interpolateTemplate } = require('../services/speechService');

/**
 * GET /api/speech/prompts?triggerType=&locale=&verbosity=&isActive=
 */
const getSpeechPrompts = async (req, res, next) => {
  try {
    const { triggerType, locale, verbosity, isActive } = req.query;
    const filter = {};
    if (triggerType) filter.triggerType = triggerType;
    if (locale) filter.locale = locale;
    if (verbosity) filter.verbosity = verbosity;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const prompts = await SpeechPrompt.find(filter).sort({ priority: 1, createdAt: -1 }).lean();
    res.json({ count: prompts.length, prompts });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/audio/cues?obstacleType=&severity=&locale=
 */
const getAudioCues = async (req, res, next) => {
  try {
    const { obstacleType, severity, isActive } = req.query;
    const filter = {};
    if (obstacleType) filter.obstacleType = obstacleType;
    if (severity) filter.severity = Number(severity);
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const cues = await HazardCue.find(filter).sort({ severity: -1 }).lean();
    res.json({ count: cues.length, cues });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/speech/preview  { promptCode|template, params:{distance,maneuver,landmark}, locale }
 */
const previewSpeech = async (req, res, next) => {
  try {
    const { promptCode, template, params, locale = 'en' } = req.body;

    let baseTemplate = template;
    if (promptCode) {
      const prompt = await SpeechPrompt.findOne({ promptCode, locale }).lean();
      if (!prompt) return res.status(404).json({ error: `Prompt ${promptCode} not found for locale ${locale}` });
      baseTemplate = prompt.template;
    }

    if (!baseTemplate) return res.status(400).json({ error: 'template or promptCode required' });

    const spokenText = interpolateTemplate(baseTemplate, params || {});
    res.json({ spokenText, locale, params: params || {} });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSpeechPrompts, getAudioCues, previewSpeech };
