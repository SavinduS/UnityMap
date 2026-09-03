import React, { useState, useCallback } from 'react';
import BaseMap from './components/map/BaseMap';

/**
 * App.jsx — Integration example for the BaseMap component.
 *
 * Demonstrates:
 *  - Importing and rendering <BaseMap />
 *  - Managing a local markers state with useState
 *  - Dynamically adding a marker on every map click
 *  - Passing onMapClick callback that receives { lat, lng }
 */
const App = () => {
  // ── State: list of marker objects rendered on the map ────────────────────
  const [markers, setMarkers] = useState([
    // Seed with one default marker at the map center
    {
      lat: 6.9271,
      lng: 79.8612,
      title: 'Colombo City Center',
      description: 'UnityMap project origin point',
    },
  ]);

  // ── Last clicked coordinate (displayed in the info panel) ────────────────
  const [lastClick, setLastClick] = useState(null);

  /**
   * onMapClick — called by BaseMap with { lat, lng } on every map tap.
   * Adds a new marker at the clicked position.
   */
  const handleMapClick = useCallback(({ lat, lng }) => {
    setLastClick({ lat, lng });

    setMarkers((prev) => [
      ...prev,
      {
        lat,
        lng,
        title: `Pin #${prev.length + 1}`,
        description: `Added at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      },
    ]);
  }, []);

  // ── Clear all markers except the default seed ─────────────────────────────
  const handleClear = () => {
    setMarkers([
      {
        lat: 6.9271,
        lng: 79.8612,
        title: 'Colombo City Center',
        description: 'UnityMap project origin point',
      },
    ]);
    setLastClick(null);
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🗺️ UnityMap — Base Map Demo</h1>
        <p style={styles.subtitle}>Click anywhere on the map to drop a pin</p>
      </div>

      {/* Info bar */}
      <div style={styles.infoBar}>
        <span style={styles.infoBadge}>📍 {markers.length} marker{markers.length !== 1 ? 's' : ''}</span>
        {lastClick && (
          <span style={styles.infoCoords}>
            Last click: {lastClick.lat.toFixed(5)}, {lastClick.lng.toFixed(5)}
          </span>
        )}
        <button onClick={handleClear} style={styles.clearBtn}>
          Clear Pins
        </button>
      </div>

      {/* ── BaseMap Integration ─────────────────────────────────────────────
          Props:
            center     — initial map center [lat, lng]
            zoom       — initial zoom level
            markers    — dynamic array from state (updates trigger re-render)
            onMapClick — called with { lat, lng } on map click
            height     — CSS height of the map container
      ───────────────────────────────────────────────────────────────────── */}
      <div style={styles.mapWrapper}>
        <BaseMap
          center={[6.9271, 79.8612]}
          zoom={13}
          markers={markers}
          onMapClick={handleMapClick}
          height="100%"
        />
      </div>
    </div>
  );
};

// ── Inline styles (no dependencies) ──────────────────────────────────────────
const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: "'Inter', -apple-system, sans-serif",
    backgroundColor: '#0F172A',
    color: '#F1F5F9',
  },
  header: {
    padding: '16px 24px 8px',
    backgroundColor: '#1E293B',
    borderBottom: '1px solid #334155',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 700,
    color: '#F8FAFC',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: '#94A3B8',
  },
  infoBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 24px',
    backgroundColor: '#1E293B',
    borderBottom: '1px solid #334155',
    flexWrap: 'wrap',
  },
  infoBadge: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#60A5FA',
    backgroundColor: '#1E3A5F',
    padding: '4px 10px',
    borderRadius: '20px',
  },
  infoCoords: {
    fontSize: '12px',
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  clearBtn: {
    marginLeft: 'auto',
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#F1F5F9',
    backgroundColor: '#EF4444',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  mapWrapper: {
    flex: 1,
    padding: '16px',
  },
};

export default App;
