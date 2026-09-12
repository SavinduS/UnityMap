/**
 * oauth.js
 * Centralized Google OAuth Configuration for UnityMap
 * 
 * Instructions:
 * 1. Create a project at https://console.cloud.google.com/
 * 2. Configure OAuth Consent Screen
 * 3. Create Credentials:
 *    - Web Client ID (for Expo Web / Browser):
 *      Authorized JavaScript origins: http://localhost:8081, https://auth.expo.io
 *      Authorized redirect URIs: http://localhost:8081
 *    - Android Client ID (Package: com.anonymous.frontend)
 *    - iOS Client ID (Bundle: com.anonymous.frontend)
 * 4. Paste your Client IDs below or set EXPO_PUBLIC_GOOGLE_* environment variables.
 */

export const GOOGLE_CONFIG = {
  webClientId:
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  // Scopes requested from Google
  scopes: ['profile', 'email', 'openid'],
};

export const isGoogleConfigured = () => {
  return !!(GOOGLE_CONFIG.webClientId || GOOGLE_CONFIG.androidClientId || GOOGLE_CONFIG.iosClientId);
};

export default GOOGLE_CONFIG;
