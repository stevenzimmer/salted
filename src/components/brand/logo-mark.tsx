import { Spark } from "@/components/brand/spark";

export function LogoMark() {
  return (
    <div
      className="brand-seal"
      role="img"
      aria-label="Salted Focaccia — a little salty. a lot to love."
    >
      <svg viewBox="0 0 140 140" aria-hidden="true" focusable="false">
        <circle className="seal-border" cx="70" cy="70" r="69" />
        <Spark
          className="seal-spark"
          x="57.5"
          y="28.6"
          width="25"
          height="30"
        />
        <text className="seal-name" x="70" y="78" textAnchor="middle">
          a little salty.
          <tspan x="70" dy="19">
            a lot to love.
          </tspan>
        </text>
      </svg>
    </div>
  );
}
