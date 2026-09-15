
'use client';

import { useAuth } from "@/context/auth-provider";
import { cn } from "@/lib/utils";

export function AppLogo({
  size = 'md',
  textClassName,
  imageClassName
}: {
  size?: 'sm' | 'md' | 'lg';
  textClassName?: string;
  imageClassName?: string;
}) {
  const { clientBrand } = useAuth();

  const defaultIconSize = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-9 w-9' : 'h-7 w-7';
  const iconSize = clientBrand?.logoSizeClass || defaultIconSize;
  const textSize = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl';

  const logoUrl = clientBrand?.logoUrl || "/logo.svg";
  const brandName = clientBrand?.name || 'WANDA';
  const showText = !clientBrand?.hideLogoText;

  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl || "/logo.svg"}
        alt={`${brandName} Logo`}
        className={cn(iconSize, 'object-contain', imageClassName)}
      />
      {showText && (
          <span className={cn(
            `${textSize} font-bold font-headline text-foreground`,
            textClassName
          )}>
            {brandName}
          </span>
      )}
    </div>
  );
}
