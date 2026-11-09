"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface ButtonBase {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  className?: string;
  "aria-describedby"?: string;
}

function ActionButton({ variant, children, onClick, href, disabled, loading, type = "button", className = "", ...rest }: ButtonBase & { variant: "primary" | "secondary" | "danger" }) {
  const cls = `btn btn-${variant} ${className}`.trim();
  const off = disabled || loading;
  if (href && !off) {
    return (
      <Link href={href} className={cls} onClick={onClick} {...rest}>
        {children}
      </Link>
    );
  }
  // Disabled buttons stay focusable (aria-disabled) so keyboard and screen-reader users can find out why.
  return (
    <button
      type={type}
      className={cls}
      aria-disabled={off || undefined}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (off) {
          e.preventDefault();
          return;
        }
        onClick?.();
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PrimaryButton(props: ButtonBase) {
  return <ActionButton variant="primary" {...props} />;
}
export function SecondaryButton(props: ButtonBase) {
  return <ActionButton variant="secondary" {...props} />;
}
export function DangerButton(props: ButtonBase) {
  return <ActionButton variant="danger" {...props} />;
}

/** The page's h1. It takes focus when the page appears so screen-reader users hear where they are. */
export function PageHeading({ children, id }: { children: ReactNode; id?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1} id={id}>
      {children}
    </h1>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="card">
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div role="alert" className="error-box">
      <h2>{title}</h2>
      {children}
      {actions && <div className="row" style={{ marginTop: "0.75rem" }}>{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {children}
      {actions && <div className="row" style={{ marginTop: "0.75rem" }}>{actions}</div>}
    </div>
  );
}
