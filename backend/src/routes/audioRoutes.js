const express = require('express');
const router = express.Router();
const { getAudioCues } = require('../controllers/speechController');

router.get('/cues', getAudioCues);

module.exports = router;
