export type ColorScheme = {
  bg: string;
  border: string;
  text: string;
  fill: string;
};

export const PALETTE: ColorScheme[] = [
  { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.4)', text: '#FCA5A5', fill: '#EF4444' }, // Red
  { bg: 'rgba(249, 115, 22, 0.2)', border: 'rgba(249, 115, 22, 0.4)', text: '#FDBA74', fill: '#F97316' }, // Orange
  { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', text: '#FCD34D', fill: '#F59E0B' }, // Amber
  { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.4)', text: '#6EE7B7', fill: '#10B981' }, // Emerald
  { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.4)', text: '#93C5FD', fill: '#3B82F6' }, // Blue
  { bg: 'rgba(99, 102, 241, 0.2)', border: 'rgba(99, 102, 241, 0.4)', text: '#A5B4FC', fill: '#6366F1' }, // Indigo
  { bg: 'rgba(139, 92, 246, 0.2)', border: 'rgba(139, 92, 246, 0.4)', text: '#C4B5FD', fill: '#8B5CF6' }, // Violet
  { bg: 'rgba(236, 72, 153, 0.2)', border: 'rgba(236, 72, 153, 0.4)', text: '#F9A8D4', fill: '#EC4899' }, // Pink
];

export const getColorForString = (str: string): ColorScheme => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
};
