import React, { useRef, useCallback, useMemo } from 'react';
import { View, Platform } from 'react-native';
import tw from 'twrnc';

let WebView = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {}
}

/**
 * BaseMap.js - Free Styled OpenStreetMap Component
 * Powered by pure Tailwind CSS styling. Supports Web & Native platforms.
 */
const BaseMap = ({
  center = [6.9271, 79.8612],
  zoom = 14,
  markers = [],
  onMapClick,
  onReady,
  style,
  isHighContrast = false,
  palette = null,
}) => {
  const webViewRef = useRef(null);

  // Normalize center: [lat, lng] or { latitude, longitude }
  const normalizedCenter = useMemo(() => {
    if (Array.isArray(center)) return center;
    if (center && typeof center.latitude === 'number') {
      return [center.latitude, center.longitude];
    }
    return [6.9271, 79.8612];
  }, [center]);

  const themeBg = palette?.background || (isHighContrast ? '#FFFFFF' : '#E9F1EE');
  const surface = palette?.surface || '#FFFFFF';
  const primary = palette?.primary || (isHighContrast ? '#000000' : '#1E6F50');
  const cardBorder = palette?.cardBorder || (isHighContrast ? '#000000' : '#F1F5F9');
  const textPrimary = palette?.textPrimary || (isHighContrast ? '#000000' : '#1E293B');

  const mapHtml = useMemo(() => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>UnityMap OSM</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { height: 100%; width: 100%; background: ${themeBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; ${isHighContrast ? 'filter: contrast(1.25);' : ''} }
    
    .leaflet-control-attribution { font-size: 8px; opacity: 0.5; }
    .leaflet-bar { border: ${isHighContrast ? '2px solid #000000' : 'none'} !important; box-shadow: ${isHighContrast ? 'none' : '0 4px 12px rgba(0,0,0,0.1)'} !important; }
    .leaflet-bar a { background: ${surface} !important; color: ${primary} !important; border-bottom: 1px solid ${cardBorder} !important; }

    /* Custom Pin Marker Wrapper */
    .custom-pin {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .custom-pin:active { transform: scale(1.15); }

    /* Pin bubble */
    .pin-bubble {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(0,0,0,0.22);
      position: relative;
    }
    
    /* Pin pointer arrow */
    .pin-bubble::after {
      content: '';
      position: absolute;
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid currentColor;
    }

    .pin-bubble.orange { background: ${isHighContrast ? '#000000' : '#F59E0B'}; color: ${isHighContrast ? '#000000' : '#F59E0B'}; ${isHighContrast ? 'border: 2px solid #000000;' : ''} }
    .pin-bubble.orange svg { stroke: #FFFFFF; fill: none; }

    .pin-bubble.red { background: ${isHighContrast ? '#000000' : '#EF4444'}; color: ${isHighContrast ? '#000000' : '#EF4444'}; ${isHighContrast ? 'border: 2px solid #000000;' : ''} }
    .pin-bubble.red svg { stroke: #FFFFFF; fill: #FFFFFF; }

    .pin-bubble.green { background: ${isHighContrast ? '#000000' : '#10B981'}; color: ${isHighContrast ? '#000000' : '#10B981'}; ${isHighContrast ? 'border: 2px solid #000000;' : ''} }
    .pin-bubble.green svg { stroke: #FFFFFF; fill: none; }

    .pin-bubble.amber { background: ${isHighContrast ? '#000000' : '#D97706'}; color: ${isHighContrast ? '#000000' : '#D97706'}; ${isHighContrast ? 'border: 2px solid #000000;' : ''} }
    .pin-bubble.amber svg { stroke: #FFFFFF; fill: none; }

    /* Floating label tags above pins (e.g. CITY HALL, MP) */
    .pin-label-tag {
      position: absolute;
      top: -24px;
      background: ${isHighContrast ? '#000000' : '#334155'};
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      white-space: nowrap;
      box-shadow: ${isHighContrast ? 'none' : '0 2px 6px rgba(0,0,0,0.25)'};
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 3px;
      ${isHighContrast ? 'border: 1px solid #FFFFFF;' : ''}
    }

    /* User GPS Blue/White Pulsing Dot — High-Contrast black border */
    .user-dot {
      width: 22px;
      height: 22px;
      background: #FFFFFF;
      border: 4px solid ${isHighContrast ? '#000000' : '#2563EB'};
      border-radius: 50%;
      box-shadow: ${isHighContrast ? '0 0 0 2px #000000, 0 0 0 6px rgba(0,0,0,0.6)' : '0 0 0 6px rgba(37, 99, 235, 0.25), 0 3px 8px rgba(0,0,0,0.3)'};
      animation: ${isHighContrast ? 'none' : 'pulse 2.5s infinite'};
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.45); }
      70% { box-shadow: 0 0 0 14px rgba(37, 99, 235, 0); }
      100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
    }

    /* Popup Styling — High-Contrast */
    .unity-popup .leaflet-popup-content-wrapper {
      background: ${surface};
      color: ${textPrimary};
      border-radius: 14px;
      box-shadow: ${isHighContrast ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.15)'};
      padding: 4px 6px;
      ${isHighContrast ? 'border: 2px solid #000000;' : ''}
    }
    .unity-popup .leaflet-popup-tip { background: ${surface}; }
    .popup-title { font-size: 13px; font-weight: 700; color: ${textPrimary}; }
    .popup-sub { font-size: 11px; color: ${isHighContrast ? '#000000' : '#64748B'}; margin-top: 2px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', {
      center: ${JSON.stringify(normalizedCenter)},
      zoom: ${zoom},
      zoomControl: false,
      attributionControl: false
    });

    // CartoDB Voyager / OpenStreetMap (clean, soft pastel colors)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // Markers from database or props
    const activeMarkers = ${JSON.stringify(markers || [])};

    activeMarkers.forEach(pin => {
      const pinType = pin.type || (pin.obstacleType === 'construction' ? 'orange' : pin.obstacleType === 'stairs_only' ? 'red' : 'green');
      const pinIconSvg = pin.iconSvg || '<svg width="20" height="20" viewBox="0 0 24 24" stroke="white" fill="none" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>';

      const iconHtml = \`
        <div class="custom-pin">
          \${pin.tag ? '<div class="pin-label-tag">' + pin.tag + '</div>' : ''}
          <div class="pin-bubble \${pinType}">
            \${pinIconSvg}
          </div>
        </div>
      \`;
      const customIcon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [40, 48],
        iconAnchor: [20, 48]
      });

      const pinLat = pin.lat || (pin.location && pin.location.coordinates ? pin.location.coordinates[1] : null);
      const pinLng = pin.lng || (pin.location && pin.location.coordinates ? pin.location.coordinates[0] : null);

      if (pinLat && pinLng) {
        L.marker([pinLat, pinLng], { icon: customIcon })
          .bindPopup('<div class="popup-title">' + (pin.title || pin.name || 'Location') + '</div><div class="popup-sub">' + (pin.desc || pin.obstacleType || '') + '</div>', { className: 'unity-popup' })
          .addTo(map);
      }
    });

    const userIcon = L.divIcon({
      html: '<div class="user-dot"></div>',
      className: '',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    L.marker(${JSON.stringify(normalizedCenter)}, { icon: userIcon }).addTo(map);

    map.on('click', function(e) {
      const payload = { lat: e.latlng.lat, lng: e.latlng.lng, latitude: e.latlng.lat, longitude: e.latlng.lng };
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_CLICK', payload: payload }));
      }
    });
  </script>
</body>
</html>
  `, [normalizedCenter, zoom, themeBg, surface, primary, cardBorder, textPrimary, isHighContrast, markers]);


  const handleMessage = useCallback((event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'MAP_CLICK' && typeof onMapClick === 'function') {
        onMapClick(msg.payload);
      }
    } catch (e) {}
  }, [onMapClick]);

  if (Platform.OS === 'web') {
    return (
      <View style={[tw`flex-1 w-full h-full`, { backgroundColor: themeBg }, style]}>
        <iframe
          title="UnityMap Leaflet OSM"
          srcDoc={mapHtml}
          style={{ width: '100%', height: '100%', border: 'none', backgroundColor: themeBg }}
          onLoad={() => {
            if (typeof onReady === 'function') onReady();
          }}
        />
      </View>
    );
  }

  if (!WebView) {
    return <View style={[tw`flex-1 w-full h-full`, { backgroundColor: themeBg }, style]} />;
  }

  return (
    <View style={[tw`flex-1 w-full h-full`, { backgroundColor: themeBg }, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={[tw`flex-1`, { backgroundColor: themeBg }]}
        onMessage={handleMessage}
        onLoadEnd={() => {
          if (typeof onReady === 'function') onReady();
        }}
        mixedContentMode="always"
        geolocationEnabled
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  );
};

export default BaseMap;

