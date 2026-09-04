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

/**
 * UnityMapScreen.js
 * Built 100% with pure Tailwind CSS classes (via twrnc).
 * Zero traditional CSS / StyleSheet objects.
 */
const UnityMapScreen = () => {
  const [activeTab, setActiveTab] = useState('Map');

  return (
    <View style={tw`flex-1 bg-slate-50`}>
      <StatusBar barStyle="light-content" backgroundColor="#1B6A4E" />

      {/* ── Top Curved Green Header (Pure Tailwind) ────────────────────────── */}
      <SafeAreaView
        style={tw`bg-[#1B6A4E] rounded-b-[28px] ${
          Platform.OS === 'android' ? 'pt-8' : ''
        } shadow-lg z-10`}
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

          {/* Action Buttons: Search & Notification */}
          <View style={tw`flex-row items-center gap-2.5`}>
            <TouchableOpacity
              style={tw`w-10 h-10 rounded-full bg-white/20 items-center justify-center`}
              activeOpacity={0.8}
            >
              <Feather name="search" size={19} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`w-10 h-10 rounded-full bg-white/20 items-center justify-center relative`}
              activeOpacity={0.8}
            >
              <Feather name="bell" size={19} color="#FFFFFF" />
              {/* Notification Red Dot */}
              <View
                style={tw`absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500 border border-[#1B6A4E]`}
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
            <BaseMap />

            {/* Floating Navigation FAB */}
            <TouchableOpacity
              style={tw`absolute right-5 bottom-5 w-13 h-13 rounded-full bg-white items-center justify-center shadow-lg z-20`}
              activeOpacity={0.85}
            >
              <Feather name="navigation" size={22} color="#1B6A4E" />
            </TouchableOpacity>
          </View>

          {/* ── Bottom Sheet / Nearby Issues (Pure Tailwind) ───────────────────── */}
          <View style={tw`bg-white rounded-t-[28px] px-5 pt-3 pb-2 shadow-2xl`}>
            {/* Top Handle Drag Pill */}
            <View style={tw`w-10 h-1 rounded-full bg-slate-300 self-center mb-3.5`} />

            {/* Sheet Title Row */}
            <View style={tw`flex-row items-center justify-between mb-3.5`}>
              <Text style={tw`text-slate-900 text-lg font-extrabold`}>Nearby Issues</Text>
              <View style={tw`bg-[#EBF7F0] px-3 py-1 rounded-full`}>
                <Text style={tw`text-[#1B6A4E] text-xs font-bold`}>7 reports</Text>
              </View>
            </View>

            {/* Issue Cards */}
            <ScrollView style={tw`max-h-45`} showsVerticalScrollIndicator={false}>
              {/* Card 1: Broken Pavement */}
              <TouchableOpacity
                style={tw`flex-row items-center bg-white rounded-2xl border border-slate-100 p-3 mb-2.5 shadow-sm`}
                activeOpacity={0.7}
              >
                <View style={tw`w-11 h-11 rounded-xl bg-[#EBF7F0] items-center justify-center mr-3.5`}>
                  <MaterialCommunityIcons name="wall" size={20} color="#1B6A4E" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-slate-900 text-sm font-bold mb-0.5`}>Broken Pavement</Text>
                  <Text style={tw`text-slate-400 text-xs font-medium`}>120m away</Text>
                </View>
                <View style={tw`bg-amber-100 px-3 py-1 rounded-xl`}>
                  <Text style={tw`text-amber-700 text-xs font-bold`}>Medium</Text>
                </View>
              </TouchableOpacity>

              {/* Card 2: Blocked Ramp */}
              <TouchableOpacity
                style={tw`flex-row items-center bg-white rounded-2xl border border-slate-100 p-3 mb-2.5 shadow-sm`}
                activeOpacity={0.7}
              >
                <View style={tw`w-11 h-11 rounded-xl bg-[#EBF7F0] items-center justify-center mr-3.5`}>
                  <FontAwesome5 name="wheelchair" size={18} color="#1B6A4E" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-slate-900 text-sm font-bold mb-0.5`}>Blocked Ramp</Text>
                  <Text style={tw`text-slate-400 text-xs font-medium`}>350m away</Text>
                </View>
                <View style={tw`bg-red-100 px-3 py-1 rounded-xl`}>
                  <Text style={tw`text-red-500 text-xs font-bold`}>High</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </>
      )}

      {/* ── Bottom Navigation Bar (Pure Tailwind) ──────────────────────────── */}
      <View
        style={tw`flex-row items-center justify-around bg-white border-t border-slate-100 py-2.5 ${
          Platform.OS === 'ios' ? 'pb-6' : 'pb-2.5'
        }`}
      >
        <TouchableOpacity
          style={tw`items-center justify-center px-3 py-1`}
          onPress={() => setActiveTab('Map')}
          activeOpacity={0.7}
        >
          <Feather
            name="map"
            size={22}
            color={activeTab === 'Map' ? '#1B6A4E' : '#94A3B8'}
          />
          <Text
            style={tw`text-[11px] mt-1 ${
              activeTab === 'Map' ? 'text-[#1B6A4E] font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            Map
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`items-center justify-center px-3 py-1`}
          onPress={() => setActiveTab('Report')}
          activeOpacity={0.7}
        >
          <Feather
            name="alert-triangle"
            size={22}
            color={activeTab === 'Report' ? '#1B6A4E' : '#94A3B8'}
          />
          <Text
            style={tw`text-[11px] mt-1 ${
              activeTab === 'Report' ? 'text-[#1B6A4E] font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`items-center justify-center px-3 py-1`}
          onPress={() => setActiveTab('Profile')}
          activeOpacity={0.7}
        >
          <Feather
            name="user"
            size={22}
            color={activeTab === 'Profile' ? '#1B6A4E' : '#94A3B8'}
          />
          <Text
            style={tw`text-[11px] mt-1 ${
              activeTab === 'Profile' ? 'text-[#1B6A4E] font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            Profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`items-center justify-center px-3 py-1`}
          onPress={() => setActiveTab('Settings')}
          activeOpacity={0.7}
        >
          <Feather
            name="settings"
            size={22}
            color={activeTab === 'Settings' ? '#1B6A4E' : '#94A3B8'}
          />
          <Text
            style={tw`text-[11px] mt-1 ${
              activeTab === 'Settings' ? 'text-[#1B6A4E] font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default UnityMapScreen;
