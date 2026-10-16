import type { HTMLAttributes } from "react";
import logoUrl from "../assets/enterprisecloud-logo.png";

export const enterpriseCloudLogoUrl = logoUrl;

export function EnterpriseCloudLogo({
  compact = false,
  className = "",
  ...props
}: {
  compact?: boolean;
  className?: string;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`enterprise-logo ${compact ? "is-compact" : ""} ${className}`.trim()}
      {...props}
    >
      <img
        className="enterprise-logo-mark"
        src={logoUrl}
        alt=""
        aria-hidden="true"
      />
      {!compact && (
        <span className="enterprise-logo-copy">
          <strong>EnterpriseCloud</strong>
          <small>ERP · Operación integrada</small>
        </span>
      )}
    </span>
  );
}
