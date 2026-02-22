import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & {
  title?: string;
};

export function PlanTracePlaceholderIcon({ title = "Plan trace placeholder", ...props }: Props) {
  const titleId = React.useId();

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title ? <title id={titleId}>{title}</title> : null}

      {/* Paper */}
      <rect
        x="10"
        y="8"
        width="44"
        height="48"
        rx="6"
        fill="hsl(var(--tf-surface))"
        stroke="hsl(var(--border))"
        strokeWidth="2"
      />

      {/* Header line */}
      <rect
        x="16"
        y="16"
        width="28"
        height="4"
        rx="2"
        fill="hsl(var(--muted-foreground) / 0.35)"
      />

      {/* Body lines */}
      <rect x="16" y="26" width="32" height="3" rx="1.5" fill="hsl(var(--muted-foreground) / 0.25)" />
      <rect x="16" y="33" width="26" height="3" rx="1.5" fill="hsl(var(--muted-foreground) / 0.25)" />
      <rect x="16" y="40" width="30" height="3" rx="1.5" fill="hsl(var(--muted-foreground) / 0.25)" />

      {/* Corner badge */}
      <circle cx="48" cy="46" r="6" fill="hsl(var(--tf-transcend-cyan) / 0.18)" stroke="hsl(var(--tf-transcend-cyan) / 0.5)" />
      <path
        d="M46.2 46.1l1.1 1.1 2.8-2.8"
        fill="none"
        stroke="hsl(var(--tf-transcend-cyan))"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
