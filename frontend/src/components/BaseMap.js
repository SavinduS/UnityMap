import React, { useRef, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import tw from 'twrnc';

/**
 * BaseMap.js - Free Styled OpenStreetMap Component
 * Powered by pure Tailwind CSS styling.
 */
const BaseMap = ({
  center = [6.9271, 79.8612],
  zoom = 14,
  markers = [],
  onMapClick,
  onReady,
  style,
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
    html, body, #map { height: 100%; width: 100%; background: #E9F1EE; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    
    .leaflet-control-attribution { font-size: 8px; opacity: 0.5; }
    .leaflet-bar { border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
    .leaflet-bar a { background: #FFFFFF !important; color: #1E6F50 !important; border-bottom: 1px solid #F1F5F9 !important; }

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

    .pin-bubble.orange { background: #F59E0B; color: #F59E0B; }
    .pin-bubble.orange svg { stroke: #FFFFFF; fill: none; }

    .pin-bubble.red { background: #EF4444; color: #EF4444; }
    .pin-bubble.red svg { stroke: #FFFFFF; fill: #FFFFFF; }

    .pin-bubble.green { background: #10B981; color: #10B981; }
    .pin-bubble.green svg { stroke: #FFFFFF; fill: none; }

    .pin-bubble.amber { background: #D97706; color: #D97706; }
    .pin-bubble.amber svg { stroke: #FFFFFF; fill: none; }

    /* Floating label tags above pins (e.g. CITY HALL, MP) */
    .pin-label-tag {
      position: absolute;
      top: -24px;
      background: #334155;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 3px;
    }

    /* User GPS Blue/White Pulsing Dot */
    .user-dot {
      width: 22px;
      height: 22px;
      background: #FFFFFF;
      border: 4px solid #2563EB;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.25), 0 3px 8px rgba(0,0,0,0.3);
      animation: pulse 2.5s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.45); }
      70% { box-shadow: 0 0 0 14px rgba(37, 99, 235, 0); }
      100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
    }

    /* Popup Styling */
    .unity-popup .leaflet-popup-content-wrapper {
      background: #FFFFFF;
      color: #1E293B;
      border-radius: 14px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
      padding: 4px 6px;
    }
    .unity-popup .leaflet-popup-tip { background: #FFFFFF; }
    .popup-title { font-size: 13px; font-weight: 700; color: #0F172A; }
    .popup-sub { font-size: 11px; color: #64748B; margin-top: 2px; }
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

    // Pre-configured Pins Matching UI Screenshot
    const defaultPins = [
      {
        lat: 6.9310, lng: 79.8580,
        type: 'orange',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16M9 6v6M15 12v6"/></svg>',
        title: 'Broken Pavement',
        desc: '120m away • Medium Priority'
      },
      {
        lat: 6.9295, lng: 79.8660,
        type: 'red',
        tag: '🏛️ CITY HALL',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="4" r="2"/><path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.71-.34-1.55-.26-2.19.22L7.3 10.28c-.4.3-.64.78-.64 1.28V19h2v-6.35l2.4-1.8 1.94 9.15h2l-1.2-5.64C15.82 15.64 17.84 17 20 17v-2c-1.63 0-3.08-.94-3.79-2.34L15.5 11h3.5z"/></svg>',
        title: 'Blocked Ramp',
        desc: '350m away • High Priority'
      },
      {
        lat: 6.9240, lng: 79.8550,
        type: 'green',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" stroke="white" fill="none" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        title: 'Construction Hazard',
        desc: 'Sidewalk under repair'
      },
      {
        lat: 6.9220, lng: 79.8640,
        type: 'amber',
        tag: '🏢 MUSEUM',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" stroke="white" fill="none" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>',
        title: 'Steep Curb',
        desc: 'No curb cut on crossing'
      }
    ];

    defaultPins.forEach(pin => {
      const iconHtml = \`
        <div class="custom-pin">
          \${pin.tag ? '<div class="pin-label-tag">' + pin.tag + '</div>' : ''}
          <div class="pin-bubble \${pin.type}">
            \${pin.icon}
          </div>
        </div>
      \`;
      const customIcon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [40, 48],
        iconAnchor: [20, 48]
      });

      L.marker([pin.lat, pin.lng], { icon: customIcon })
        .bindPopup('<div class="popup-title">' + pin.title + '</div><div class="popup-sub">' + pin.desc + '</div>', { className: 'unity-popup' })
        .addTo(map);
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
  `, [normalizedCenter, zoom]);

  const handleMessage = useCallback((event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'MAP_CLICK' && typeof onMapClick === 'function') {
        onMapClick(msg.payload);
      }
    } catch (e) {}
  }, [onMapClick]);

  return (
    <View style={[tw`flex-1 w-full h-full`, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={tw`flex-1 bg-[#E9F1EE]`}
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
