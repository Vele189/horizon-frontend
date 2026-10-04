import { describe, expect, it } from "vitest";

import { dailyEquivalent, percent, riskStep } from "./riskHorizon";

const BREAKS = [0.25, 0.5, 1, 2];

describe("riskStep", () => {
  it("counts a score equal to the threshold as the model saying yes", () => {
    expect(riskStep(0.1, 0.1, BREAKS)).toBe(3);
    expect(riskStep(0.0999, 0.1, BREAKS)).toBe(2);
    expect(riskStep(0.2, 0.1, BREAKS)).toBe(4);
    expect(riskStep(0, 0.1, BREAKS)).toBe(0);
  });
});

describe("dailyEquivalent", () => {
  it("composes back to the weekly threshold over seven days", () => {
    const h = dailyEquivalent(0.117, 7);
    expect(1 - (1 - h) ** 7).toBeCloseTo(0.117);
  });
});

describe("percent", () => {
  it("keeps a decimal only below one per cent", () => {
    expect(percent(0.117)).toBe("12%");
    expect(percent(0.007)).toBe("0.7%");
  });
});
