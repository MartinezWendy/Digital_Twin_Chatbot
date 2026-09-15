
'use client';

import { useAuth } from '@/context/auth-provider';
import React from 'react';

/**
 * This component reads the branding colors from the AuthContext and injects them
 * as CSS variables into the document's head. This allows for dynamic theming
 * of the entire application based on client-specific settings.
 */
export function BrandingStyleInjector() {
  const { clientBrand } = useAuth();

  // If there's no client brand or no custom colors, do nothing.
  if (!clientBrand || (!clientBrand.primaryColor && !clientBrand.accentColor && !clientBrand.lightBackgroundColor && !clientBrand.darkBackgroundColor)) {
    return null;
  }

  // Construct the CSS override string. Only include variables for colors that are defined.
  const styles = `
    :root {
      ${clientBrand.primaryColor ? `--primary: ${clientBrand.primaryColor};` : ''}
      ${clientBrand.accentColor ? `--accent: ${clientBrand.accentColor};` : ''}
      ${clientBrand.lightBackgroundColor ? `--background: ${clientBrand.lightBackgroundColor};` : ''}
    }
    .dark {
      ${clientBrand.darkBackgroundColor ? `--background: ${clientBrand.darkBackgroundColor};` : ''}
    }
  `;

  return <style>{styles}</style>;
}
