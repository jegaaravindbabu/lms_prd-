import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Tenant logo lockup. Falls back to a refined monogram + wordmark when the
 * school has not uploaded a logo yet.
 */
export function Logo({
  name,
  logoUrl,
  className,
  compact = false,
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={name}
          width={140}
          height={36}
          className="h-8 w-auto object-contain"
        />
      ) : (
        <>
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand/15 ring-1 ring-inset ring-white/10">
            <span className="font-display text-lg leading-none text-brand-gradient">
              {name.trim().charAt(0).toUpperCase() || "A"}
            </span>
            <span className="pointer-events-none absolute inset-0 rounded-xl shadow-[0_0_20px_-6px_hsl(var(--brand)/0.7)]" />
          </span>
          {!compact && (
            <span className="font-display text-lg tracking-tight text-luxe">{name}</span>
          )}
        </>
      )}
    </div>
  );
}
