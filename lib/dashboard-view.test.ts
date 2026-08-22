import { describe, expect, it } from "vitest";

import { DEFAULT_VIEW, dashboardHref, isDashboardView, resolveView } from "./dashboard-view";

describe("isDashboardView", () => {
  it("accepts the two directions", () => {
    expect(isDashboardView("expense")).toBe(true);
    expect(isDashboardView("income")).toBe(true);
  });

  it("rejects anything else, including the shapes a URL can produce", () => {
    // `searchParams` hands us `string | string[] | undefined`, so all three of
    // these reach the guard in practice.
    expect(isDashboardView(undefined)).toBe(false);
    expect(isDashboardView(["expense"])).toBe(false);
    expect(isDashboardView("")).toBe(false);
    expect(isDashboardView("Expense")).toBe(false);
    expect(isDashboardView("both")).toBe(false);
    expect(isDashboardView(null)).toBe(false);
  });
});

describe("resolveView", () => {
  it("keeps a valid view", () => {
    expect(resolveView("income")).toBe("income");
    expect(resolveView("expense")).toBe("expense");
  });

  it("falls back instead of throwing", () => {
    // Same contract as `resolvePeriod`: a hand-edited URL renders the default
    // dashboard rather than an error page.
    expect(resolveView("nonsense")).toBe(DEFAULT_VIEW);
    expect(resolveView(undefined)).toBe(DEFAULT_VIEW);
    expect(resolveView(["income"])).toBe(DEFAULT_VIEW);
  });

  it("defaults to expenses", () => {
    expect(DEFAULT_VIEW).toBe("expense");
  });
});

describe("dashboardHref", () => {
  it("carries the period and the view", () => {
    expect(dashboardHref("month", "2026-08-01", "expense")).toBe(
      "/?period=month&anchor=2026-08-01&view=expense",
    );
    expect(dashboardHref("year", "2026-01-01", "income")).toBe(
      "/?period=year&anchor=2026-01-01&view=income",
    );
  });

  it("keeps `periodHref` as the only builder of the period pair", () => {
    // If the period URL shape ever changes, this is what catches the dashboard
    // being left behind — the prefix has to keep matching.
    const href = dashboardHref("week", "2026-08-17", "income");

    expect(href.startsWith("/?period=week&anchor=2026-08-17")).toBe(true);
    expect(href).toContain("&view=income");
  });
});
