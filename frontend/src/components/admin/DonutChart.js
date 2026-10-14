/**
 * DonutChart.js
 *
 * Dependency-free donut chart for the municipal admin dashboard.
 *
 * Deliberately pure React Native: react-native-svg is not a dependency of this
 * project, and adding it would require a native rebuild that the dev-client
 * workflow cannot always perform. Slices are drawn with clipped half-discs
 * rotated around the chart centre, which needs no extra modules and renders
 * identically on iOS, Android and web.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * A half-disc clipped to one side of the chart box.
 *
 * The outer wrapper is always a full `size` square so that `transform: rotate`
 * pivots on the chart centre rather than on the clipped rectangle's own centre —
 * that pivot is what makes the slices line up into a ring.
 */
const HalfDisc = ({ color, size, rotation, side }) => {
  const clipped = (
    <View
      style={[
        styles.clip,
        { width: size / 2, height: size, marginLeft: side === 'right' ? size / 2 : 0 },
      ]}
    >
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: side === 'right' ? -size / 2 : 0,
          top: 0,
        }}
      />
    </View>
  );

  return (
    <View
      pointerEvents="none"
      style={[styles.pivot, { width: size, height: size, transform: [{ rotate: `${rotation}deg` }] }]}
    >
      {clipped}
    </View>
  );
};

/**
 * @param {Array<{label:string, value:number, color:string}>} segments
 * @param {number} size      Outer diameter in px.
 * @param {number} thickness Ring thickness in px (0 renders a solid pie).
 * @param {string} centerValue  Big number in the hole.
 * @param {string} centerLabel  Caption under the number.
 */
export const DonutChart = ({
  segments = [],
  size = 168,
  thickness = 26,
  centerValue = null,
  centerLabel = '',
  emptyLabel = 'No data yet',
}) => {
  const normalized = useMemo(() => {
    const usable = segments.filter((s) => Number(s.value) > 0);
    const total = usable.reduce((sum, s) => sum + Number(s.value), 0);
    return { usable, total };
  }, [segments]);

  // Cumulative rotation offset. A slice wider than 180° needs two half-discs,
  // otherwise the remainder of it is clipped away and the ring shows a gap.
  const slices = useMemo(() => {
    if (!normalized.total) return [];
    const out = [];
    let cursor = 0;
    for (const seg of normalized.usable) {
      const sweep = (Number(seg.value) / normalized.total) * 360;
      out.push({
        key: `${seg.label}-${out.length}`,
        color: seg.color,
        percent: (Number(seg.value) / normalized.total) * 100,
        value: Number(seg.value),
        right: cursor,
        left: sweep > 180 ? cursor + 180 : null,
      });
      cursor += sweep;
    }
    return out;
  }, [normalized]);

  const holeSize = Math.max(0, size - thickness * 2);

  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.canvas, { width: size, height: size, borderRadius: size / 2 }]}>
        {slices.length === 0 ? (
          <View
            style={[
              styles.emptyRing,
              { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2 },
            ]}
          />
        ) : (
          slices.map((s) => (
            <React.Fragment key={s.key}>
              <HalfDisc color={s.color} size={size} rotation={s.right} side="right" />
              {s.left !== null && (
                <HalfDisc color={s.color} size={size} rotation={s.left} side="left" />
              )}
            </React.Fragment>
          ))
        )}
      </View>

      {thickness > 0 && slices.length > 0 && (
        <View
          pointerEvents="none"
          style={[
            styles.hole,
            {
              width: holeSize,
              height: holeSize,
              borderRadius: holeSize / 2,
              left: (size - holeSize) / 2,
              top: (size - holeSize) / 2,
            },
          ]}
        />
      )}

      <View pointerEvents="none" style={styles.centerOverlay}>
        {slices.length === 0 ? (
          <Text style={styles.emptyLabel}>{emptyLabel}</Text>
        ) : (
          <>
            <Text style={styles.centerValue} numberOfLines={1}>
              {centerValue}
            </Text>
            {!!centerLabel && (
              <Text style={styles.centerCaption} numberOfLines={2}>
                {centerLabel}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
};

/** Colour-blind-safe categorical ramp; indexed by slice order. */
export const DONUT_PALETTE = [
  '#0B3D2E',
  '#10B981',
  '#F59E0B',
  '#DC2626',
  '#3B82F6',
  '#8B5CF6',
  '#0EA5E9',
];

export default DonutChart;

const styles = StyleSheet.create({
  canvas: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  pivot: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clip: {
    overflow: 'hidden',
  },
  hole: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  emptyRing: {
    position: 'absolute',
    top: 4,
    left: 4,
    borderWidth: 10,
    borderColor: '#E2E8F0',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  centerValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0B3D2E',
    letterSpacing: -0.5,
  },
  centerCaption: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  emptyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
});