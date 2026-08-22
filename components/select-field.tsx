import { IconChevronDown } from "@/components/icons";

/**
 * Labelled `<select>`, sharing the text field's box and error wiring.
 *
 * A native select on purpose: mobile gets the OS picker, keyboard and screen
 * reader support come free, and it needs no dependency. The only custom part is
 * the chevron, because `appearance-none` removes the platform one.
 */
type Option = { value: string; label: string };

type SelectFieldProps = {
  label: string;
  name: string;
  options: Option[];
  defaultValue?: string;
  /** Shown as a disabled first option, so nothing is preselected by accident. */
  placeholder?: string;
  errors?: string[];
  hint?: string;
  required?: boolean;
  /** Rendered disabled with a hint when there's nothing to choose from. */
  emptyHint?: string;
};

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  placeholder,
  errors,
  hint,
  required,
  emptyHint,
}: SelectFieldProps) {
  const invalid = errors !== undefined && errors.length > 0;
  const messageId = `${name}-message`;
  const empty = options.length === 0;
  const message = invalid ? errors.join(" ") : empty ? emptyHint : hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-ink text-sm font-medium">
        {label}
        {!required && <span className="text-ink-3 font-normal"> (optional)</span>}
      </label>

      {/*
       * No `bg-expense/5` wash on the invalid state, unlike `text-field.tsx`: the
       * select carries an opaque `bg-raised` of its own (so its popup has a colour
       * to inherit) and covers the wrapper edge to edge, so a tint here would never
       * be seen. The border, the shake and the message carry it.
       */}
      <div
        className={`focus-ring-within bg-raised ease-out-quart group relative flex items-center rounded-md border transition-colors duration-150 ${
          invalid ? "border-expense animate-shake" : "border-rule-strong hover:border-accent/45"
        } ${empty ? "opacity-60" : ""}`}
      >
        <select
          id={name}
          name={name}
          defaultValue={defaultValue ?? ""}
          required={required}
          disabled={empty}
          aria-invalid={invalid || undefined}
          aria-describedby={message ? messageId : undefined}
          className="text-ink bg-raised min-h-11 w-full appearance-none rounded-md py-2 pr-9 pl-3 text-base outline-none"
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <IconChevronDown className="text-ink-3 group-has-[select:focus-visible]:text-accent ease-out-quart pointer-events-none absolute right-2.5 size-5 transition-colors duration-150" />
      </div>

      {message && (
        <p id={messageId} className={`text-sm ${invalid ? "text-expense" : "text-ink-3"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
