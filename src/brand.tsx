import * as React from "react";

/**
 * Product identity. The glyph is drawn from the same paths as static/icon.png so the
 * header mark and the Marketplace icon are one logo.
 */
export const BRAND = {
  id: "library-secret-scanner",
  name: "Library Secret Scanner",
  tagline: "Find variable group values that should be secrets",
};

export const BrandGlyph: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable={false}
  >
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.3 15.3 5.2 5.2" />
    <circle cx="10.5" cy="8.6" r="1.4" />
    <path d="M10.5 10v3.4" />
  </svg>
);
