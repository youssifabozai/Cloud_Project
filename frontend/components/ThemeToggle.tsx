"use client";

type ThemeToggleProps = {
  theme: "dark" | "light";
  onToggle: () => void;
  className?: string;
};

export function ThemeToggle({ theme, onToggle, className = "" }: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`theme-toggle ${isDark ? "theme-toggle-dark" : "theme-toggle-light"} ${className}`}
    >
      <span className="theme-toggle-stars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className="theme-toggle-moon" aria-hidden="true">
        <span className="theme-toggle-crater theme-toggle-crater-a" />
        <span className="theme-toggle-crater theme-toggle-crater-b" />
        <span className="theme-toggle-crater theme-toggle-crater-c" />
      </span>
    </button>
  );
}

export default ThemeToggle;
