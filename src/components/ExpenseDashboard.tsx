"use client";

import { useEffect, useMemo, useState } from "react";

type ExpenseCategory =
  | "Housing"
  | "Food"
  | "Transportation"
  | "Utilities"
  | "Health"
  | "Entertainment"
  | "Subscriptions"
  | "Savings"
  | "Other";

type Expense = {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
};

const CATEGORY_PRESETS: ExpenseCategory[] = [
  "Housing",
  "Food",
  "Transportation",
  "Utilities",
  "Health",
  "Entertainment",
  "Subscriptions",
  "Savings",
  "Other",
];

const STORAGE_KEYS = {
  expenses: "minimalist-expense-tracker:v1",
  budget: "minimalist-expense-tracker:budget",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const today = new Date();
const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function ExpenseDashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<number>(2000);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [date, setDate] = useState<string>(() => today.toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedExpenses = window.localStorage.getItem(STORAGE_KEYS.expenses);
      const storedBudget = window.localStorage.getItem(STORAGE_KEYS.budget);

      if (storedExpenses) {
        const parsed = JSON.parse(storedExpenses) as Expense[];
        setExpenses(
          parsed
            .filter((item): item is Expense => typeof item.amount === "number" && Boolean(item.id))
            .sort((a, b) => b.date.localeCompare(a.date)),
        );
      }

      if (storedBudget) {
        const parsedBudget = Number(storedBudget);
        if (!Number.isNaN(parsedBudget)) {
          setBudget(parsedBudget);
        }
      }
    } catch (err) {
      console.error("Failed to hydrate expenses from storage", err);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));
  }, [expenses, isReady]);

  useEffect(() => {
    if (!isReady || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.budget, String(budget));
  }, [budget, isReady]);

  const monthOptions = useMemo(() => {
    const uniqueMonths = new Set<string>(
      expenses.map((item) => item.date.slice(0, 7)).concat(defaultMonth),
    );
    return Array.from(uniqueMonths).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  useEffect(() => {
    if (!monthOptions.includes(selectedMonth)) {
      setSelectedMonth(monthOptions[0] ?? defaultMonth);
    }
  }, [monthOptions, selectedMonth]);

  const filteredExpenses = useMemo(
    () => expenses.filter((item) => item.date.startsWith(selectedMonth)),
    [expenses, selectedMonth],
  );

  const sortedExpenses = useMemo(
    () => [...filteredExpenses].sort((a, b) => b.date.localeCompare(a.date)),
    [filteredExpenses],
  );

  const totalSpent = useMemo(
    () => filteredExpenses.reduce((sum, current) => sum + current.amount, 0),
    [filteredExpenses],
  );

  const categoryTotals = useMemo(() => {
    const totals: Record<ExpenseCategory, number> = {
      Housing: 0,
      Food: 0,
      Transportation: 0,
      Utilities: 0,
      Health: 0,
      Entertainment: 0,
      Subscriptions: 0,
      Savings: 0,
      Other: 0,
    };

    for (const item of filteredExpenses) {
      totals[item.category] += item.amount;
    }

    return totals;
  }, [filteredExpenses]);

  const highestCategoryValue = useMemo(
    () => Math.max(0, ...Object.values(categoryTotals)),
    [categoryTotals],
  );

  const monthDate = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return { year, monthIndex: (month ?? 1) - 1 };
  }, [selectedMonth]);

  const daysElapsedInMonth = useMemo(() => {
    if (monthDate.year === undefined || monthDate.monthIndex === undefined) return 30;
    const todayDate = new Date();
    const isCurrentMonth =
      todayDate.getFullYear() === monthDate.year && todayDate.getMonth() === monthDate.monthIndex;
    return isCurrentMonth ? todayDate.getDate() : new Date(monthDate.year, monthDate.monthIndex + 1, 0).getDate();
  }, [monthDate]);

  const projectedSpending = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    const average = totalSpent / daysElapsedInMonth;
    const daysInMonth = new Date(monthDate.year ?? today.getFullYear(), (monthDate.monthIndex ?? 0) + 1, 0).getDate();
    return average * daysInMonth;
  }, [filteredExpenses.length, totalSpent, daysElapsedInMonth, monthDate]);

  const remainingBudget = Math.max(budget - totalSpent, 0);
  const budgetUtilization = budget === 0 ? 0 : Math.min((totalSpent / budget) * 100, 100);
  const projectedOverUnder = projectedSpending - budget;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const parsedAmount = Number(amount);
    if (!description.trim()) {
      setError("Add a description to remember what you spent on.");
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a positive amount.");
      return;
    }

    const expense: Expense = {
      id: crypto.randomUUID(),
      description: description.trim(),
      category,
      amount: Number(parsedAmount.toFixed(2)),
      date,
      notes: notes.trim() || undefined,
    };

    setExpenses((prev) => [expense, ...prev]);
    setDescription("");
    setAmount("");
    setNotes("");
  };

  const handleDelete = (id: string) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const handleBudgetChange = (value: number) => {
    setBudget(Number(value.toFixed(2)));
  };

  const budgetStatus =
    budget === 0
      ? "No budget set yet."
      : remainingBudget > 0
        ? `${formatCurrency(remainingBudget)} remaining`
        : `${formatCurrency(Math.abs(budget - totalSpent))} over budget`;

  return (
    <div className="min-h-screen bg-zinc-50 py-12 text-zinc-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 sm:px-8">
        <header className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Minimalist Money
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Personal Expense Dashboard
              </h1>
            </div>
            <input
              aria-label="Select month"
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-inner transition hover:border-zinc-300 focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <p className="max-w-2xl text-sm text-zinc-600">
            Track daily expenses, stay mindful of your budget, and see where your money goes each
            month. Everything is stored privately in your browser.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Month To-Date
            </h2>
            <p className="mt-3 text-3xl font-semibold">{formatCurrency(totalSpent)}</p>
            <p className="mt-2 text-sm text-zinc-500">{getMonthLabel(selectedMonth)}</p>
            <p className="mt-3 text-xs text-zinc-500">
              Projected spend:{" "}
              <span className="font-medium text-zinc-700">{formatCurrency(projectedSpending)}</span>
            </p>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Monthly Budget
              </h2>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                {budgetStatus}
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold">{formatCurrency(budget)}</p>
            <div className="mt-4">
              <input
                aria-label="Monthly budget"
                type="range"
                min={0}
                max={10000}
                step={50}
                value={budget}
                onChange={(event) => handleBudgetChange(Number(event.target.value))}
                className="w-full accent-zinc-900"
              />
              <div className="mt-3 flex justify-between text-xs text-zinc-500">
                <span>0</span>
                <span>10,000</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-zinc-100">
                <div
                  className="h-2 rounded-full bg-zinc-900 transition-[width]"
                  style={{ width: `${budgetUtilization}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {budget === 0
                  ? "Set a target budget to start tracking progress."
                  : `You've used ${Math.round(budgetUtilization)}% of this month's budget.`}
              </p>
            </div>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Insights</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600">
              <li>
                You logged{" "}
                <span className="font-medium text-zinc-900">{filteredExpenses.length} expenses</span>{" "}
                this month.
              </li>
              <li>
                Daily pace:{" "}
                <span className="font-medium text-zinc-900">
                  {formatCurrency(totalSpent / Math.max(daysElapsedInMonth, 1))}
                </span>
              </li>
              <li>
                Projected finish:{" "}
                <span
                  className={`font-medium ${
                    projectedOverUnder > 0 ? "text-rose-500" : "text-emerald-600"
                  }`}
                >
                  {projectedOverUnder > 0
                    ? `${formatCurrency(projectedOverUnder)} over`
                    : `${formatCurrency(Math.abs(projectedOverUnder))} under`}
                </span>
              </li>
            </ul>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <aside className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-100 lg:col-span-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Add Expense
            </h2>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Description
                </label>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm transition focus:border-zinc-400 focus:outline-none"
                  placeholder="Groceries, rent, coffee..."
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Amount
                  </label>
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm transition focus:border-zinc-400 focus:outline-none"
                    placeholder="0.00"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    type="number"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm transition focus:border-zinc-400 focus:outline-none"
                  >
                    {CATEGORY_PRESETS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Date
                  </label>
                  <input
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm transition focus:border-zinc-400 focus:outline-none"
                    type="date"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Notes
                  </label>
                  <input
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm transition focus:border-zinc-400 focus:outline-none"
                    placeholder="Optional detail"
                  />
                </div>
              </div>

              {error ? (
                <p className="text-sm text-rose-500" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                Add Expense
              </button>
            </form>
          </aside>

          <section className="grid gap-6 lg:col-span-2">
            <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Spending By Category
                </h2>
                <span className="text-xs text-zinc-500">
                  Highest spend:{" "}
                  <strong className="font-semibold text-zinc-900">
                    {highestCategoryValue > 0
                      ? Object.entries(categoryTotals).reduce(
                          (top, current) =>
                            current[1] > top[1] ? (current as [ExpenseCategory, number]) : top,
                          ["Other", 0] as [ExpenseCategory, number],
                        )[0]
                      : "None"}
                  </strong>
                </span>
              </div>
              <ul className="mt-4 space-y-3">
                {CATEGORY_PRESETS.map((item) => {
                  const value = categoryTotals[item];
                  const width = highestCategoryValue === 0 ? 0 : Math.round((value / highestCategoryValue) * 100);
                  return (
                    <li key={item}>
                      <div className="flex items-center justify-between text-sm text-zinc-600">
                        <span>{item}</span>
                        <span className="font-medium text-zinc-900">{formatCurrency(value)}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-zinc-100">
                        <div
                          className="h-2 rounded-full bg-zinc-900 transition-[width]"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>

            <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Expense Log
                </h2>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                  {sortedExpenses.length === 0
                    ? "No entries yet"
                    : `${sortedExpenses.length} this month`}
                </span>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-100">
                <table className="min-w-full divide-y divide-zinc-100 text-left text-sm text-zinc-600">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {sortedExpenses.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-sm text-zinc-400" colSpan={5}>
                          Start by adding your first expense. Entries stay on this device.
                        </td>
                      </tr>
                    ) : (
                      sortedExpenses.map((item) => (
                        <tr key={item.id} className="transition hover:bg-zinc-50/60">
                          <td className="px-4 py-3 font-medium text-zinc-900">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-zinc-900">{item.description}</div>
                            {item.notes ? (
                              <p className="text-xs text-zinc-500">{item.notes}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-zinc-900">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="text-xs font-semibold text-zinc-400 transition hover:text-rose-500"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </section>
      </div>
    </div>
  );
}
