const express = require('express');
const router = express.Router();
const { getSpeechPrompts, previewSpeech } = require('../controllers/speechController');

router.get('/prompts', getSpeechPrompts);
router.post('/preview', previewSpeech);

module.exports = router;
