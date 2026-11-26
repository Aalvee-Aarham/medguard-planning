import { useEffect, useMemo, useRef, useState } from "react";
import { BpDial, EntryCard, TypeTile, hueVars } from "./entryArt";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  FlaskConical,
  Gauge,
  HeartPulse,
  Layers,
  Minus,
  PenLine,
  Pill,
  RefreshCw,
  ScanLine,
  Scissors,
  Share2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";
import { useApp, uid } from "../../state/store";
import { useT } from "../../i18n";
import {
  ActionBar,
  Button,
  cx,
  Input,
  Note,
  Textarea,
} from "../../components/ui";
import {
  ItemTags,
  NeedsInternet,
  SourceLabel,
  StatusChip,
} from "../../components/status";
import { ConfirmDialog } from "../../components/overlays";
import { EmptyState, Loadable } from "../../components/states";
import { CountUp, DocThumb } from "../../components/art";
import { TrendChart } from "../../components/TrendChart";
import {
  GlassHero,
  GlassPage,
  NeuStat,
  Panel,
  Segmented,
  TiltCard,
} from "../../components/glass";
import { useFakeLoad } from "../../mock/api";
import { fmtDate } from "../../lib/format";
import {
  gsap,
  useGSAP,
  MOTION_OK,
  prefersReduced,
  ScrollTrigger,
} from "../../lib/motion";
import { outOfRange } from "../home/bodyAreas";
import { TrendCard } from "./RecordOverview";
import { MedicineBuilder } from "./MedicineBuilder";
import { SECTIONS } from "./Record";
import type { RecordSection, SourceKind } from "../../mock/types";

const SOURCE_META: Record<
  SourceKind,
  { label: string; icon: LucideIcon; color: string }
> = {
  self: { label: "You", icon: User, color: "#1d5fbf" },
  doctor: { label: "Doctor", icon: Stethoscope, color: "#067647" },
  hospital: { label: "Hospital", icon: Building2, color: "#b54708" },
  ai: { label: "AI, confirmed", icon: Bot, color: "#174c99" },
};

const sectionIcon = (sec: RecordSection) =>
  SECTIONS.find((x) => x.key === sec)?.icon ??
  (sec === "allergies" ? AlertTriangle : ClipboardList);

/* ------------------------------------------------------------------ */
/* H27 Section list                                                    */
/* ------------------------------------------------------------------ */

/** H27 Section list: glass hero with stats, segmented filters, year-grouped tilting cards, a who-added-it breakdown and a by-year chart. */
export function SectionList() {
  const { section } = useParams();
  const { s, profile, can } = useApp();
  const t = useT();
  const meta = SECTIONS.find((x) => x.key === section);
  const [range, setRange] = useState<"all" | "year" | "month">("all");
  const [kind, setKind] = useState<"all" | SourceKind>("all");
  const { state, retry } = useFakeLoad("sec" + section);

  if (section === "tests") return <TestsSection />;

  const cutoff =
    range === "all" ? 0 : Date.now() - (range === "year" ? 365 : 30) * 86400000;
  const all = s.items
    .filter((i) => i.profileId === profile.id && i.section === section)
    .sort((a, b) => b.date.localeCompare(a.date));
  const items = all.filter(
    (i) =>
      new Date(i.date).getTime() >= cutoff &&
      (kind === "all" || i.source.kind === kind),
  );
  const admissions =
    section === "surgeries"
      ? s.admissions.filter((a) => a.profileId === profile.id)
      : [];
  const Icon = meta?.icon ?? ClipboardList;
  const bySource = (Object.keys(SOURCE_META) as SourceKind[])
    .map((k) => ({ k, n: all.filter((i) => i.source.kind === k).length }))
    .filter((x) => x.n);
  const byYear = Object.entries(
    all.reduce<Record<string, number>>(
      (a, i) => ((a[i.date.slice(0, 4)] = (a[i.date.slice(0, 4)] ?? 0) + 1), a),
      {},
    ),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, n]) => ({ year, n }));
  const latest = all[0];

  let year = "";
  return (
    <GlassPage deps={[section]}>
      <GlassHero
        icon={Icon}
        eyebrow={t("My Record")}
        title={t(meta?.label ?? "Records")}
        sub={
          latest
            ? t("Last updated {date}", { date: fmtDate(latest.date) })
            : undefined
        }
        actions={
          can("edit") && (
            <Button
              icon={PenLine}
              to={`/record/add?type=${section}`}
              className="rounded-2xl px-4"
            >
              {t("Add")}
            </Button>
          )
        }
      >
        <NeuStat
          icon={Layers}
          label={t("Entries")}
          value={all.length + admissions.length}
        />
        <NeuStat
          icon={Stethoscope}
          label={t("From doctors and hospitals")}
          value={
            all.filter(
              (i) => i.source.kind === "doctor" || i.source.kind === "hospital",
            ).length + admissions.length
          }
        />
        <NeuStat
          icon={ShieldCheck}
          label={t("AI, confirmed")}
          value={all.filter((i) => i.source.kind === "ai").length}
        />
        <NeuStat
          icon={CalendarDays}
          label={t("Latest")}
          text={latest ? fmtDate(latest.date) : "—"}
        />
      </GlassHero>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div
            data-rise
            className="mb-5 flex flex-col items-start gap-3 [&>*]:max-w-full"
          >
            <Segmented
              label={t("Date")}
              value={range}
              onChange={setRange}
              options={[
                { value: "all", label: t("Any time") },
                { value: "year", label: t("Last 12 months") },
                { value: "month", label: t("Last 30 days") },
              ]}
            />
            <Segmented
              label={t("Added by")}
              value={kind}
              onChange={setKind}
              options={[
                {
                  value: "all" as const,
                  label: t("Anyone"),
                  count: all.length,
                },
                ...(Object.keys(SOURCE_META) as SourceKind[]).map((k) => ({
                  value: k,
                  label: t(SOURCE_META[k].label),
                  icon: SOURCE_META[k].icon,
                  count: all.filter((i) => i.source.kind === k).length,
                })),
              ]}
            />
          </div>

          <Loadable state={state} retry={retry}>
            <ol className="flex flex-col gap-4">
              {admissions.map((a) => (
                <li key={a.id} data-rise>
                  <TiltCard to={`/admissions/${a.id}`}>
                    <div className="flex items-start gap-4">
                      <span className="skeuo-icon grid size-12 shrink-0 place-items-center rounded-2xl">
                        <Building2
                          className="size-6"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-h3 font-semibold">{a.hospital}</p>
                        <p className="text-small text-ink-700 tabular">
                          {a.ward} · {fmtDate(a.from)} –{" "}
                          {a.to ? fmtDate(a.to) : t("now")}
                        </p>
                        <SourceLabel source={a.source} className="mt-2" />
                      </div>
                      <Arrow />
                    </div>
                  </TiltCard>
                </li>
              ))}
              {items.map((i) => {
                const y = i.date.slice(0, 4);
                const head = y !== year;
                year = y;
                return (
                  <li key={i.id} data-rise>
                    {head && <YearPill year={y} />}
                    <TiltCard
                      to={
                        i.documentId
                          ? `/documents/${i.documentId}`
                          : `/record/items/${i.id}/edit`
                      }
                    >
                      <div className="flex items-start gap-4">
                        <span className="neu-inset flex w-16 shrink-0 flex-col items-center rounded-2xl py-2 text-center tabular">
                          <span className="text-h2 leading-none font-bold text-primary-700">
                            {new Date(i.date).getDate()}
                          </span>
                          <span className="text-caption font-semibold text-ink-700 uppercase">
                            {new Date(i.date).toLocaleString("en", {
                              month: "short",
                            })}
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="text-h3 font-semibold">{i.title}</p>
                            <ItemTags item={i} />
                          </div>
                          {i.detail && (
                            <p className="mt-0.5 text-body text-ink-700">
                              {i.detail}
                            </p>
                          )}
                          <SourceLabel source={i.source} className="mt-2" />
                        </div>
                        {i.documentId ? (
                          <DocThumb
                            seed={
                              s.documents.find((d) => d.id === i.documentId)
                                ?.seed ?? 1
                            }
                            className="hidden h-16 w-12 shrink-0 drop-shadow-md sm:block"
                          />
                        ) : (
                          <Arrow />
                        )}
                      </div>
                    </TiltCard>
                  </li>
                );
              })}
              {!items.length && !admissions.length && (
                <EmptyState
                  text={t("Nothing matches these filters.")}
                  art="search"
                />
              )}
            </ol>
          </Loadable>
        </div>

        <aside className="flex flex-col gap-5">
          {bySource.length > 0 && (
            <Panel neu title={t("Who added these")}>
              <div className="neu-inset flex h-4 overflow-hidden rounded-full p-0.5">
                {bySource.map((x) => (
                  <span
                    key={x.k}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${(x.n / all.length) * 100}%`,
                      background: SOURCE_META[x.k].color,
                    }}
                  />
                ))}
              </div>
              <ul className="mt-4 flex flex-col gap-2">
                {bySource.map((x) => {
                  const M = SOURCE_META[x.k];
                  return (
                    <li
                      key={x.k}
                      className="flex items-center gap-3 text-small"
                    >
                      <span
                        className="grid size-8 place-items-center rounded-xl text-white"
                        style={{ background: M.color }}
                      >
                        <M.icon
                          className="size-4"
                          strokeWidth={2}
                          aria-hidden
                        />
                      </span>
                      <span className="flex-1 text-ink-700">{t(M.label)}</span>
                      <span className="font-semibold tabular">
                        {Math.round((x.n / all.length) * 100)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
          {byYear.length > 0 && (
            <Panel title={t("Entries by year")}>
              <div
                className="h-40"
                role="img"
                aria-label={byYear.map((y) => `${y.year}: ${y.n}`).join(", ")}
              >
                <ResponsiveContainer>
                  <BarChart
                    data={byYear}
                    margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="bar-g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#1d5fbf" />
                        <stop offset="1" stopColor="#174c99" />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="year"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "#475467" }}
                    />
                    <YAxis
                      hide
                      allowDecimals={false}
                      domain={[0, (m: number) => Math.max(m + 1, 3)]}
                    />
                    <Tooltip
                      cursor={{ fill: "#eaf2fd" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e3e9f1",
                        fontSize: 14,
                      }}
                    />
                    <Bar
                      dataKey="n"
                      name={t("Entries")}
                      radius={[8, 8, 8, 8]}
                      fill="url(#bar-g)"
                      isAnimationActive={!prefersReduced()}
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}
          {can("edit") && (
            <Link
              data-rise
              to={`/record/add?type=${section}`}
              className="neu neu-press group flex items-center gap-4 rounded-[24px] p-4"
            >
              <span className="skeuo-icon grid size-12 shrink-0 place-items-center rounded-2xl transition-transform group-hover:rotate-90">
                <Sparkles className="size-6" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">
                  {t("Add something new")}
                </span>
                <span className="block text-small text-ink-700">
                  {t("Type it in or upload a report.")}
                </span>
              </span>
              <ArrowRight className="size-5 text-primary-600" aria-hidden />
            </Link>
          )}
        </aside>
      </div>
    </GlassPage>
  );
}

function Arrow() {
  return (
    <span
      aria-hidden
      className="neu grid size-10 shrink-0 place-items-center rounded-full text-ink-500 transition-colors group-hover:text-primary-600"
    >
      <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </span>
  );
}

function YearPill({ year }: { year: string }) {
  return (
    <p className="mb-3 flex items-center gap-3 text-small font-bold text-primary-700 tabular">
      <span className="glass rounded-full px-3 py-1">{year}</span>
      <span
        aria-hidden
        className="h-px flex-1 bg-gradient-to-r from-primary-100 to-transparent"
      />
    </p>
  );
}

/** Tests section: summary hero + one glass trend card per test. */
function TestsSection() {
  const { s, profile } = useApp();
  const t = useT();
  const { state, retry } = useFakeLoad("sectests");
  const tests = s.tests.filter((x) => x.profileId === profile.id);
  const outs = tests.filter(outOfRange).length;
  const readings = tests.reduce((a, x) => a + x.points.length, 0);
  return (
    <GlassPage>
      <GlassHero
        icon={FlaskConical}
        eyebrow={t("My Record")}
        title={t("Test results")}
        sub={t("Tap a result to see every reading.")}
      >
        <NeuStat icon={FlaskConical} label={t("Tests")} value={tests.length} />
        <NeuStat icon={Activity} label={t("Readings")} value={readings} />
        <NeuStat
          icon={AlertTriangle}
          label={t("Out of range")}
          value={outs}
          tone={outs ? "danger" : undefined}
        />
        <NeuStat
          icon={ShieldCheck}
          label={t("In range")}
          value={tests.length - outs}
          tone="success"
        />
      </GlassHero>
      <Loadable state={state} retry={retry}>
        {tests.length ? (
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tests.map((x) => (
              <li key={x.id} data-rise>
                <TrendCard test={x} linkable />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState text={t("No test results yet.")} art="docs" />
        )}
      </Loadable>
    </GlassPage>
  );
}

/* ------------------------------------------------------------------ */
/* H28 Test detail                                                     */
/* ------------------------------------------------------------------ */

/** H28 Test result detail: hero stats, a range gauge whose needle swings to the value, the trend chart and a reading timeline with deltas. */
export function TestDetail() {
  const { id } = useParams();
  const { s } = useApp();
  const t = useT();
  const x = s.tests.find((y) => y.id === id);
  if (!x)
    return (
      <GlassPage>
        <GlassHero title={t("Not found")} />
      </GlassPage>
    );
  const last = x.points[x.points.length - 1];
  const prev = x.points[x.points.length - 2];
  const out = outOfRange(x);
  const diff = prev ? +(last.value - prev.value).toFixed(1) : 0;
  const vals = x.points.map((p) => p.value);
  const avg = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  const rev = [...x.points].reverse();
  return (
    <GlassPage deps={[id]}>
      <GlassHero
        icon={FlaskConical}
        tone={out ? "danger" : "primary"}
        eyebrow={t("Test result")}
        title={t(x.name)}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            {t("Latest")} · {fmtDate(last.date)}{" "}
            {out ? (
              <StatusChip status="missed" label={t("Out of range")} />
            ) : (
              <StatusChip status="taken" label={t("In range")} />
            )}
          </span>
        }
      >
        <NeuStat
          icon={Gauge}
          label={t("Latest")}
          value={last.value}
          suffix={x.unit}
          tone={out ? "danger" : "success"}
        />
        <NeuStat
          icon={ShieldCheck}
          label={t("Normal range")}
          text={`${x.low}–${x.high}`}
          suffix={x.unit}
        />
        <NeuStat
          icon={diff < 0 ? ArrowDownRight : diff > 0 ? ArrowUpRight : Minus}
          label={t("Change since last")}
          text={prev ? `${diff > 0 ? "+" : ""}${diff}` : "—"}
          suffix={prev ? x.unit : undefined}
        />
        <NeuStat
          icon={Activity}
          label={t("Average")}
          value={avg}
          suffix={x.unit}
        />
      </GlassHero>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title={t("Over time")}>
            <TrendChart
              points={x.points}
              low={x.low}
              high={x.high}
              unit={x.unit}
              height="h-72"
            />
            <p className="mt-3 flex flex-wrap items-center gap-4 text-small text-ink-700">
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-6 rounded-sm bg-primary-50 ring-1 ring-primary-100"
                  aria-hidden
                />{" "}
                {t("Normal range")}
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-full bg-danger-text"
                  aria-hidden
                />{" "}
                {t("Out of range")}
              </span>
            </p>
          </Panel>

          <Panel title={t("All readings")}>
            <ol className="relative flex flex-col gap-2">
              <span
                aria-hidden
                className="absolute top-6 bottom-6 left-[19px] w-0.5 bg-gradient-to-b from-primary-600 via-primary-100 to-transparent"
              />
              {rev.map((p, i) => {
                const before = rev[i + 1];
                const d = before ? +(p.value - before.value).toFixed(1) : null;
                const o = p.value < x.low || p.value > x.high;
                const row = (
                  <>
                    <span
                      className={cx(
                        "glow-node relative z-10 grid size-10 shrink-0 place-items-center rounded-full text-white",
                        o ? "bg-danger-text" : "skeuo-icon",
                      )}
                    >
                      {o ? (
                        <AlertTriangle
                          className="size-4"
                          strokeWidth={2}
                          aria-hidden
                        />
                      ) : (
                        <Check
                          className="size-4"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cx(
                          "block text-h3 font-bold tabular",
                          o && "text-danger-text",
                        )}
                      >
                        {p.value}{" "}
                        <span className="text-small font-semibold">
                          {x.unit}
                        </span>
                      </span>
                      <span className="block text-caption text-ink-700 tabular">
                        {fmtDate(p.date)}
                      </span>
                    </span>
                    {d !== null && (
                      <span
                        className={cx(
                          "rounded-full px-2 py-0.5 text-caption font-semibold tabular",
                          d === 0
                            ? "bg-neutral-bg text-neutral-text"
                            : "bg-primary-50 text-primary-700",
                        )}
                      >
                        {d > 0 ? "▲" : d < 0 ? "▼" : "•"} {Math.abs(d)}
                      </span>
                    )}
                    {p.documentId && (
                      <FileText
                        className="size-5 text-primary-600"
                        aria-label={t("Document")}
                      />
                    )}
                  </>
                );
                return (
                  <li key={p.date}>
                    {p.documentId ? (
                      <Link
                        to={`/documents/${p.documentId}`}
                        className="flex items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-white/70"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-4 p-2">{row}</div>
                    )}
                  </li>
                );
              })}
            </ol>
            <SourceLabel source={x.source} className="mt-3" />
          </Panel>
        </div>

        <aside className="flex flex-col gap-6">
          <Panel neu title={t("Where it sits")}>
            <RangeGauge
              value={last.value}
              low={x.low}
              high={x.high}
              unit={x.unit}
              values={vals}
            />
          </Panel>
          <Panel neu title={t("Range")}>
            <RangeBar
              value={last.value}
              low={x.low}
              high={x.high}
              values={vals}
              unit={x.unit}
            />
          </Panel>
        </aside>
      </div>
    </GlassPage>
  );
}

/** Semicircle gauge: track, green normal band, needle that swings in (GSAP). Status still told in words below. */
function RangeGauge({
  value,
  low,
  high,
  unit,
  values,
}: {
  value: number;
  low: number;
  high: number;
  unit: string;
  values: number[];
}) {
  const t = useT();
  const needle = useRef<SVGGElement>(null);
  const min = Math.min(low, ...values);
  const max = Math.max(high, ...values);
  const pad = (max - min) * 0.25 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const ang = (v: number) => 180 - ((v - lo) / (hi - lo)) * 180;
  const pt = (a: number, r: number) => [
    100 + r * Math.cos((a * Math.PI) / 180),
    100 - r * Math.sin((a * Math.PI) / 180),
  ];
  const arc = (a1: number, a2: number, r: number) => {
    const [x1, y1] = pt(a1, r);
    const [x2, y2] = pt(a2, r);
    return `M${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2}`;
  };
  const out = value < low || value > high;
  const rot = 90 - ang(value);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo(
        needle.current,
        { rotate: -90, svgOrigin: "100 100" },
        {
          rotate: rot,
          svgOrigin: "100 100",
          duration: 1.4,
          ease: "elastic.out(1, 0.55)",
          delay: 0.3,
        },
      );
    });
    return () => mm.revert();
  }, [rot]);
  return (
    <figure
      aria-label={`${value} ${unit}. ${t("Normal range")} ${low}–${high} ${unit}.`}
    >
      <svg viewBox="0 0 200 120" className="w-full" aria-hidden>
        <defs>
          <linearGradient id="g-track" x1="0" x2="1">
            <stop offset="0" stopColor="#fda29b" />
            <stop offset="0.5" stopColor="#d6e6fb" />
            <stop offset="1" stopColor="#fda29b" />
          </linearGradient>
        </defs>
        <path
          d={arc(180, 0, 80)}
          fill="none"
          stroke="url(#g-track)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d={arc(ang(low), ang(high), 80)}
          fill="none"
          stroke="#75e0a7"
          strokeWidth="16"
        />
        {Array.from({ length: 19 }, (_, i) => {
          const a = 180 - i * 10;
          const [x1, y1] = pt(a, 62);
          const [x2, y2] = pt(a, i % 3 ? 66 : 70);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#7b8ba1"
              strokeWidth="1"
              opacity="0.6"
            />
          );
        })}
        <g ref={needle} transform={`rotate(${rot} 100 100)`}>
          <path
            d="M97,100 L100,28 L103,100 Z"
            fill={out ? "#b42318" : "#174c99"}
          />
        </g>
        <circle
          cx="100"
          cy="100"
          r="9"
          fill="#ffffff"
          stroke={out ? "#b42318" : "#174c99"}
          strokeWidth="4"
        />
      </svg>
      <figcaption className="-mt-2 text-center">
        <span
          className={cx(
            "block text-display font-bold tabular",
            out ? "text-danger-text" : "text-success-text",
          )}
        >
          <CountUp value={value} decimals={value % 1 ? 1 : 0} />{" "}
          <span className="text-small font-semibold">{unit}</span>
        </span>
        <span className="text-small text-ink-700">
          {out
            ? value > high
              ? t("Above the normal range")
              : t("Below the normal range")
            : t("Inside the normal range")}
        </span>
      </figcaption>
    </figure>
  );
}

/** Horizontal range bar with every past reading as a dot and the latest as a big marker. */
function RangeBar({
  value,
  low,
  high,
  values,
  unit,
}: {
  value: number;
  low: number;
  high: number;
  values: number[];
  unit: string;
}) {
  const min = Math.min(low, ...values);
  const max = Math.max(high, ...values);
  const pad = (max - min) * 0.15 || 1;
  const pos = (v: number) =>
    `${((v - (min - pad)) / (max - min + 2 * pad)) * 100}%`;
  return (
    <div className="pt-6 pb-2" aria-hidden>
      <div className="neu-inset relative h-4 rounded-full">
        <span
          className="absolute inset-y-0.5 rounded-full bg-success-border"
          style={{ left: pos(low), right: `calc(100% - ${pos(high)})` }}
        />
        {values.slice(0, -1).map((v, i) => (
          <span
            key={i}
            className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-600/50"
            style={{ left: pos(v) }}
          />
        ))}
        <span
          className="skeuo-icon absolute top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ring-4 ring-white"
          style={{ left: pos(value) }}
        />
        <span
          className="absolute -top-6 -translate-x-1/2 rounded-md bg-ink-900 px-1.5 text-caption font-semibold text-white tabular"
          style={{ left: pos(value) }}
        >
          {value}
        </span>
      </div>
      <div className="relative mt-2 h-5 text-caption text-ink-700 tabular">
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap"
          style={{ left: pos(low) }}
        >
          {low} {unit}
        </span>
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap"
          style={{ left: pos(high) }}
        >
          {high} {unit}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* H29 Document viewer                                                 */
/* ------------------------------------------------------------------ */

const DOC_KIND: Record<string, string> = {
  prescription: "Prescription",
  report: "Report",
  imaging: "Imaging",
  discharge: "Discharge summary",
  other: "Document",
};

/** H29 Document viewer: a 3D stack of pages that tilts, an AI scan sweep, read fields with confidence meters, and actions in a raised panel. */
export function DocumentViewer() {
  const { id } = useParams();
  const { s, mutate, can, online, toast } = useApp();
  const t = useT();
  const nav = useNavigate();
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState(0);
  const d = s.documents.find((x) => x.id === id);
  if (!d)
    return (
      <GlassPage>
        <GlassHero title={t("Document not found")} />
        <EmptyState text={t("It may have been deleted.")} />
      </GlassPage>
    );
  const avg = d.extracted.length
    ? Math.round(
        (d.extracted.reduce((a, e) => a + e.confidence, 0) /
          d.extracted.length) *
          100,
      )
    : 0;
  const linked = s.items.filter((i) => i.documentId === d.id);
  return (
    <GlassPage deps={[id]}>
      <GlassHero
        icon={FileText}
        eyebrow={t(DOC_KIND[d.kind] ?? "Document")}
        title={d.title}
        sub={<SourceLabel source={d.source} />}
      >
        <NeuStat icon={CalendarDays} label={t("Date")} text={fmtDate(d.date)} />
        <NeuStat icon={Layers} label={t("Pages")} value={d.pages} />
        <NeuStat
          icon={ScanLine}
          label={t("Items read")}
          value={d.extracted.length}
        />
        <NeuStat
          icon={ShieldCheck}
          label={t("Read confidence")}
          value={avg}
          suffix="%"
          tone="success"
        />
      </GlassHero>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <DocStage
          seed={d.seed}
          pages={d.pages}
          scanKey={scan}
          label={t("{n} pages", { n: d.pages })}
        />

        <div className="flex flex-col gap-6">
          <Panel title={t("What was read")}>
            <ul className="flex flex-col gap-3">
              {d.extracted.map((e, i) => (
                <li
                  key={i}
                  data-rise
                  className="rounded-2xl border border-white/70 bg-white/60 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-caption font-semibold tracking-wide text-ink-500 uppercase">
                        {t(e.label)}
                      </p>
                      <p className="font-semibold">{e.value}</p>
                    </div>
                    <StatusChip status="confirmed" />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="neu-inset h-2 flex-1 overflow-hidden rounded-full">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-primary-600 to-success-text"
                        style={{ width: `${Math.round(e.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-caption font-semibold text-ink-700 tabular">
                      {Math.round(e.confidence * 100)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {linked.length > 0 && (
              <>
                <p className="mt-4 mb-2 text-caption font-semibold tracking-wide text-ink-500 uppercase">
                  {t("In your record")}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {linked.map((i) => {
                    const I = sectionIcon(i.section);
                    return (
                      <li key={i.id}>
                        <Link
                          to={`/record/${i.section}`}
                          className="glass glass-pill inline-flex min-h-10 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-small font-semibold"
                        >
                          <span className="skeuo-icon grid size-8 place-items-center rounded-full">
                            <I className="size-4" strokeWidth={2} aria-hidden />
                          </span>
                          {i.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Panel>

          <Panel neu title={t("Actions")}>
            <div className="flex flex-col gap-2">
              {can("share") && (
                <Button
                  full
                  variant="secondary"
                  icon={Share2}
                  to="/share/doctor"
                >
                  {t("Share with a doctor")}
                </Button>
              )}
              <Button
                full
                variant="secondary"
                icon={RefreshCw}
                loading={busy}
                disabled={!online}
                onClick={() => {
                  setBusy(true);
                  setScan((n) => n + 1);
                  setTimeout(() => {
                    setBusy(false);
                    toast(t("Read again. Nothing changed."));
                  }, 1600);
                }}
              >
                {t("Re-read with AI")}
              </Button>
              {!online && <NeedsInternet />}
              {can("delete") && (
                <Button
                  full
                  variant="tertiary"
                  icon={Trash2}
                  className="text-danger-text"
                  onClick={() => setDel(true)}
                >
                  {t("Delete document")}
                </Button>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={del}
        onClose={() => setDel(false)}
        title={t("Delete this document?")}
        body={t(
          "Items read from it stay in the record, but the original will be gone.",
        )}
        confirmLabel={t("Delete")}
        destructive
        onConfirm={() => {
          mutate((x) => {
            x.documents = x.documents.filter((y) => y.id !== d.id);
            x.accessLog.unshift({
              id: uid("l"),
              profileId: d.profileId,
              who: t("You"),
              action: "edited",
              at: new Date().toISOString(),
              reason: "Deleted document",
            });
          });
          toast(t("Document deleted"));
          nav(-1);
        }}
      />
    </GlassPage>
  );
}

/** Paper stack on a pressed-in stage. Tilts with the pointer; a scan beam sweeps once on load and on each re-read. */
function DocStage({
  seed,
  pages,
  scanKey,
  label,
}: {
  seed: number;
  pages: number;
  scanKey: number;
  label: string;
}) {
  const beam = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo(
        beam.current,
        { top: "0%", opacity: 1 },
        {
          top: "100%",
          duration: 1.4,
          ease: "power1.inOut",
          repeat: 1,
          yoyo: true,
          onComplete: () => void gsap.set(beam.current, { opacity: 0 }),
        },
      );
    });
    return () => mm.revert();
  }, [scanKey]);
  const layers = Math.min(Math.max(pages, 1), 3);
  return (
    <section
      data-rise
      className="neu-inset relative grid min-h-[420px] place-items-center overflow-hidden rounded-[28px] p-8 lg:min-h-[560px]"
    >
      <div aria-hidden className="hero-grid absolute inset-0 opacity-70" />
      <TiltCard
        max={10}
        className="relative !border-0 !bg-transparent !p-0 !shadow-none"
      >
        <div className="relative">
          {Array.from({ length: layers - 1 }, (_, i) => (
            <div
              key={i}
              aria-hidden
              className="absolute inset-0"
              style={{
                transform: `translate(${(i + 1) * 14}px, ${(i + 1) * 10}px) rotate(${(i + 1) * 3}deg)`,
              }}
            >
              <DocThumb
                seed={seed + i + 1}
                rotate={false}
                className="h-80 w-auto opacity-80 drop-shadow-xl lg:h-[440px]"
              />
            </div>
          ))}
          <div className="pop relative overflow-hidden rounded-md">
            <DocThumb
              seed={seed}
              rotate={false}
              className="relative h-80 w-auto drop-shadow-2xl lg:h-[440px]"
            />
            <span
              ref={beam}
              aria-hidden
              className="pointer-events-none absolute inset-x-0 h-12 -translate-y-1/2 bg-gradient-to-b from-transparent via-primary-600/30 to-transparent opacity-0"
            >
              <span className="absolute inset-x-0 top-1/2 h-0.5 bg-primary-600 shadow-[0_0_12px_2px_rgba(29,95,191,0.6)]" />
            </span>
          </div>
        </div>
      </TiltCard>
      <p className="glass absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-small font-semibold text-ink-700">
        {label}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* H31 Timeline                                                        */
/* ------------------------------------------------------------------ */

type TlKind = "record" | "document" | "hospital";

/** H31 Timeline: glass hero, type filter, a glowing spine that fills as you scroll, alternating cards on desktop. */
export function Timeline() {
  const { s, profile } = useApp();
  const t = useT();
  const { state, retry } = useFakeLoad("tl");
  const [kind, setKind] = useState<"all" | TlKind>("all");
  const spine = useRef<HTMLSpanElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const ev = useMemo(
    () =>
      [
        ...s.items
          .filter((i) => i.profileId === profile.id)
          .map((i) => ({
            id: i.id,
            at: i.date,
            icon: sectionIcon(i.section),
            title: i.title,
            detail: i.detail,
            src: i.source,
            to: `/record/${i.section}`,
            kind: "record" as TlKind,
            tag:
              SECTIONS.find((x) => x.key === i.section)?.label ??
              (i.section === "allergies" ? "Allergies" : "Records"),
          })),
        ...s.documents
          .filter((d) => d.profileId === profile.id)
          .map((d) => ({
            id: d.id,
            at: d.date,
            icon: FileText,
            title: d.title,
            detail: undefined as string | undefined,
            src: d.source,
            to: `/documents/${d.id}`,
            kind: "document" as TlKind,
            tag: "Documents",
            seed: d.seed,
          })),
        ...s.admissions
          .filter((a) => a.profileId === profile.id)
          .map((a) => ({
            id: a.id,
            at: a.from,
            icon: Building2,
            title: t("Admitted to {h}", { h: a.hospital }),
            detail: a.ward,
            src: a.source,
            to: `/admissions/${a.id}`,
            kind: "hospital" as TlKind,
            tag: "Hospital",
          })),
      ].sort((a, b) => b.at.localeCompare(a.at)),
    [s, profile.id, t],
  );
  const shown = ev.filter((e) => kind === "all" || e.kind === kind);
  const years = new Set(ev.map((e) => e.at.slice(0, 4)));
  const span = ev.length
    ? `${ev[ev.length - 1].at.slice(0, 4)}–${ev[0].at.slice(0, 4)}`
    : "—";

  // Spine fills with scroll progress through the list
  useGSAP(
    () => {
      if (state !== "ok" || !spine.current || !list.current) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          spine.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            transformOrigin: "top",
            scrollTrigger: {
              trigger: list.current,
              start: "top 70%",
              end: "bottom 70%",
              scrub: true,
            },
          },
        );
        gsap.utils.toArray<HTMLElement>("[data-tl]").forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            x: el.dataset.tl === "l" ? -30 : 30,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: list, dependencies: [state, kind, shown.length] },
  );
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [kind]);

  let year = "";
  return (
    <GlassPage>
      <GlassHero
        icon={CalendarClock}
        eyebrow={t("My Record")}
        title={t("Timeline")}
        sub={t("Everything in {name}’s record, newest first.", {
          name: profile.name,
        })}
      >
        <NeuStat icon={Layers} label={t("Events")} value={ev.length} />
        <NeuStat icon={CalendarDays} label={t("Years")} text={span} />
        <NeuStat
          icon={FileText}
          label={t("Documents")}
          value={ev.filter((e) => e.kind === "document").length}
        />
        <NeuStat
          icon={Building2}
          label={t("Hospital stays")}
          value={ev.filter((e) => e.kind === "hospital").length}
        />
      </GlassHero>

      <div data-rise className="mb-6 flex justify-center">
        <Segmented
          label={t("Show")}
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: t("All"), count: ev.length },
            {
              value: "record",
              label: t("Records"),
              icon: ClipboardList,
              count: ev.filter((e) => e.kind === "record").length,
            },
            {
              value: "document",
              label: t("Documents"),
              icon: FileText,
              count: ev.filter((e) => e.kind === "document").length,
            },
            {
              value: "hospital",
              label: t("Hospital"),
              icon: Building2,
              count: ev.filter((e) => e.kind === "hospital").length,
            },
          ]}
        />
      </div>

      <Loadable state={state} retry={retry}>
        {shown.length === 0 ? (
          <EmptyState text={t("Nothing matches these filters.")} art="search" />
        ) : (
          <ol
            ref={list}
            className="relative mx-auto max-w-5xl pb-4"
            aria-label={t("{n} years", { n: years.size })}
          >
            <span
              aria-hidden
              className="absolute top-0 bottom-0 left-5 w-1 -translate-x-1/2 rounded-full bg-primary-100/70 lg:left-1/2"
            />
            <span
              ref={spine}
              aria-hidden
              className="absolute top-0 bottom-0 left-5 w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-success-text via-primary-600 to-primary-700 shadow-[0_0_14px_rgba(29,95,191,0.5)] lg:left-1/2"
            />
            {shown.map((e, i) => {
              const y = e.at.slice(0, 4);
              const head = y !== year;
              year = y;
              const left = i % 2 === 0;
              return (
                <li key={e.id} className="relative">
                  {head && (
                    <p className="relative z-10 mb-4 flex pt-2 lg:justify-center">
                      <span className="skeuo-icon rounded-full px-4 py-1 text-small font-bold tabular">
                        {y}
                      </span>
                    </p>
                  )}
                  <div
                    className={cx(
                      "relative mb-5 pl-14 lg:w-1/2 lg:pl-0",
                      left ? "lg:pr-12" : "lg:ml-auto lg:pl-12",
                      !head && i > 0 && "lg:-mt-16",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cx(
                        "skeuo-icon glow-node absolute top-4 left-5 z-10 grid size-10 -translate-x-1/2 place-items-center rounded-full",
                        left
                          ? "lg:right-0 lg:left-auto lg:translate-x-1/2"
                          : "lg:left-0",
                      )}
                    >
                      <e.icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <div data-tl={left ? "l" : "r"}>
                      <TiltCard to={e.to}>
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-caption font-semibold text-primary-700">
                                {t(e.tag)}
                              </span>
                              <span className="text-caption text-ink-700 tabular">
                                {fmtDate(e.at)}
                              </span>
                            </p>
                            <p className="text-h3 font-semibold">{e.title}</p>
                            {e.detail && (
                              <p className="text-small text-ink-700">
                                {e.detail}
                              </p>
                            )}
                            <SourceLabel source={e.src} className="mt-2" />
                          </div>
                          {"seed" in e && typeof e.seed === "number" ? (
                            <DocThumb
                              seed={e.seed}
                              className="h-16 w-12 shrink-0 drop-shadow-md"
                            />
                          ) : (
                            <Arrow />
                          )}
                        </div>
                      </TiltCard>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Loadable>
    </GlassPage>
  );
}

/* ------------------------------------------------------------------ */
/* H24 Manual entry                                                    */
/* ------------------------------------------------------------------ */

const TYPES: { v: string; l: string; icon: LucideIcon; hint: string }[] = [
  {
    v: "conditions",
    l: "Condition",
    icon: HeartPulse,
    hint: "Diabetes, asthma, high blood pressure",
  },
  {
    v: "allergy",
    l: "Allergy",
    icon: AlertTriangle,
    hint: "Medicines, foods, anything else",
  },
  {
    v: "medicines",
    l: "Medicine",
    icon: Pill,
    hint: "Name, dose and time for reminders",
  },
  {
    v: "vitals",
    l: "Vital reading",
    icon: Activity,
    hint: "Blood pressure from home",
  },
  {
    v: "surgeries",
    l: "Surgery",
    icon: Scissors,
    hint: "Operations and procedures",
  },
  {
    v: "vaccination",
    l: "Vaccination",
    icon: Syringe,
    hint: "Vaccines and boosters",
  },
];

/** H24 Manual entry: big glossy type tiles, a glass form, and a live preview of how the entry will look. Source = "Entered by you". Works offline (queued). */
export function ManualEntry() {
  const { profile, mutate, toast, queueIfOffline, s } = useApp();
  const t = useT();
  const nav = useNavigate();
  const [q] = useSearchParams();
  const init =
    q.get("type") === "vaccinations"
      ? "vaccination"
      : q.get("type") === "allergies"
        ? "allergy"
        : (q.get("type") ?? "conditions");
  const [type, setType] = useState(
    TYPES.some((x) => x.v === init) ? init : "conditions",
  );
  const [f, setF] = useState({
    name: "",
    detail: "",
    date: new Date().toISOString().slice(0, 10),
    dose: "",
    time: "08:00",
    sys: "",
    dia: "",
  });
  const [err, setErr] = useState("");
  const allergyClash =
    type === "medicines" &&
    s.items.some(
      (i) =>
        i.profileId === profile.id &&
        i.section === "allergies" &&
        f.name &&
        /cillin/i.test(f.name) &&
        /penicillin/i.test(i.title),
    );
  const cur = TYPES.find((x) => x.v === type)!;
  const typeTiles = (
    <section data-rise aria-label={t("Type")}>
      <div
        role="radiogroup"
        aria-label={t("Type")}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {TYPES.map((x) => (
          <TypeTile
            key={x.v}
            type={x.v}
            icon={x.icon}
            label={t(x.l)}
            hint={t(x.hint)}
            on={x.v === type}
            onPick={() => (setType(x.v), setErr(""))}
          />
        ))}
      </div>
    </section>
  );
  const previewTitle =
    type === "vitals"
      ? f.sys && f.dia
        ? `Blood pressure ${f.sys}/${f.dia} mmHg`
        : ""
      : `${f.name}${type === "medicines" && f.dose ? ` ${f.dose}` : ""}`;
  return (
    <GlassPage>
      <GlassHero
        icon={PenLine}
        eyebrow={t("Add to record")}
        title={t("Type it in")}
        sub={t("For {name}", { name: profile.name })}
      />

      {type === "medicines" ? (
        <MedicineBuilder tiles={typeTiles} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* hue vars live here, not on the form: data-rise clears the risen element's inline style */}
          <div className="flex min-w-0 flex-col gap-6" style={hueVars(type)}>
            {typeTiles}

            <form
              data-rise
              className="entry-form glass glass-sheen flex flex-col gap-4 rounded-[24px] p-4 md:p-6"
              onSubmit={(e) => {
                e.preventDefault();
                const name =
                  type === "vitals"
                    ? `Blood pressure ${f.sys}/${f.dia} mmHg`
                    : f.name.trim();
                if (type === "vitals" ? !f.sys || !f.dia : !name)
                  return setErr(t("Fill in this field."));
                const now = new Date().toISOString();
                const src = { kind: "self" as const, by: "you", at: now };
                mutate((d) => {
                  if (type === "medicines")
                    d.medicines.push({
                      id: uid("med"),
                      profileId: profile.id,
                      name,
                      dose: f.dose,
                      times: [f.time],
                      food: "any",
                      prescribedBy: t("Entered by you"),
                      start: f.date,
                      current: true,
                      source: src,
                      reminder: {
                        on: true,
                        days: [0, 1, 2, 3, 4, 5, 6],
                        sound: "Chime",
                        tellCaregivers: false,
                      },
                    });
                  else
                    d.items.push({
                      id: uid("r"),
                      profileId: profile.id,
                      section: (type === "allergy"
                        ? "allergies"
                        : type === "vaccination"
                          ? "vaccinations"
                          : type) as RecordSection,
                      title: name,
                      detail: f.detail || undefined,
                      date: f.date,
                      source: src,
                      confirmed: true,
                    });
                });
                toast(
                  queueIfOffline("Add record")
                    ? t("Saved on this phone. Will sync when online.")
                    : t("Added to the record"),
                );
                nav(type === "medicines" ? "/medicines" : "/record");
              }}
            >
              <h2 className="flex items-center gap-3 text-h3 font-semibold">
                <span className="type-ico grid size-10 place-items-center rounded-xl">
                  <cur.icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                {t(cur.l)}
              </h2>
              {type === "vitals" ? (
                <div className="flex gap-3">
                  <Input
                    label={t("Systolic")}
                    inputMode="numeric"
                    unit="mmHg"
                    value={f.sys}
                    onChange={(e) => setF({ ...f, sys: e.target.value })}
                    error={err && !f.sys ? err : undefined}
                    className="flex-1"
                  />
                  <Input
                    label={t("Diastolic")}
                    inputMode="numeric"
                    unit="mmHg"
                    value={f.dia}
                    onChange={(e) => setF({ ...f, dia: e.target.value })}
                    className="flex-1"
                  />
                </div>
              ) : (
                <Input
                  label={t(
                    {
                      conditions: "Condition",
                      allergy: "What are you allergic to?",
                      medicines: "Medicine name",
                      surgeries: "Surgery",
                      vaccination: "Vaccine",
                    }[type] ?? "Name",
                  )}
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                  error={err && !f.name ? err : undefined}
                />
              )}
              {type === "medicines" && (
                <div className="flex gap-3">
                  <Input
                    label={t("Dose")}
                    value={f.dose}
                    onChange={(e) => setF({ ...f, dose: e.target.value })}
                    placeholder="500 mg"
                    className="flex-1"
                  />
                  <Input
                    label={t("Time")}
                    type="time"
                    value={f.time}
                    onChange={(e) => setF({ ...f, time: e.target.value })}
                    className="flex-1"
                  />
                </div>
              )}
              {allergyClash && (
                <Note tone="danger" icon={AlertTriangle}>
                  {t(
                    "{name} is allergic to Penicillin. Check with a doctor before taking this.",
                    { name: profile.name },
                  )}
                </Note>
              )}
              {type !== "medicines" && type !== "vitals" && (
                <Textarea
                  label={t(
                    type === "allergy" ? "What happens?" : "Details (optional)",
                  )}
                  value={f.detail}
                  onChange={(e) => setF({ ...f, detail: e.target.value })}
                />
              )}
              <Input
                label={t("Date")}
                type="date"
                value={f.date}
                onChange={(e) => setF({ ...f, date: e.target.value })}
              />
              <ActionBar>
                <Button full type="submit">
                  {t("Add to record")}
                </Button>
              </ActionBar>
            </form>
          </div>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            <section data-rise aria-label={t("Preview")}>
              <p className="mb-2 px-1 text-caption font-bold tracking-[0.16em] text-primary-600 uppercase">
                {t("Preview")}
              </p>
              <EntryCard
                type={type}
                icon={cur.icon}
                kind={t(cur.l)}
                title={previewTitle}
                placeholder={t("Name appears here")}
                detail={type !== "medicines" && type !== "vitals" ? f.detail : undefined}
                sub={
                  type === "medicines" ? (
                    <span className="tabular">
                      {t("Reminder at {time}", { time: f.time })}
                    </span>
                  ) : undefined
                }
                date={f.date ? fmtDate(f.date) : ""}
              >
                {type === "vitals" && (
                  <BpDial sys={Number(f.sys) || 0} dia={Number(f.dia) || 0} />
                )}
              </EntryCard>
            </section>
            <div
              data-rise
              className="glass flex gap-3 rounded-[20px] p-4 text-small text-ink-700"
            >
              <ShieldCheck
                className="size-5 shrink-0 text-success-text"
                aria-hidden
              />
              <p>
                {t(
                  "Things you type in are marked “Entered by you”, so doctors know where they came from. Works offline too.",
                )}
              </p>
            </div>
          </aside>
        </div>
      )}
    </GlassPage>
  );
}
