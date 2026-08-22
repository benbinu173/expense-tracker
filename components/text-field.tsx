/**
 * Labelled text input with field-level error display.
 *
 * Pure presentation, so it renders in Server and Client Components alike. Every
 * form in the app uses this — the label/error/`aria-describedby` wiring is the
 * part that gets forgotten when it's hand-rolled each time.
 *
 * `text-base` on the input is not a style choice: iOS Safari zooms the viewport
 * when a focused input's text is under 16px.
 */
type TextFieldProps = {
  label: string;
  name: string;
  /**
   * Defaults to `name`, which is right for a form that appears once on a page.
   * Pass it when the same field is rendered repeatedly — the categories list has
   * a rename field per row, and duplicate ids would point every label at the
   * first input.
   */
  id?: string;
  type?: "text" | "email" | "password" | "date";
  defaultValue?: string;
  /** Field errors from a Server Action's returned state. */
  errors?: string[];
  /** Static help text, shown when there's no error. */
  hint?: string;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  maxLength?: number;
  /** For `type="date"`: the latest selectable day, as `'YYYY-MM-DD'`. */
  max?: string;
  placeholder?: string;
  /** Renders the value in tabular mono — for amounts. */
  figure?: boolean;
  /** Non-interactive prefix inside the field, e.g. `₹`. */
  prefix?: string;
  /** `lg` is for the one field that is the point of the form — the amount. */
  size?: "md" | "lg";
  /**
   * `decimal` gives mobile a numeric keypad with a decimal point. Prefer it over
   * `type="number"` for money: number inputs hijack the scroll wheel, accept `e`
   * notation, and reject the "₹1,234.50" paste that `parseAmountToPaise` handles.
   */
  inputMode?: "text" | "decimal" | "numeric";
};

export function TextField({
  label,
  name,
  id,
  type = "text",
  defaultValue,
  errors,
  hint,
  required,
  autoComplete,
  autoFocus,
  maxLength,
  max,
  placeholder,
  figure = false,
  prefix,
  size = "md",
  inputMode,
}: TextFieldProps) {
  const invalid = errors !== undefined && errors.length > 0;
  const fieldId = id ?? name;
  const messageId = `${fieldId}-message`;
  const large = size === "lg";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-ink text-sm font-medium">
        {label}
        {!required && <span className="text-ink-3 font-normal"> (optional)</span>}
      </label>

      {/*
       * The ring lives on the wrapper rather than the input so that a prefix
       * sits inside the same outlined box instead of beside it.
       *
       * `animate-shake` fires on the render that brings the error back from the
       * Server Action — the movement is what draws the eye down to a field that's
       * below the fold on a phone. The message underneath is still the thing that
       * says what's wrong; this only points at it.
       */}
      <div
        className={`focus-ring-within bg-raised ease-out-quart flex items-center rounded-md border transition-colors duration-150 ${
          invalid
            ? "border-expense bg-expense/5 animate-shake"
            : "border-rule-strong hover:border-accent/45"
        }`}
      >
        {prefix && (
          <span
            aria-hidden
            className={`text-ink-3 figure pl-3 ${large ? "text-2xl" : "text-base"}`}
          >
            {prefix}
          </span>
        )}
        <input
          id={fieldId}
          name={name}
          type={type}
          inputMode={inputMode}
          defaultValue={defaultValue}
          required={required}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          maxLength={maxLength}
          max={max}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid || hint ? messageId : undefined}
          className={`text-ink placeholder:text-ink-3 w-full rounded-md bg-transparent px-3 py-2 outline-none ${
            large ? "min-h-14 text-2xl" : "min-h-11 text-base"
          } ${figure ? "figure" : ""} ${prefix ? "pl-1.5" : ""}`}
        />
      </div>

      {invalid ? (
        <p id={messageId} className="text-expense text-sm">
          {errors.join(" ")}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-ink-3 text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
