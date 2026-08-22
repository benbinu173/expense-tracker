/**
 * Inline message block for form-level feedback.
 *
 * The `role` follows the tone rather than being a prop: an error is an
 * assertive interruption, a notice is polite. Getting that pairing wrong is the
 * usual bug, so it isn't left to the call site.
 */
type AlertProps = {
  children: React.ReactNode;
  tone?: "error" | "notice" | "success";
};

/*
 * `notice` is the only tone that moved to brand: it's neutral information, and a
 * violet wash reads as "the app is telling you something" without borrowing the
 * money colours. Error and success keep `--expense` / `--income` — a red alert and
 * a red amount meaning different things is a cost worth paying for a form message
 * that's instantly legible as wrong.
 */
const TONES = {
  error: "border-expense/35 bg-expense/8 text-expense",
  notice: "border-accent/20 bg-brand-soft text-ink-2",
  success: "border-income/35 bg-income/8 text-income",
} as const;

export function Alert({ children, tone = "notice" }: AlertProps) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`animate-fade-rise rounded-md border px-3 py-2.5 text-sm ${TONES[tone]}`}
    >
      {children}
    </p>
  );
}
