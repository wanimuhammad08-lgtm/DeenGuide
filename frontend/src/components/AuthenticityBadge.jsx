import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";

const variants = {
  Sahih: {
    cls: "bg-[hsl(var(--sahih-bg))] text-[hsl(var(--sahih-text))] border-[hsl(var(--sahih-text))]/20",
    icon: ShieldCheck,
    label: "Sahih",
  },
  Hasan: {
    cls: "bg-[hsl(var(--hasan-bg))] text-[hsl(var(--hasan-text))] border-[hsl(var(--hasan-text))]/20",
    icon: Shield,
    label: "Hasan",
  },
  "Da'if": {
    cls: "bg-[hsl(var(--daif-bg))] text-[hsl(var(--daif-text))] border-[hsl(var(--daif-text))]/20",
    icon: ShieldAlert,
    label: "Da'if",
  },
  Authentic: {
    cls: "bg-[hsl(var(--sahih-bg))] text-[hsl(var(--sahih-text))] border-[hsl(var(--sahih-text))]/20",
    icon: ShieldCheck,
    label: "Authentic",
  },
  Verified: {
    cls: "bg-[hsl(var(--sahih-bg))] text-[hsl(var(--sahih-text))] border-[hsl(var(--sahih-text))]/20",
    icon: ShieldCheck,
    label: "Verified",
  },
};

export const AuthenticityBadge = ({ level = "Sahih", className = "" }) => {
  const v = variants[level] || variants.Sahih;
  const Icon = v.icon;
  return (
    <span
      data-testid={`authenticity-badge-${v.label.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${v.cls} ${className}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {v.label}
    </span>
  );
};
