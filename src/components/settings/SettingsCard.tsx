/**
 * Shared admin-themed card primitives for settings sections.
 * Uses CSS variables so they respond to dark mode automatically.
 */
import React from "react";

export const SettingsCard = ({ children }: { children: React.ReactNode }) => (
  <div
    className="rounded-2xl overflow-hidden shadow-sm"
    style={{
      backgroundColor: "var(--admin-card)",
      border: "1px solid var(--admin-card-border)",
    }}
  >
    {children}
  </div>
);

export const SettingsCardHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) => (
  <div
    className="px-6 py-4"
    style={{
      backgroundColor: "var(--admin-card-header)",
      borderBottom: "1px solid var(--admin-card-border)",
    }}
  >
    <div
      className="flex items-center gap-2 text-base font-semibold"
      style={{ color: "var(--admin-text)" }}
    >
      <Icon className="h-5 w-5" style={{ color: "var(--admin-muted)" }} />
      {title}
    </div>
    {description && (
      <p className="text-sm mt-0.5" style={{ color: "var(--admin-muted)" }}>
        {description}
      </p>
    )}
  </div>
);

export const SettingsLabel = ({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) => (
  <label
    htmlFor={htmlFor}
    className="text-sm font-medium"
    style={{ color: "var(--admin-label)" }}
  >
    {children}
  </label>
);

export const SettingsHint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs" style={{ color: "var(--admin-label-muted)" }}>
    {children}
  </p>
);

export const SettingsTitle = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div>
    <h2 className="text-2xl font-semibold" style={{ color: "var(--admin-text)" }}>
      {title}
    </h2>
    <p className="text-sm mt-1" style={{ color: "var(--admin-muted)" }}>
      {description}
    </p>
  </div>
);
