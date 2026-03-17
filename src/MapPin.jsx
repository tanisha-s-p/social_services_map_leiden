import React from 'react';
import L from 'leaflet';
import ReactDOMServer from 'react-dom/server';

const LOC_COLORS = {
  government: '#396933',
  organization: '#385EFF',
  hub: '#FADD5A',
  library: '#555555',
};

export function MapPinSVG({ type = 'organization', size = 40 }) {
  const color = LOC_COLORS[type] || LOC_COLORS.organization;
  const s = size;
  return (
    <svg
      width={s}
      height={s * 1.3}
      viewBox="0 0 40 52"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 0C9 0 0 9 0 20C0 32 20 52 20 52C20 52 40 32 40 20C40 9 31 0 20 0Z"
        fill={color}
      />
      <circle cx="20" cy="20" r="7" fill="white" opacity="0.9" />
    </svg>
  );
}

export function createLeafletIcon(type, size = 40) {
  const svgString = ReactDOMServer.renderToString(
    <MapPinSVG type={type} size={size} />
  );
  return L.divIcon({
    html: svgString,
    className: '',
    iconSize: [size, size * 1.3],
    iconAnchor: [size / 2, size * 1.3],
    popupAnchor: [0, -size * 1.1],
  });
}
