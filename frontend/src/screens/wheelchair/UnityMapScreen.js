import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import tw from 'twrnc';
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import BaseMap from '../../components/BaseMap';
import SettingsScreen from '../settings/SettingsScreen';
import { useTheme } from '../../theme/ThemeContext';
import { getTextStyle, textProps } from '../../theme/typography';

/**
 * UnityMapScreen.js
 * Built 100% with pure Tailwind CSS classes (via twrnc).
 * Zero traditional CSS / StyleSheet objects.
 */
const UnityMapScreen = () => {
  const [activeTab, setActiveTab] = useState('Map');
  const { palette, borderWidth, isHighContrast } = useTheme();

  return (
    <View style={[tw`flex-1`, { backgroundColor: palette.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={palette.primary} />

      {/* ── Top Curved Green Header (Pure Tailwind) ── Global High-Contrast ── */}
      <SafeAreaView
        style={[
          tw`rounded-b-[28px] ${Platform.OS === 'android' ? 'pt-8' : ''} shadow-lg z-10`,
          { backgroundColor: palette.primary, borderBottomWidth: isHighContrast ? borderWidth : 0, borderBottomColor: palette.border },
          isHighContrast && { shadowOpacity: 0, elevation: 0 },
        ]}
      >
        <View style={tw`flex-row items-center justify-between px-5 py-3.5`}>
          {/* Logo & Brand Name */}
          <View style={tw`flex-row items-center`}>
            <View style={tw`w-9 h-9 rounded-xl bg-white/20 items-center justify-center mr-2.5`}>
              <Feather name="map" size={18} color="#FFFFFF" />
            </View>
            <Text style={tw`text-white text-2xl font-extrabold tracking-wide`}>
              UnityMap
            </Text>
          </View>

          {/* Action Buttons: Search & Notification — 48dp + High-Contrast */}
          <View style={tw`flex-row items-center gap-2.5`}>
            <TouchableOpacity
              style={[
                tw`w-12 h-12 rounded-full items-center justify-center`,
                { backgroundColor: isHighContrast ? palette.surface : 'rgba(255,255,255,0.2)', borderWidth: isHighContrast ? borderWidth : 0, borderColor: palette.cardBorder },
              ]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Search"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="search" size={19} color={isHighContrast ? palette.textPrimary : '#FFFFFF'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                tw`w-12 h-12 rounded-full items-center justify-center relative`,
                { backgroundColor: isHighContrast ? palette.surface : 'rgba(255,255,255,0.2)', borderWidth: isHighContrast ? borderWidth : 0, borderColor: palette.cardBorder },
              ]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="bell" size={19} color={isHighContrast ? palette.textPrimary : '#FFFFFF'} />
              {/* Notification Red Dot */}
              <View
                style={[
                  tw`absolute top-2 right-2.5 w-2 h-2 rounded-full border`,
                  { backgroundColor: palette.error, borderColor: palette.primary },
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      {activeTab === 'Settings' ? (
        <View style={tw`flex-1`}>
          <SettingsScreen />
        </View>
      ) : (
        <>
          <View style={tw`flex-1 relative`}>
            <BaseMap isHighContrast={isHighContrast} palette={palette} />

            {/* Floating Navigation FAB — 52dp, High-Contrast border */}
            <TouchableOpacity
              style={[
                tw`absolute right-5 bottom-5 w-13 h-13 rounded-full items-center justify-center shadow-lg z-20`,
                { backgroundColor: palette.surface, borderWidth: isHighContrast ? borderWidth : 0, borderColor: palette.cardBorder },
                isHighContrast && { shadowOpacity: 0, elevation: 0 },
              ]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Navigate to map center"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="navigation" size={22} color={palette.primary} />
            </TouchableOpacity>
          </View>

          {/* ── Bottom Sheet / Nearby Issues — Global High-Contrast ── */}
          <View
            style={[
              tw`rounded-t-[28px] px-5 pt-3 pb-2 shadow-2xl`,
              { backgroundColor: palette.surface, borderTopWidth: borderWidth, borderColor: palette.cardBorder },
              isHighContrast && { shadowOpacity: 0, elevation: 0 },
            ]}
          >
            {/* Top Handle Drag Pill */}
            <View style={[tw`w-10 h-1 rounded-full self-center mb-3.5`, { backgroundColor: palette.borderStrong }]} />

            {/* Sheet Title Row */}
            <View style={tw`flex-row items-center justify-between mb-3.5`}>
              <Text {...textProps} style={[tw``, getTextStyle('lg', { isHighContrast }), { color: palette.textPrimary }]}>
                Nearby Issues
              </Text>
              <View style={[tw`px-3 py-1 rounded-full`, { backgroundColor: isHighContrast ? palette.surfaceAlt : '#EBF7F0', borderWidth: isHighContrast ? borderWidth : 0, borderColor: palette.cardBorder }]}>
                <Text {...textProps} style={[tw`text-xs font-bold`, getTextStyle('xs', { isHighContrast }), { color: palette.primary }]}>
                  7 reports
                </Text>
              </View>
            </View>

            {/* Issue Cards */}
            <ScrollView style={tw`max-h-45`} showsVerticalScrollIndicator={false}>
            {/* Card 1: Broken Pavement — High-Contrast */}
            <TouchableOpacity
              style={[
                tw`flex-row items-center rounded-2xl p-3 mb-2.5 shadow-sm`,
                { backgroundColor: palette.surface, borderColor: palette.cardBorder, borderWidth, minHeight: 48 },
                isHighContrast && { shadowOpacity: 0, elevation: 0 },
              ]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Broken Pavement, 120 meters away, Medium priority"
            >
              <View style={[tw`w-11 h-11 rounded-xl items-center justify-center mr-3.5`, { backgroundColor: isHighContrast ? palette.surfaceAlt : '#EBF7F0', borderWidth: isHighContrast ? borderWidth : 0, borderColor: palette.cardBorder }]}>
                <MaterialCommunityIcons name="wall" size={20} color={palette.primary} />
              </View>
              <View style={tw`flex-1`}>
                <Text {...textProps} style={[getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>Broken Pavement</Text>
                <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>120m away</Text>
              </View>
              <View style={[tw`px-3 py-1 rounded-xl`, { backgroundColor: isHighContrast ? palette.surface : '#FEF3C7', borderWidth: isHighContrast ? borderWidth : 0, borderColor: palette.border }]}>
                <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: isHighContrast ? palette.textPrimary : '#92400E' }]}>Medium</Text>
              </View>
            </TouchableOpacity>

            {/* Card 2: Blocked Ramp — High-Contrast */}
            <TouchableOpacity
              style={[
                tw`flex-row items-center rounded-2xl p-3 mb-2.5 shadow-sm`,
                { backgroundColor: palette.surface, borderColor: palette.cardBorder, borderWidth, minHeight: 48 },
                isHighContrast && { shadowOpacity: 0, elevation: 0 },
              ]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Blocked Ramp, 350 meters away, High priority"
            >
              <View style={[tw`w-11 h-11 rounded-xl items-center justify-center mr-3.5`, { backgroundColor: isHighContrast ? palette.surfaceAlt : '#EBF7F0', borderWidth: isHighContrast ? borderWidth : 0, borderColor: palette.cardBorder }]}>
                <FontAwesome5 name="wheelchair" size={18} color={palette.primary} />
              </View>
              <View style={tw`flex-1`}>
                <Text {...textProps} style={[getTextStyle('sm', { isHighContrast }), { color: palette.textPrimary }]}>Blocked Ramp</Text>
                <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: palette.textMuted }]}>350m away</Text>
              </View>
              <View style={[tw`px-3 py-1 rounded-xl`, { backgroundColor: isHighContrast ? palette.surface : '#FEE2E2', borderWidth: isHighContrast ? borderWidth : 0, borderColor: palette.border }]}>
                <Text {...textProps} style={[getTextStyle('xs', { isHighContrast }), { color: isHighContrast ? palette.textPrimary : '#DC2626' }]}>High</Text>
              </View>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </>
      )}

      {/* ── Bottom Navigation Bar — Global High-Contrast, 48dp ── */}
      <View
        style={[
          tw`flex-row items-center justify-around py-2.5 ${Platform.OS === 'ios' ? 'pb-6' : 'pb-2.5'}`,
          { backgroundColor: palette.surface, borderTopWidth: borderWidth, borderTopColor: palette.cardBorder },
          isHighContrast && { shadowOpacity: 0, elevation: 0 },
        ]}
      >
        <TouchableOpacity
          style={[tw`items-center justify-center px-3 py-1`, { minHeight: 48, minWidth: 64 }]}
          onPress={() => setActiveTab('Map')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'Map' }}
          accessibilityLabel="Map tab"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="map" size={22} color={activeTab === 'Map' ? palette.primary : palette.textMuted} />
          <Text {...textProps} style={[tw`mt-1`, getTextStyle('xs', { isHighContrast }), { color: activeTab === 'Map' ? palette.primary : palette.textMuted }]}>
            Map
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[tw`items-center justify-center px-3 py-1`, { minHeight: 48, minWidth: 64 }]}
          onPress={() => setActiveTab('Report')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'Report' }}
          accessibilityLabel="Report tab"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="alert-triangle" size={22} color={activeTab === 'Report' ? palette.primary : palette.textMuted} />
          <Text {...textProps} style={[tw`mt-1`, getTextStyle('xs', { isHighContrast }), { color: activeTab === 'Report' ? palette.primary : palette.textMuted }]}>
            Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[tw`items-center justify-center px-3 py-1`, { minHeight: 48, minWidth: 64 }]}
          onPress={() => setActiveTab('Profile')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'Profile' }}
          accessibilityLabel="Profile tab"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="user" size={22} color={activeTab === 'Profile' ? palette.primary : palette.textMuted} />
          <Text {...textProps} style={[tw`mt-1`, getTextStyle('xs', { isHighContrast }), { color: activeTab === 'Profile' ? palette.primary : palette.textMuted }]}>
            Profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[tw`items-center justify-center px-3 py-1`, { minHeight: 48, minWidth: 64 }]}
          onPress={() => setActiveTab('Settings')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'Settings' }}
          accessibilityLabel="Settings tab"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="settings" size={22} color={activeTab === 'Settings' ? palette.primary : palette.textMuted} />
          <Text {...textProps} style={[tw`mt-1`, getTextStyle('xs', { isHighContrast }), { color: activeTab === 'Settings' ? palette.primary : palette.textMuted }]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default UnityMapScreen;
