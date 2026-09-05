import { ImSpinner2 } from "react-icons/im";

export function LoadingIndicator({
  label = "Loading…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <ImSpinner2 aria-hidden="true" className="animate-spin" />
      <span>{label}</span>
    </span>
  );
}
