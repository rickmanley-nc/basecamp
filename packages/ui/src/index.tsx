import { Button as KaizenButton } from "@nvidia/foundations-react-core";
import React from "react";
import type { PropsWithChildren, ReactNode } from "react";

export interface PageShellProps extends PropsWithChildren {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageShell({ title, eyebrow, actions, children }: PageShellProps) {
  return (
    <div className="bc-shell">
      <header className="bc-appbar">
        <div>
          <p className="bc-kicker">Basecamp</p>
          <h1>{title}</h1>
          {eyebrow ? <p className="bc-muted">{eyebrow}</p> : null}
        </div>
        {actions ? <div className="bc-actions">{actions}</div> : null}
      </header>
      <main className="bc-main">{children}</main>
    </div>
  );
}

export interface ButtonProps extends PropsWithChildren {
  tone?: "primary" | "secondary" | "quiet";
  type?: "button" | "submit" | "reset";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  ariaPressed?: boolean;
}

export function Button({
  tone = "secondary",
  type = "button",
  className,
  disabled,
  onClick,
  ariaLabel,
  ariaPressed,
  children
}: ButtonProps) {
  const kind: "primary" | "secondary" | "tertiary" =
    tone === "primary" ? "primary" : tone === "quiet" ? "tertiary" : "secondary";
  const color: "brand" | "neutral" = tone === "primary" ? "brand" : "neutral";
  const buttonClassName = ["bc-button", className].filter(Boolean).join(" ");

  const buttonProps = {
    className: buttonClassName,
    color,
    kind,
    type,
    ...(ariaLabel === undefined ? {} : { "aria-label": ariaLabel }),
    ...(ariaPressed === undefined ? {} : { "aria-pressed": ariaPressed }),
    ...(onClick === undefined ? {} : { onClick })
  };

  if (disabled === undefined) {
    return (
      <KaizenButton {...buttonProps}>
        {children}
      </KaizenButton>
    );
  }

  return (
    <KaizenButton {...buttonProps} disabled={disabled}>
      {children}
    </KaizenButton>
  );
}

export interface PanelProps extends PropsWithChildren {
  title?: string;
  description?: string;
  className?: string;
}

export function Panel({ title, description, className, children }: PanelProps) {
  return (
    <section className={["bc-panel", className].filter(Boolean).join(" ")}>
      {title ? (
        <header className="bc-panel-header">
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export interface StatusBadgeProps {
  children: ReactNode;
  tone?: "ready" | "active" | "later" | "gap";
}

export function StatusBadge({ children, tone = "active" }: StatusBadgeProps) {
  return <span className={`bc-status bc-status-${tone}`}>{children}</span>;
}

export interface ProgressRingProps {
  value: number;
  label: string;
}

export function ProgressRing({ value, label }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <figure className="bc-progress-ring" aria-label={`${label}: ${clamped}%`}>
      <div
        className="bc-progress-ring-visual"
        style={{
          background: `conic-gradient(var(--bc-accent) ${clamped * 3.6}deg, var(--bc-border) 0deg)`
        }}
      >
        <span>{clamped}</span>
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export interface MetricProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function Metric({ label, value, detail }: MetricProps) {
  return (
    <div className="bc-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export interface QuestListItemProps {
  title: string;
  meta: string;
  actions?: ReactNode;
}

export function QuestListItem({ title, meta, actions }: QuestListItemProps) {
  return (
    <li className="bc-list-item">
      <div>
        <span>{title}</span>
        <small>{meta}</small>
      </div>
      {actions ? <div className="bc-list-actions">{actions}</div> : null}
    </li>
  );
}
