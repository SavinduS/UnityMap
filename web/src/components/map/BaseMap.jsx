import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Fix: Leaflet default marker icon broken by Webpack/Vite/React bundlers ──
// Bundlers rename hashed asset paths, so Leaflet's auto-detection fails.
// We explicitly point to the CDN images as a reliable cross-environment fix.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * BaseMap — Reusable Leaflet.js + OpenStreetMap container component.
 *
 * @param {[number, number]} center     - Map center coordinates [lat, lng]. Defaults to Colombo, SL.
 * @param {number}           zoom       - Initial zoom level (1–19). Default: 13.
 * @param {Array<{
 *   lat: number,
 *   lng: number,
 *   title?: string,
 *   description?: string
 * }>}                        markers   - Array of marker objects to render on the map.
 * @param {function}         onMapClick - Callback fired with { lat, lng } on map click.
 * @param {string}           height     - CSS height of the map container. Default: '100%'.
 * @param {object}           style      - Additional inline styles for the container div.
 */
const BaseMap = ({
  center = [6.9271, 79.8612], // Default: Colombo, Sri Lanka
  zoom = 13,
  markers = [],
  onMapClick,
  height = '100%',
  style = {},
}) => {
  // ── Ref for the container DOM node Leaflet will attach to ─────────────────
  const mapContainerRef = useRef(null);

  // ── Ref for the Leaflet map instance (persists across re-renders) ─────────
  const mapInstanceRef = useRef(null);

  // ── Ref for the marker layer group (enables safe clear + re-render) ───────
  const markerLayerRef = useRef(null);

  // ─── Effect 1: Initialize the map ONCE on mount ───────────────────────────
  useEffect(() => {
    // Guard: do not re-initialize if already mounted
    if (mapInstanceRef.current) return;

    // Create the Leaflet map instance attached to the DOM ref
    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    });

    // Add OpenStreetMap tile layer — completely free, no API key required
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Create a layer group to manage markers as a single unit
    markerLayerRef.current = L.layerGroup().addTo(map);

    // Register map click handler
    map.on('click', (e) => {
      if (typeof onMapClick === 'function') {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    // Persist the map instance
    mapInstanceRef.current = map;

    // ── Cleanup on unmount: properly destroy the map to free memory ──────────
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps: run only once on mount

  // ─── Effect 2: Sync markers whenever the `markers` prop changes ───────────
  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer) return;

    // Clear all existing markers before adding fresh ones
    layer.clearLayers();

    markers.forEach((m) => {
      if (typeof m.lat !== 'number' || typeof m.lng !== 'number') return;

      const marker = L.marker([m.lat, m.lng]);

      // Build popup content
      const title = m.title || 'Pinned Location';
      const description = m.description || '';
      const coordLabel = `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}`;

      marker.bindPopup(`
        <div style="font-family: -apple-system, Inter, sans-serif; min-width: 160px;">
          <div style="font-size:14px; font-weight:700; color:#2563EB; margin-bottom:4px;">
            ${title}
          </div>
          ${description
            ? `<div style="font-size:12px; color:#374151; margin-bottom:6px;">${description}</div>`
            : ''}
          <div style="font-size:11px; color:#9CA3AF;">📍 ${coordLabel}</div>
        </div>
      `);

      layer.addLayer(marker);
    });
  }, [markers]); // Re-runs whenever markers array reference changes

  // ─── Render: a plain div — Leaflet owns everything inside it ─────────────
  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height,
        borderRadius: '12px',
        overflow: 'hidden',
        ...style,
      }}
    />
  );
};

export default BaseMap;
