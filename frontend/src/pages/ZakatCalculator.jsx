import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ArrowLeft,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  Scale,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Constants ───────────────────────────────────────────────────────────────
const GOLD_NISAB_GRAMS = 87.48;
const SILVER_NISAB_GRAMS = 612.36;
const ZAKAT_RATE = 0.025;

const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "PKR", symbol: "₨", label: "Pakistani Rupee" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", label: "Saudi Riyal" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "BDT", symbol: "৳", label: "Bangladeshi Taka" },
  { code: "MYR", symbol: "RM", label: "Malaysian Ringgit" },
  { code: "IDR", symbol: "Rp", label: "Indonesian Rupiah" },
];

const ASSET_FIELDS = [
  { key: "cash", label: "Cash in Hand & Bank", emoji: "💰", tooltip: "Total cash in bank accounts and physical cash you possess." },
  { key: "gold", label: "Gold Value", emoji: "🪙", tooltip: "Market value of all gold you own (jewelry worn daily is exempt per some scholars)." },
  { key: "silver", label: "Silver Value", emoji: "🥈", tooltip: "Market value of all silver you own." },
  { key: "stocks", label: "Stocks & Investments", emoji: "📈", tooltip: "Current value of shares, mutual funds, and other investments." },
  { key: "business", label: "Business Assets & Inventory", emoji: "🏢", tooltip: "Value of goods for sale and business cash. Fixed assets (machinery) are exempt." },
  { key: "rental", label: "Rental Income / Property (for trade)", emoji: "🏠", tooltip: "Only the saved/liquid portion of rental income. The property itself is not zakatable." },
  { key: "crypto", label: "Cryptocurrency", emoji: "₿", tooltip: "Current market value of all crypto holdings (Bitcoin, Ethereum, etc.)." },
  { key: "receivables", label: "Money Owed to You", emoji: "📄", tooltip: "Debts others owe you that you expect to receive." },
];

const DEDUCTION_FIELDS = [
  { key: "debts", label: "Short-term Debts", emoji: "💳", tooltip: "Debts due within the next 12 months (loans, credit cards, bills)." },
  { key: "expenses", label: "Immediate Expenses", emoji: "🧾", tooltip: "Essential living expenses due immediately (rent, utilities, food)." },
];

const ISLAMIC_NOTES = [
  "No Zakat on your personal residence or vehicle.",
  "Zakat is calculated after wealth is held for one lunar year (Hawl).",
  "Daily-wear jewelry exemption varies by madhab — consult a scholar.",
  "Business inventory is zakatable, but machinery/tools are not.",
  "Zakat al-Fitr is separate and due before Eid al-Fitr prayer.",
];

// ─── Tooltip Component ──────────────────────────────────────────────────────
function Tooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setShow(!show)}
        onBlur={() => setShow(false)}
        className="ml-1 grid h-4 w-4 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary/20 hover:text-primary"
        aria-label="More info"
      >
        <Info className="h-2.5 w-2.5" />
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground shadow-xl animate-in fade-in slide-in-from-bottom-1 duration-200">
          {text}
          <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-border bg-card" />
        </span>
      )}
    </span>
  );
}

// ─── Input Row Component ─────────────────────────────────────────────────────
function InputRow({ field, value, onChange, currencySymbol }) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-all duration-200 hover:border-primary/30 hover:shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted/60 text-xl">
        {field.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <label className="flex items-center text-xs font-medium text-muted-foreground">
          {field.label}
          <Tooltip text={field.tooltip} />
        </label>
        <input
          type="number"
          min="0"
          placeholder="0"
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="mt-0.5 w-full bg-transparent text-sm font-semibold placeholder:text-muted-foreground/30 focus:outline-none"
          id={`zakat-${field.key}`}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground/60">{currencySymbol}</span>
    </div>
  );
}

// ─── Collapsible Section ─────────────────────────────────────────────────────
function Section({ title, icon: Icon, emoji, children, defaultOpen = true, accentColor = "primary" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mb-3 flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className={`grid h-6 w-6 place-items-center rounded-lg bg-${accentColor}/10`}>
            {emoji ? <span className="text-sm">{emoji}</span> : <Icon className={`h-3.5 w-3.5 text-${accentColor}`} />}
          </span>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">{children}</div>}
    </div>
  );
}

// ─── Summary Row ─────────────────────────────────────────────────────────────
function SummaryRow({ label, value, highlight, negative }) {
  return (
    <div className={`flex items-center justify-between rounded-2xl border px-5 py-4 transition-all duration-300 ${
      highlight
        ? "border-primary/30 bg-primary/5"
        : "border-border bg-card"
    }`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-heading text-lg font-bold ${negative ? "text-destructive" : highlight ? "text-primary" : ""}`}>
        {value}
      </span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ZakatCalculator() {
  const navigate = useNavigate();
  const [values, setValues] = useState({});
  const [currency, setCurrency] = useState("INR");
  const [nisabType, setNisabType] = useState("silver"); // silver default
  const [goldPrice, setGoldPrice] = useState("");
  const [silverPrice, setSilverPrice] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const currencyDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
        setShowCurrencyDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currencyObj = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];

  const update = useCallback(
    (key, val) => setValues((prev) => ({ ...prev, [key]: Number(val) || 0 })),
    []
  );

  const totalAssets = useMemo(
    () => ASSET_FIELDS.reduce((sum, f) => sum + (values[f.key] || 0), 0),
    [values]
  );
  const totalDeductions = useMemo(
    () => DEDUCTION_FIELDS.reduce((sum, f) => sum + (values[f.key] || 0), 0),
    [values]
  );
  const netWealth = totalAssets - totalDeductions;

  const nisabValue = useMemo(() => {
    if (nisabType === "gold") return GOLD_NISAB_GRAMS * (Number(goldPrice) || 0);
    return SILVER_NISAB_GRAMS * (Number(silverPrice) || 0);
  }, [nisabType, goldPrice, silverPrice]);

  const isAboveNisab = nisabValue > 0 && netWealth >= nisabValue;
  const zakatDue = isAboveNisab ? netWealth * ZAKAT_RATE : 0;

  const fmt = (num) =>
    `${currencyObj.symbol} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="mx-auto max-w-lg pb-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Financial
          </p>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Zakat Calculator
          </h1>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-foreground/80">
        <span className="mr-1.5">💰</span>
        Zakat is <strong>2.5%</strong> of your net wealth above the Nisab threshold, held for one
        lunar year. This calculator follows authentic <strong>Qur'an & Sunnah</strong> rules.
      </div>

      {/* ── Settings Card ─────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 flex items-center gap-2 font-heading text-sm font-semibold">
          <Scale className="h-4 w-4 text-primary" />
          Nisab & Currency Settings
        </h3>

        {/* Currency */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="zakat-currency">
            Currency
          </label>
          <div className="relative" ref={currencyDropdownRef}>
            <button
              type="button"
              onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded bg-primary/10 text-primary">
                  {currencyObj.symbol}
                </span>
                <span>{currencyObj.code} — {currencyObj.label}</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showCurrencyDropdown && (
              <div className="absolute left-0 top-full z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg animate-in fade-in slide-in-from-top-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCurrency(c.code);
                      setShowCurrencyDropdown(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      currency === c.code 
                        ? 'bg-primary/10 font-semibold text-primary' 
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span className={`grid h-6 w-6 place-items-center rounded ${currency === c.code ? 'bg-primary/20' : 'bg-muted/80'}`}>
                      {c.symbol}
                    </span>
                    <span>{c.code}</span>
                    <span className="text-xs opacity-70 ml-auto">{c.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nisab Toggle */}
        <div className="mb-4">
          <label className="mb-1.5 flex items-center text-xs font-medium text-muted-foreground">
            Nisab Type
            <Tooltip text="Silver Nisab is recommended as it results in a lower threshold, meaning more people are eligible to pay Zakat, which benefits more recipients." />
          </label>
          <div className="flex gap-2">
            {[
              { value: "silver", label: "🥈 Silver Nisab", sub: `${SILVER_NISAB_GRAMS}g` },
              { value: "gold", label: "🪙 Gold Nisab", sub: `${GOLD_NISAB_GRAMS}g` },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNisabType(opt.value)}
                className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-200 ${
                  nisabType === opt.value
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-background hover:border-muted-foreground/30"
                }`}
              >
                <span className="block text-sm font-semibold">{opt.label}</span>
                <span className="block text-[10px] text-muted-foreground">{opt.sub}</span>
              </button>
            ))}
          </div>
          {nisabType === "silver" && (
            <p className="mt-1.5 text-[10px] text-primary font-medium">
              ✓ Recommended — lower threshold benefits more recipients
            </p>
          )}
        </div>

        {/* Metal Prices */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="zakat-gold-price">
              Gold Price / gram
            </label>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2.5">
              <span className="text-xs text-muted-foreground">{currencyObj.symbol}</span>
              <input
                id="zakat-gold-price"
                type="number"
                min="0"
                placeholder="0"
                value={goldPrice}
                onChange={(e) => setGoldPrice(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold placeholder:text-muted-foreground/30 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="zakat-silver-price">
              Silver Price / gram
            </label>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2.5">
              <span className="text-xs text-muted-foreground">{currencyObj.symbol}</span>
              <input
                id="zakat-silver-price"
                type="number"
                min="0"
                placeholder="0"
                value={silverPrice}
                onChange={(e) => setSilverPrice(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold placeholder:text-muted-foreground/30 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {nisabValue > 0 && (
          <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Current Nisab ({nisabType === "gold" ? "Gold" : "Silver"}):&nbsp;
            <strong className="text-foreground">{fmt(nisabValue)}</strong>
          </div>
        )}
      </div>

      {/* ── Assets Section ────────────────────────────────────────────── */}
      <Section title="Your Assets" icon={TrendingUp}>
        {ASSET_FIELDS.map((f) => (
          <InputRow
            key={f.key}
            field={f}
            value={values[f.key]}
            onChange={update}
            currencySymbol={currencyObj.symbol}
          />
        ))}
      </Section>

      {/* ── Deductions Section ────────────────────────────────────────── */}
      <Section title="Deductions" emoji="➖" accentColor="destructive">
        {DEDUCTION_FIELDS.map((f) => (
          <InputRow
            key={f.key}
            field={f}
            value={values[f.key]}
            onChange={update}
            currencySymbol={currencyObj.symbol}
          />
        ))}
      </Section>

      {/* ── Results ───────────────────────────────────────────────────── */}
      <div className="mb-6 space-y-2">
        <h2 className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Calculation Result
        </h2>
        <SummaryRow label="Total Assets" value={fmt(totalAssets)} />
        <SummaryRow label="Total Deductions" value={`- ${fmt(totalDeductions)}`} negative />
        <SummaryRow label="Net Wealth" value={fmt(netWealth)} highlight />
        <SummaryRow
          label={`Nisab (${nisabType === "gold" ? `Gold: ${GOLD_NISAB_GRAMS}g` : `Silver: ${SILVER_NISAB_GRAMS}g`})`}
          value={nisabValue > 0 ? fmt(nisabValue) : "Enter price above"}
        />
      </div>

      {/* ── Zakat Result Box ──────────────────────────────────────────── */}
      <div
        className={`rounded-2xl border-2 p-6 text-center transition-all duration-500 ${
          isAboveNisab
            ? "border-green-500/50 bg-gradient-to-br from-green-50 to-emerald-50/50 shadow-lg shadow-green-500/10 dark:from-green-950/40 dark:to-emerald-950/20 dark:border-green-500/30"
            : "border-border bg-muted/30"
        }`}
      >
        {isAboveNisab ? (
          <>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-green-500/15">
              <Scale className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-green-600 dark:text-green-400">
              Zakat Due (2.5%)
            </p>
            <p className="mt-2 font-heading text-4xl font-bold text-green-700 dark:text-green-300">
              {fmt(zakatDue)}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-green-700/70 dark:text-green-400/70">
              Zakat is obligatory as your wealth exceeds Nisab.
              <br />
              May Allah accept your Zakat and purify your wealth.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted">
              <Scale className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              {nisabValue <= 0
                ? "Enter metal prices to calculate Nisab"
                : "Your wealth is below Nisab"}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground/70">
              Zakat is not obligatory, but Sadaqah is recommended.
            </p>
          </>
        )}
      </div>

      {/* ── Islamic Notes ─────────────────────────────────────────────── */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Islamic Notes & Reminders
          </span>
          {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showNotes && (
          <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            {ISLAMIC_NOTES.map((note, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground"
              >
                <span className="mt-0.5 text-primary">•</span>
                {note}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
