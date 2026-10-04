import { describe, expect, it } from "vitest";

import { addDays, anomalyStep, dayOffset, headline, inkOn, pillText, rarityLine, rarityPhrase, temperatureColour, type City } from "./anomalyMap";

const BREAKS = [0.5, 1.5, 2.5, 3.5];

function city(overrides: Partial<City> = {}): City {
  return {
    city_id: "lon",
    name: "London",
    country: "United Kingdom",
    latitude: 51.5,
    longitude: -0.1,
    observed: true,
    observed_c: 24.3,
    baseline_c: 18.2,
    baseline_sigma: 2.4,
    baseline_observations: 459,
    anomaly_z_critical: 2.5,
    z: 2.54,
    departure_c: 6.1,
    is_anomaly: true,
    return_years: null,
    return_qualifier: null,
    return_is_reportable: null,
    tail_fitted: false,
    ...overrides,
  };
}

describe("anomalyStep", () => {
  it("does not paint exactly 2.5 in a flagged colour, as the warehouse does not flag it", () => {
    expect(anomalyStep(2.5, BREAKS, 4)).toBe(6);
    expect(anomalyStep(2.51, BREAKS, 4)).toBe(7);
  });
  it("mirrors the two arms around the neutral step", () => {
    expect(anomalyStep(0.2, BREAKS, 4)).toBe(4);
    expect(anomalyStep(-4, BREAKS, 4)).toBe(0);
    expect(anomalyStep(4, BREAKS, 4)).toBe(8);
  });
});

describe("rarityPhrase", () => {
  it("says how often below a year", () => {
    expect(rarityPhrase(0.25, true)).toBe("A day this city sees about 4 times a year");
    expect(rarityPhrase(0.05, true)).toBe("A day this city sees most weeks");
  });
  it("says one in how many years above one, and a floor where the fit is loose", () => {
    expect(rarityPhrase(4.2, true)).toBe("About a 1-in-4.2-year day here");
    expect(rarityPhrase(15.4, false)).toBe("At least a 1-in-15-year day here");
  });
});

describe("rarityLine", () => {
  it("stays silent where no tail was fitted, rather than calling the day ordinary", () => {
    expect(rarityLine(city({ return_years: 4, tail_fitted: false }))).toBeNull();
  });
});

describe("headline and pill", () => {
  it("leads with the departure", () => {
    expect(headline(city())).toBe("6.1°C warmer than usual");
    expect(pillText(city(), "anomaly")).toBe("+6.1°");
    expect(pillText(city(), "temperature")).toBe("24°");
  });
  it("tells a missing baseline from a missing observation", () => {
    expect(headline(city({ z: null, departure_c: null }))).toContain("not enough history");
    expect(headline(city({ z: null, departure_c: null, observed: false, observed_c: null }))).toBe("No measurement for this day");
    expect(pillText(city({ z: null, departure_c: null }), "anomaly")).toBe("—");
  });
});

describe("temperatureColour", () => {
  it("clamps at both ends and hits its stops", () => {
    expect(temperatureColour(-60)).toBe("#8e3dbd");
    expect(temperatureColour(60)).toBe("#a5162a");
    expect(temperatureColour(22)).toBe("#f2d64b");
  });
});

describe("dates", () => {
  it("round-trips across a month end", () => {
    expect(addDays("2024-01-30", 3)).toBe("2024-02-02");
    expect(dayOffset("2024-01-30", "2024-02-02")).toBe(3);
  });
});

describe("inkOn", () => {
  it("puts light text on dark grey and dark text on pale colours", () => {
    expect(inkOn("#5b5a56")).toBe("#ffffff");
    expect(inkOn("#f2b8a4")).toBe("#0d0d0d");
  });
});
