import React from 'react';
import L from 'leaflet';
import ReactDOMServer from 'react-dom/server';

const LOC_COLORS = {
  government:   { stroke: '#4a7a44', fill: '#e8f2e6' },
  organization: { stroke: '#3a5abf', fill: '#e5eaf8' },
  hub:          { stroke: '#935918', fill: '#faf2d9' },
  library:      { stroke: '#555555', fill: '#efefef' },
};

export function MapPinSVG({ type = 'organization', size = 32 }) {
  const color = LOC_COLORS[type] || LOC_COLORS.organization;
  return (
      <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="13" fill={color.fill} stroke={color.stroke} strokeWidth="2.5" />
        <circle cx="16" cy="16" r="8" fill={color.stroke} />
      </svg>
  );
}

export function createLeafletIcon(type, size = 32) {
  const svgString = ReactDOMServer.renderToString(
      <MapPinSVG type={type} size={size} />
  );
  return L.divIcon({
    html: svgString,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}