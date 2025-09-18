/**
 * Calculate optimal text color based on background color luminance
 * Uses WCAG 2.1 guidelines for color contrast
 */
export function getOptimalTextColor(backgroundColor: string): 'white' | 'black' {
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate relative luminance using sRGB color space
  // Formula from WCAG 2.1 guidelines
  const sRGB = (color: number) => {
    const c = color / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const luminance = 0.2126 * sRGB(r) + 0.7152 * sRGB(g) + 0.0722 * sRGB(b);

  // If luminance is greater than 0.5, use black text, otherwise use white
  return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Helper function to toggle text color
 */
export function toggleTextColor(currentColor: 'white' | 'black'): 'white' | 'black' {
  return currentColor === 'white' ? 'black' : 'white';
}