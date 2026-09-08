import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useTheme } from '../../theme/ThemeContext';
import { getTextStyle, textProps } from '../../theme/typography';
import { useSpeech } from '../../hooks/useSpeech';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

/**
 * Voice Input & Summary Readout Screen (SPT-106 — Audio Page 2)
 * Overwritten in-place per SPT-106: animated mic, live transcript, spoken route summary controls, single-tap confirmation.
 */
export const VoiceNavigationScreen = ({
  initialTranscript = '',
  routeSummary: propRouteSummary = null,
  onConfirm,
  onCancel,
}) => {
  const { palette, borderWidth, isHighContrast, isReduceMotionEnabled } = useTheme();
  const { speak, stop: stopSpeak, isSpeaking } = useSpeech();
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    confidence,
    error,
    start,
    stop: stopListening,
  } = useSpeechRecognition();

  const [localTranscript, setLocalTranscript] = useState(initialTranscript);
  const [speechRate, setSpeechRate] = useState(1.0);

  // Prefer prop transcript if parent bridges from launcher, otherwise internal
  const displayTranscript = localTranscript || transcript;
  const displayInterim = interimTranscript;
  const effectiveRouteSummary = propRouteSummary || null;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  // Animated mic pulse when listening, disabled for reduceMotion
  useEffect(() => {
    if (isListening && !isReduceMotionEnabled) {
      const pulse = Animated.loop(
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.85,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
      opacityAnim.setValue(0.6);
    }
  }, [isListening, isReduceMotionEnabled, pulseAnim, opacityAnim]);

  // Sync external initialTranscript
  useEffect(() => {
    if (initialTranscript) setLocalTranscript(initialTranscript);
  }, [initialTranscript]);

  // Sync internal transcript to local
  useEffect(() => {
    if (transcript) setLocalTranscript(transcript);
  }, [transcript]);

  const handleMicPress = async () => {
    if (isListening) {
      try { await stopListening(); } catch (_) {}
      return;
    }
    try {
      await start('en');
    } catch (_) {}
  };

  const spokenSummaryText = effectiveRouteSummary
    ? effectiveRouteSummary.spokenSummary || effectiveRouteSummary.summary || JSON.stringify(effectiveRouteSummary)
    : `Route summary not yet available. Speak destination to generate summary.`;

  const distanceText = effectiveRouteSummary?.distanceText || effectiveRouteSummary?.distance || '--';
  const crossingsText = effectiveRouteSummary?.crossings ?? effectiveRouteSummary?.crossingsText ?? '--';
  const etaText = effectiveRouteSummary?.etaText || effectiveRouteSummary?.eta || '--';
  const hazardCount = effectiveRouteSummary?.hazardCount ?? '--';
  const destName = effectiveRouteSummary?.destName || effectiveRouteSummary?.landmark || 'Destination';

  const handlePlay = () => {
    const text = `Route to ${destName}: ${distanceText}, ${crossingsText} crossings, ${etaText}, ${hazardCount} hazards.`;
    speak(text, { rate: speechRate, pitch: 1.0 });
  };

  const handleStop = () => {
    try { stopSpeak(); } catch (_) {}
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.background }]} contentContainerStyle={styles.content}>
      {/* Landmark Header */}
      <View accessible accessibilityRole="header" accessibilityLabel="Voice input and summary readout" style={styles.landmarkHeader}>
        <Text {...textProps} style={[getTextStyle('xl', { isHighContrast }), { color: palette.textPrimary, textAlign: 'center' }]}>
          Voice Input & Summary
        </Text>
        <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: palette.textMuted, textAlign: 'center', marginTop: 4 }]}>
          Speak destination, review spoken summary, confirm with one tap
        </Text>
      </View>

      {/* Animated Mic Graphic */}
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={isListening ? 'Listening, tap to stop' : 'Tap to speak destination'}
        accessibilityHint="Single tap to start or stop listening"
        accessibilityState={{ busy: isListening }}
        onPress={handleMicPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [{ alignItems: 'center', justifyContent: 'center', marginVertical: 16, opacity: pressed ? 0.85 : 1 }]}
      >
        <Animated.View
          style={[
            styles.micPulse,
            {
              backgroundColor: isListening ? palette.primary : palette.surfaceAlt,
              borderColor: palette.cardBorder,
              borderWidth,
              transform: [{ scale: pulseAnim }],
              opacity: isReduceMotionEnabled ? 1 : opacityAnim,
            },
          ]}
        />
        <View style={[styles.micCore, { backgroundColor: isListening ? palette.primary : palette.surface, borderColor: palette.cardBorder, borderWidth }]}>
          <Feather name="mic" size={32} color={isListening ? palette.primaryText : palette.primary} />
          {isListening && <ActivityIndicator size="small" color={palette.primary} style={{ position: 'absolute', bottom: 6 }} />}
        </View>
        <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: palette.textMuted, marginTop: 8 }]}>
          {isListening ? 'Listening…' : isSupported ? 'Tap to speak' : 'Voice not supported'}
        </Text>
      </Pressable>

      {/* Live Transcript */}
      <Card style={[styles.card, { borderColor: palette.cardBorder, borderWidth, backgroundColor: palette.surface }]}>
        <Text {...textProps} style={[styles.cardTitle, getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>Live Transcript</Text>
        <View accessible accessibilityLiveRegion="polite" style={[styles.transcriptBox, { borderColor: palette.border, borderWidth, backgroundColor: palette.background, minHeight: 48 }]}>
          {isListening && interimTranscript ? (
            <Text {...textProps} style={[getTextStyle('base', { isHighContrast }), { color: palette.textPrimary, fontStyle: 'italic' }]}>
              {interimTranscript}
            </Text>
          ) : displayTranscript ? (
            <>
              <Text {...textProps} style={[getTextStyle('base', { isHighContrast }), { color: palette.textPrimary }]}>
                {displayTranscript}
              </Text>
              {confidence > 0 && (
                <View style={[styles.confBadge, { backgroundColor: confidence >= 0.6 ? '#ECFDF5' : '#FEF3C7', borderColor: palette.border }]}>
                  <Text style={[getTextStyle('xs', { isHighContrast }), { color: confidence >= 0.6 ? '#065F46' : '#92400E' }]}>
                    {Math.round(confidence * 100)}% confidence
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text {...textProps} style={[getTextStyle('sm', { isHighContrast }), { color: palette.textMuted }]}>
              {isListening ? 'Listening for destination…' : 'Tap mic and speak destination'}
            </Text>
          )}
        </View>
        {error && (
          <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: palette.error, marginTop: 8 }]}>
            Error: {error} — tap mic to retry
          </Text>
        )}
      </Card>

      {/* Route Summary */}
      <Card style={[styles.card, { borderColor: palette.cardBorder, borderWidth, backgroundColor: palette.surface }]}>
        <Text {...textProps} style={[styles.cardTitle, getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>Route Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryItem, { borderColor: palette.border, borderWidth: isHighContrast ? borderWidth : 0, backgroundColor: palette.background }]}>
            <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>Distance</Text>
            <Text {...textProps} style={[getTextStyle('base', { isHighContrast }), { color: palette.textPrimary, fontWeight: '700' }]}>{String(distanceText)}</Text>
          </View>
          <View style={[styles.summaryItem, { borderColor: palette.border, borderWidth: isHighContrast ? borderWidth : 0, backgroundColor: palette.background }]}>
            <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>Crossings</Text>
            <Text {...textProps} style={[getTextStyle('base', { isHighContrast }), { color: palette.textPrimary, fontWeight: '700' }]}>{String(crossingsText)}</Text>
          </View>
          <View style={[styles.summaryItem, { borderColor: palette.border, borderWidth: isHighContrast ? borderWidth : 0, backgroundColor: palette.background }]}>
            <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>ETA</Text>
            <Text {...textProps} style={[getTextStyle('base', { isHighContrast }), { color: palette.textPrimary, fontWeight: '700' }]}>{String(etaText)}</Text>
          </View>
          <View style={[styles.summaryItem, { borderColor: palette.border, borderWidth: isHighContrast ? borderWidth : 0, backgroundColor: palette.background }]}>
            <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>Hazards</Text>
            <Text {...textProps} style={[getTextStyle('base', { isHighContrast }), { color: palette.textPrimary, fontWeight: '700' }]}>{String(hazardCount)}</Text>
          </View>
        </View>
        <View style={[styles.spokenBox, { borderColor: palette.border, borderWidth, backgroundColor: palette.background, minHeight: 48 }]}>
          <Text {...textProps} style={[getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>
            {spokenSummaryText}
          </Text>
        </View>
      </Card>

      {/* Spoken Route Summary Controls */}
      <Card style={[styles.card, { borderColor: palette.cardBorder, borderWidth, backgroundColor: palette.surface }]}>
        <Text {...textProps} style={[styles.cardTitle, getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>Spoken Summary Controls</Text>
        <View style={styles.controlsRow}>
          <Pressable
            onPress={handlePlay}
            accessibilityRole="button"
            accessibilityLabel="Play spoken summary"
            style={[styles.controlBtn, { backgroundColor: palette.primary, minHeight: 44, minWidth: 44 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name={isSpeaking ? 'volume-2' : 'play'} size={18} color={palette.primaryText} />
            <Text style={[getTextStyle('xs', { isHighContrast }), { color: palette.primaryText, marginLeft: 6, fontWeight: '700' }]}>{isSpeaking ? 'Playing' : 'Play'}</Text>
          </Pressable>
          <Pressable
            onPress={handleStop}
            accessibilityRole="button"
            accessibilityLabel="Stop spoken summary"
            style={[styles.controlBtn, { backgroundColor: palette.surfaceAlt, borderColor: palette.border, borderWidth, minHeight: 44 }]}
          >
            <Feather name="square" size={14} color={palette.textPrimary} />
            <Text style={[getTextStyle('xs', { isHighContrast }), { color: palette.textPrimary, marginLeft: 6 }]}>Stop</Text>
          </Pressable>
          <Pressable
            onPress={handlePlay}
            accessibilityRole="button"
            accessibilityLabel="Replay spoken summary"
            style={[styles.controlBtn, { backgroundColor: palette.surfaceAlt, borderColor: palette.border, borderWidth, minHeight: 44 }]}
          >
            <Feather name="repeat" size={14} color={palette.textPrimary} />
            <Text style={[getTextStyle('xs', { isHighContrast }), { color: palette.textPrimary, marginLeft: 6 }]}>Replay</Text>
          </Pressable>
        </View>
        <View style={styles.rateRow}>
          <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>Rate</Text>
          {[0.8, 1.0, 1.2].map((r) => (
            <Pressable
              key={r}
              onPress={() => setSpeechRate(r)}
              accessibilityRole="button"
              accessibilityState={{ selected: speechRate === r }}
              style={[
                styles.rateChip,
                {
                  backgroundColor: speechRate === r ? palette.primary : palette.surfaceAlt,
                  borderColor: palette.border,
                  borderWidth: speechRate === r ? 0 : 1,
                  minHeight: 36,
                  minWidth: 48,
                },
              ]}
            >
              <Text style={[getTextStyle('xs', { isHighContrast }), { color: speechRate === r ? palette.primaryText : palette.textPrimary, fontWeight: '700' }]}>
                {r}x
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Single-tap Confirmation */}
      <Button
        title="Confirm & Navigate"
        onPress={() => {
          if (onConfirm) {
            onConfirm({ transcript: displayTranscript, confidence, routeSummary: effectiveRouteSummary });
          }
        }}
        accessibilityLabel="Confirm route and start navigation"
        accessibilityHint="Single tap to confirm and start navigation"
        style={{ minHeight: 48 }}
      />
      {onCancel && (
        <Button title="Cancel / Edit" variant="secondary" onPress={onCancel} style={{ minHeight: 48, marginTop: 8 }} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  landmarkHeader: { alignItems: 'center', marginBottom: 8 },
  micPulse: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  micCore: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: { marginBottom: 8, fontWeight: '700' },
  card: { marginBottom: 12 },
  transcriptBox: {
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
  },
  confBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  summaryItem: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  spokenBox: {
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    flex: 1,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rateChip: {
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default VoiceNavigationScreen;
