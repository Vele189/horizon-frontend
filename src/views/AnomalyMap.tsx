import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Schemas } from "../api/client";
import { useAnomalies, useEvents, useTheme } from "../api/hooks";
import { QueryState } from "../components/QueryState";
import {
  addDays,
  anomalyStep,
  dayOffset,
  headline,
  inkOn,
  longDate,
  pillColour,
  pillText,
  rarityLine,
  STEP_LABELS,
  TEMPERATURE_STOPS,
  type City,
  type Layer,
} from "./anomalyMap";

export const meta = {
  title: "Anomaly Map",
  nav: "Map",
  path: "/anomaly-map",
  question: "Where is it unusually hot or cold?",
  caption:
    "Each city is compared with its own normal for this time of year, built from every year on record. Pick a day on the timeline, or jump to a known heatwave or cold snap.",
};

const LAYERS: { id: Layer; label: string }[] = [
  { id: "anomaly", label: "Difference from normal" },
  { id: "temperature", label: "Temperature" },
];

// The map is always dark, as on the weather maps it borrows from: colour on a
// dark ground carries further, and the basemap stays out of the data's way.
const MODE = "dark";

export function AnomalyMap() {
  const [day, setDay] = useState<string | undefined>(undefined);
  const [layer, setLayer] = useState<Layer>("anomaly");
  const [selected, setSelected] = useState<string | null>(null);
  const [event, setEvent] = useState<Schemas["ValidationEvent"] | null>(null);

  const anomalies = useAnomalies(day);
  const theme = useTheme();
  const events = useEvents();

  const palette = theme.data?.[MODE];
  const data = anomalies.data;
  const city = data?.cities.find((c) => c.city_id === selected) ?? null;

  const jump = (picked: Schemas["ValidationEvent"] | null) => {
    setEvent(picked);
    if (!picked || !data) return;
    const { first_day, last_day } = data.coverage;
    const clamped = first_day && picked.date < first_day ? first_day : last_day && picked.date > last_day ? last_day : picked.date;
    setDay(clamped);
    setSelected(picked.city_id);
  };

  return (
    <section className="map-view" aria-label={meta.title}>
      <WorldMap
        cities={data?.cities ?? []}
        layer={layer}
        theme={theme.data}
        selected={selected}
        onSelect={setSelected}
      />

      <div className="panel panel-top-left">
        <h1>{meta.question}</h1>
        <p className="caption">{meta.caption}</p>
        <div role="radiogroup" aria-label="Map layer" className="segmented">
          {LAYERS.map((l) => (
            <button key={l.id} role="radio" aria-checked={layer === l.id} onClick={() => setLayer(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
        {events.data && events.data.length > 0 && (
          <label className="field">
            <span>Jump to a known extreme</span>
            <select
              value={event ? `${event.city_id}|${event.date}` : ""}
              onChange={(e) => jump(events.data.find((ev) => `${ev.city_id}|${ev.date}` === e.target.value) ?? null)}
            >
              <option value="">Choose an event…</option>
              {events.data.map((ev) => (
                <option key={`${ev.city_id}|${ev.date}`} value={`${ev.city_id}|${ev.date}`}>
                  {ev.city}, {longDate(ev.date)}
                </option>
              ))}
            </select>
          </label>
        )}
        {event && data?.day === event.date && <p className="event-note">{event.description}</p>}
      </div>

      {data && <Summary cities={data.cities} />}

      {palette && theme.data && <Legend layer={layer} ramp={palette.diverging} />}

      {city && theme.data && (
        <CityCard city={city} day={data!.day} theme={theme.data} onClose={() => setSelected(null)} />
      )}

      {data && <Timeline data={data} fetching={anomalies.isFetching} onDay={setDay} />}

      <div className="map-state">
        <QueryState queries={[anomalies, theme]}>{null}</QueryState>
      </div>
    </section>
  );
}

function WorldMap({
  cities,
  layer,
  theme,
  selected,
  onSelect,
}: {
  cities: City[];
  layer: Layer;
  theme: Schemas["Theme"] | undefined;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marks = useRef<L.LayerGroup | null>(null);
  const select = useRef(onSelect);
  const framed = useRef(false);
  const placed = useRef<{ marker: L.Marker; priority: number }[]>([]);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!node.current) return;
    const m = L.map(node.current, {
      center: [25, 10],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(m);
    const attribution =
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
      attribution,
      subdomains: "abcd",
    }).addTo(m);
    // Place names above the colour, so a glow never hides a coastline's label.
    m.createPane("labels");
    m.getPane("labels")!.style.zIndex = "450";
    m.getPane("labels")!.style.pointerEvents = "none";
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      pane: "labels",
      opacity: 0.6,
    }).addTo(m);
    marks.current = L.layerGroup().addTo(m);
    m.on("zoomend", () => declutter(placed.current));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const group = marks.current;
    if (!m || !group || !theme) return;
    group.clearLayers();
    placed.current = [];
    const palette = theme[MODE];

    for (const city of cities) {
      const colour = pillColour(city, layer, palette.diverging, theme.anomaly_breaks, theme.neutral_index);
      if (colour) {
        // A soft glow sized by how far from normal the city is. It belongs to
        // the city: fifteen points cannot honestly be smoothed into a field.
        const strength = layer === "anomaly" && city.z !== null ? Math.min(Math.abs(city.z), 4) : 1.5;
        L.circle([city.latitude, city.longitude], {
          radius: 250_000 + 220_000 * strength,
          stroke: false,
          fillColor: colour,
          fillOpacity: 0.28 + 0.08 * strength,
          interactive: false,
          className: "glow",
        }).addTo(group);
      }
      const icon = L.divIcon({
        className: "pill-anchor",
        iconSize: undefined,
        html:
          `<span class="pill${colour ? "" : " pill-empty"}${city.city_id === selected ? " pill-selected" : ""}"` +
          ` style="--pill:${colour ?? "transparent"};--pill-ink:${colour ? inkOn(colour) : "inherit"}">` +
          `<b>${pillText(city, layer)}</b><span>${escape(city.name)}</span></span>`,
      });
      const marker = L.marker([city.latitude, city.longitude], { icon, keyboard: true, title: city.name, riseOnHover: true })
        .on("click", () => select.current(city.city_id))
        .addTo(group);
      const priority = city.city_id === selected ? Infinity : Math.abs(city.z ?? -1);
      placed.current.push({ marker, priority });
    }

    if (!framed.current && cities.length) {
      framed.current = true;
      m.fitBounds(L.latLngBounds(cities.map((c) => [c.latitude, c.longitude])), { padding: [80, 80], maxZoom: 3 });
    }
    declutter(placed.current);
  }, [cities, layer, theme, selected]);

  return <div ref={node} className="map-canvas" />;
}

/**
 * Where two labels collide, the less unusual city drops its name and keeps
 * its number, as weather maps do. The most unusual cities keep both.
 */
function declutter(entries: { marker: L.Marker; priority: number }[]) {
  const pills = [...entries]
    .sort((a, b) => b.priority - a.priority)
    .map((e) => e.marker.getElement()?.querySelector<HTMLElement>(".pill"))
    .filter((el): el is HTMLElement => Boolean(el));
  for (const pill of pills) pill.classList.remove("pill-compact");
  const taken: DOMRect[] = [];
  const hits = (r: DOMRect) =>
    taken.some((t) => r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top);
  for (const pill of pills) {
    if (hits(pill.getBoundingClientRect())) pill.classList.add("pill-compact");
    taken.push(pill.getBoundingClientRect());
  }
}

function escape(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function Summary({ cities }: { cities: City[] }) {
  const flagged = cities.filter((c) => c.is_anomaly);
  const scored = cities.filter((c) => c.z !== null).length;
  return (
    <div className="panel panel-top-right summary">
      <p className="big">{flagged.length}</p>
      <p>{flagged.length === 1 ? "city with an extreme day" : "cities with an extreme day"}</p>
      {flagged.length > 0 && <p className="names">{flagged.map((c) => c.name).join(", ")}</p>}
      <p className="muted small">
        {scored} of {cities.length} cities measured against their normal
      </p>
    </div>
  );
}

function Legend({ layer, ramp }: { layer: Layer; ramp: readonly string[] }) {
  if (layer === "temperature") {
    const stops = [...TEMPERATURE_STOPS].reverse();
    const gradient = `linear-gradient(to bottom, ${stops.map(([, c]) => c).join(", ")})`;
    return (
      <div className="panel legend" aria-label="Temperature colour key">
        <p className="legend-title">°C</p>
        <div className="legend-body">
          <span className="legend-bar" style={{ background: gradient }} />
          <ul className="legend-ticks">
            {stops.map(([t]) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  // Warm at the top, as on a thermometer.
  const steps = ramp.map((colour, index) => ({ colour, label: STEP_LABELS[index] })).reverse();
  return (
    <div className="panel legend" aria-label="Colour key">
      <ul className="legend-steps">
        {steps.map((s) => (
          <li key={s.colour}>
            <span className="swatch" style={{ background: s.colour }} />
            {s.label}
          </li>
        ))}
        <li>
          <span className="swatch swatch-empty" />
          No data
        </li>
      </ul>
    </div>
  );
}

function CityCard({
  city,
  day,
  theme,
  onClose,
}: {
  city: City;
  day: string;
  theme: Schemas["Theme"];
  onClose: () => void;
}) {
  const ramp = theme[MODE].diverging;
  const step = city.z === null ? null : anomalyStep(city.z, theme.anomaly_breaks, theme.neutral_index);
  const rarity = rarityLine(city);
  return (
    <aside className="panel city-card" aria-label={`${city.name} details`}>
      <button className="close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <p className="muted">
        {city.country} · {longDate(day)}
      </p>
      <h2>{city.name}</h2>
      <p className="headline" style={step === null || step === theme.neutral_index ? undefined : { color: ramp[step] }}>
        {headline(city)}
      </p>
      {city.observed_c !== null && (
        <div className="readings">
          <div>
            <span className="muted">Measured</span>
            <b>{city.observed_c.toFixed(1)}°C</b>
          </div>
          {city.baseline_c !== null && (
            <div>
              <span className="muted">Usually</span>
              <b>{city.baseline_c.toFixed(1)}°C</b>
            </div>
          )}
        </div>
      )}
      {step !== null && (
        <p>
          <span className="tag" style={{ background: ramp[step], color: inkOn(ramp[step]!) }}>
            {STEP_LABELS[step]}
          </span>
          {city.is_anomaly && <span className="tag tag-outline">Extreme day</span>}
        </p>
      )}
      {rarity && <p>{rarity}.</p>}
      {city.baseline_sigma !== null && (
        <p className="muted small">
          On a typical day here the temperature swings about ±{city.baseline_sigma.toFixed(1)}°C around normal.
        </p>
      )}
    </aside>
  );
}

function Timeline({
  data,
  fetching,
  onDay,
}: {
  data: Schemas["AnomalyDay"];
  fetching: boolean;
  onDay: (day: string) => void;
}) {
  const first = data.coverage.first_day ?? data.day;
  const last = data.coverage.last_day ?? data.day;
  const span = Math.max(dayOffset(first, last), 0);
  const [scrub, setScrub] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const offset = scrub ?? dayOffset(first, data.day);
  const shown = addDays(first, offset);

  // Ask for the day the slider rests on, not every day it passes over.
  useEffect(() => {
    if (scrub === null) return;
    const timer = window.setTimeout(() => {
      onDay(addDays(first, scrub));
      setScrub(null);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [scrub, first, onDay]);

  // Play steps a day at a time, waiting for each day to arrive before the next,
  // and stops by itself on the last day.
  const atEnd = data.day >= last;
  const running = playing && !atEnd;
  useEffect(() => {
    if (!running || fetching) return;
    const timer = window.setTimeout(() => onDay(addDays(data.day, 1)), 900);
    return () => window.clearTimeout(timer);
  }, [running, fetching, data.day, onDay]);

  const togglePlay = () => {
    if (running) {
      setPlaying(false);
      return;
    }
    // Playing from the last day starts again a month back, not nowhere.
    if (atEnd) onDay(addDays(first, Math.max(span - 30, 0)));
    setPlaying(true);
  };

  const step = (days: number) => {
    const next = Math.min(Math.max(offset + days, 0), span);
    onDay(addDays(first, next));
  };

  const years = useMemo(() => {
    const a = Number(first.slice(0, 4));
    const b = Number(last.slice(0, 4));
    const out: { year: number; at: number }[] = [];
    const every = Math.max(1, Math.ceil((b - a) / 8));
    for (let y = a + 1; y <= b; y += every) out.push({ year: y, at: dayOffset(first, `${y}-01-01`) / (span || 1) });
    return out;
  }, [first, last, span]);

  return (
    <div className="panel timeline">
      <div className="timeline-buttons">
        <button onClick={() => step(-1)} aria-label="Previous day">
          ‹
        </button>
        <button onClick={togglePlay} aria-label={running ? "Pause" : "Play"} className="play">
          {running ? "❚❚" : "▶"}
        </button>
        <button onClick={() => step(1)} aria-label="Next day">
          ›
        </button>
      </div>
      <p className="timeline-day" aria-live="polite">
        {longDate(shown)}
        {fetching && <span className="spinner" aria-hidden="true" />}
      </p>
      <div className="timeline-track">
        <input
          type="range"
          min={0}
          max={span}
          value={offset}
          onChange={(e) => {
            setPlaying(false);
            setScrub(Number(e.target.value));
          }}
          aria-label="Day"
          aria-valuetext={longDate(shown)}
        />
        <div className="timeline-years" aria-hidden="true">
          {years.map((y) => (
            <span key={y.year} style={{ left: `${y.at * 100}%` }}>
              {y.year}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
