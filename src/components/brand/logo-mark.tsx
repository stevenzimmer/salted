export function LogoMark() {
  return (
    <div
      className="brand-seal"
      role="img"
      aria-label="Salted Focaccia — sourdough and good things"
    >
      <span>sourdough &</span>
      <span className="seal-flower" aria-hidden="true">
        {"\u2733\uFE0E"}
      </span>
      <span>good things</span>
    </div>
  );
}
