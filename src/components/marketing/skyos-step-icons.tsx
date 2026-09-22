type StepIconName =
  | "intake"
  | "context"
  | "qualification"
  | "services"
  | "onboarding"
  | "monitoring";

export function SkyosStepIcon({
  name,
  className,
}: {
  name: StepIconName;
  className?: string;
}) {
  const props = {
    viewBox: "0 0 24 24",
    width: 16,
    height: 16,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "intake":
      return (
        <svg {...props}>
          <path d="M4 6h16v12H4V6z" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      );
    case "context":
      return (
        <svg {...props}>
          <path d="M4 10h6v10H4V10zM14 4h6v16h-6V4z" />
          <path d="M7 14h0M17 10h0" />
        </svg>
      );
    case "qualification":
      return (
        <svg {...props}>
          <path d="M5 4h14v16H5V4z" />
          <path d="M8 9h8M8 13h5" />
          <path d="M14 17l1.5 1.5L18 15" />
        </svg>
      );
    case "services":
      return (
        <svg {...props}>
          <path d="M5 8h14M5 12h14M5 16h10" />
          <path d="M5 8l2-3h10l2 3" />
        </svg>
      );
    case "onboarding":
      return (
        <svg {...props}>
          <path d="M6 4h12v16H6V4z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      );
    case "monitoring":
      return (
        <svg {...props}>
          <path d="M4 14c2-4 6-6 8-6s6 2 8 6" />
          <circle cx="12" cy="14" r="2" />
          <path d="M12 6v2" />
        </svg>
      );
  }
}
