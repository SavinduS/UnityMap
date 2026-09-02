import { useState } from 'react';

/**
 * Custom hook for TTS and Speech API interactions.
 */
export const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = (text) => {
    setIsSpeaking(true);
    console.log(`[TTS Speaking]: ${text}`);
    // Future integration with Expo Speech API
    setTimeout(() => setIsSpeaking(false), 2000);
  };

  const stop = () => {
    setIsSpeaking(false);
  };

  return { speak, stop, isSpeaking };
};

export default useSpeech;
