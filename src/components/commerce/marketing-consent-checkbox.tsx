import { clean, hasText } from "@/sanity/lib/content";

export function MarketingConsentCheckbox({
  label,
  checked,
  disabled,
  onChange,
}: {
  label?: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  if (!hasText(label)) return null;
  return (
    <label className="mb-5 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-foreground">
      <input
        type="checkbox"
        name="marketingOptIn"
        aria-label={clean(label)}
        className="mt-1 size-4 shrink-0 accent-primary disabled:cursor-wait"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
