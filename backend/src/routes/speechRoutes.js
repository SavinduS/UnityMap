const express = require('express');
const router = express.Router();
const { getSpeechPrompts, previewSpeech } = require('../controllers/speechController');
const SpeechPrompt = require('../models/SpeechPrompt');
const HazardCue = require('../models/HazardCue');

router.get('/prompts', getSpeechPrompts);
router.post('/preview', previewSpeech);

// Key subset offline bundle — English-only
router.get('/offline-bundle', async (req, res, next) => {
  try {
    const locale = 'en';
    const prompts = await SpeechPrompt.find({ locale, isActive: true, triggerType: { $in: ['launcher_prompt', 'route_summary', 'barrier_ahead'] } })
      .sort({ priority: 1 })
      .lean();
    const hazardCues = await HazardCue.find({ isActive: true }).limit(3).lean();
    res.json({
      prompts,
      hazardCues,
      version: 1,
      timestamp: new Date().toISOString(),
      locale,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
