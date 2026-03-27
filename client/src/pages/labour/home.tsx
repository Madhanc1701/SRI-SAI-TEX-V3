import { useState, useEffect } from "react";
import { useCreateWorkRecord, useWorkRecords } from "@/hooks/use-labour";
import { useLabourRateConfig, findRate } from "@/hooks/use-rate-config";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, PlusCircle, Trash2, Send, Calculator, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const COLOUR_OPTIONS = [
  "Red", "Blue", "Green", "Yellow", "Black", "White", "Orange",
  "Pink", "Purple", "Brown", "Grey", "Checkered", "Striped", "Other"
];

type RowEntry = {
  id: number;
  slNo: number;
  colour: string;
  colourMode: "dropdown" | "text";
  length: string;
  illai: string;
  setCount: string;
  amount: string; // auto-calculated, read-only display
};

function createEmptyRow(id: number, slNo: number): RowEntry {
  return { id, slNo, colour: "", colourMode: "dropdown", length: "", illai: "", setCount: "", amount: "" };
}

// ─── Rate Reference Banner ────────────────────────────────────────────────────

function RateBanner({ labourUserId }: { labourUserId: string | undefined }) {
  const { data: rateConfig, isLoading } = useLabourRateConfig(labourUserId);

  if (isLoading) return null;

  const hasLength = rateConfig?.lengthRanges && rateConfig.lengthRanges.length > 0;
  const hasIllai = rateConfig?.illaiRanges && rateConfig.illaiRanges.length > 0;

  if (!hasLength && !hasIllai) {
    return (
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
        <Info className="h-4 w-4 shrink-0" />
        <span>Rates not configured yet. Please ask the owner to set up rates from the Labour Management page.</span>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-semibold text-blue-800">Current Rate Chart</span>
        <Badge className="bg-blue-100 text-blue-700 text-xs">
          Amount = lengthRate × illaiRate × setCount
        </Badge>
      </div>
      <div className="flex flex-wrap gap-6">
        {hasLength && (
          <div>
            <p className="text-xs font-medium text-blue-700 mb-1">Length Rates</p>
            <table className="text-xs border-collapse">
              <thead>
                <tr className="text-blue-600">
                  <th className="pr-3 pb-0.5 text-left font-medium">Range (m)</th>
                  <th className="pb-0.5 text-left font-medium">Rate (₹)</th>
                </tr>
              </thead>
              <tbody>
                {[...rateConfig!.lengthRanges].sort((a, b) => a.min - b.min).map((r, i) => (
                  <tr key={i}>
                    <td className="pr-3 py-0.5 text-blue-800">
                      {r.min}{r.max !== null ? `–${r.max}` : "+"}
                    </td>
                    <td className="py-0.5 font-semibold text-blue-900">₹{r.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasIllai && (
          <div>
            <p className="text-xs font-medium text-blue-700 mb-1">Illai Rates</p>
            <table className="text-xs border-collapse">
              <thead>
                <tr className="text-blue-600">
                  <th className="pr-3 pb-0.5 text-left font-medium">Range</th>
                  <th className="pb-0.5 text-left font-medium">Rate (₹)</th>
                </tr>
              </thead>
              <tbody>
                {[...rateConfig!.illaiRanges].sort((a, b) => a.min - b.min).map((r, i) => (
                  <tr key={i}>
                    <td className="pr-3 py-0.5 text-blue-800">
                      {r.min}{r.max !== null ? `–${r.max}` : "+"}
                    </td>
                    <td className="py-0.5 font-semibold text-blue-900">₹{r.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LabourHome() {
  const { user } = useAuth();
  const createRecord = useCreateWorkRecord();
  const { toast } = useToast();
  const { data: myRecords = [] } = useWorkRecords(user?.id ? { labourUserId: user.id } : undefined);
  const { data: rateConfig } = useLabourRateConfig(user?.id);

  const today = new Date().toISOString().split("T")[0];
  const todayRecords = myRecords.filter((r) => r.workDate === today);

  const [workDate, setWorkDate] = useState(today);
  const [rows, setRows] = useState<RowEntry[]>([createEmptyRow(1, 1)]);
  const [nextId, setNextId] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update slNo base when todayRecords first loads
  useEffect(() => {
    if (todayRecords.length > 0) {
      setRows([createEmptyRow(1, todayRecords.length + 1)]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayRecords.length]);

  // Helper: compute amount for a given row state using current rateConfig
  function calcAmount(row: RowEntry): string {
    if (!rateConfig) return "";
    const len = parseFloat(row.length);
    const illai = parseFloat(row.illai);
    const set = parseFloat(row.setCount);
    if (!isNaN(len) && !isNaN(illai) && !isNaN(set) && set > 0) {
      const lRate = findRate(len, rateConfig.lengthRanges);
      const iRate = findRate(illai, rateConfig.illaiRanges);
      if (lRate !== null && iRate !== null) {
        return (lRate * iRate * set).toFixed(2);
      }
    }
    return "";
  }

  function addRow() {
    const lastSlNo = rows.length > 0 ? rows[rows.length - 1].slNo : todayRecords.length;
    setRows((prev) => [...prev, createEmptyRow(nextId, lastSlNo + 1)]);
    setNextId((n) => n + 1);
  }

  function removeRow(id: number) {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      const baseSlNo = todayRecords.length;
      return filtered.map((r, i) => ({ ...r, slNo: baseSlNo + i + 1 }));
    });
  }

  function updateRow(id: number, field: keyof RowEntry, value: string | number) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        // Recalculate amount whenever a relevant field changes
        if (field === "length" || field === "illai" || field === "setCount") {
          updated.amount = calcAmount(updated);
        }
        return updated;
      })
    );
  }

  async function handleSubmitAll() {
    if (!user?.id) {
      toast({ title: "Not logged in", variant: "destructive" });
      return;
    }

    const invalid = rows.find((r) => !r.colour?.trim());
    if (invalid) {
      toast({ title: "Validation Error", description: "Please fill in the Colour field for all rows.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      for (const row of rows) {
        await new Promise<void>((resolve, reject) => {
          createRecord.mutate(
            {
              labourUserId: user.id,
              workDate,
              slNo: row.slNo,
              colour: row.colour,
              length: row.length ? parseInt(row.length) : undefined,
              illai: row.illai ? parseInt(row.illai) : undefined,
              setCount: row.setCount ? parseInt(row.setCount) : undefined,
              amount: row.amount || "0",
            },
            {
              onSuccess: () => resolve(),
              onError: (err) => reject(err),
            }
          );
        });
      }

      toast({ title: "All Records Saved", description: `${rows.length} record(s) submitted successfully.` });

      const newBaseSlNo = todayRecords.length + rows.length;
      setRows([createEmptyRow(nextId, newBaseSlNo + 1)]);
      setNextId((n) => n + 1);
    } catch {
      toast({ title: "Submit Failed", description: "One or more records could not be saved.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-display font-bold text-orange-600">Work Entry</h2>
          <p className="text-muted-foreground">Record your daily work — add multiple rows and submit all at once</p>
        </div>

        {/* Rate Reference Banner (per-labour config) */}
        <RateBanner labourUserId={user?.id} />

        {/* Entry Card */}
        <Card className="border-t-4 border-t-orange-500 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-orange-500" />
                  Daily Record Entry
                </CardTitle>
                <CardDescription>Add multiple rows and submit all at once</CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Date:</label>
                  <Input
                    type="date"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    className="w-36 h-8 text-sm"
                  />
                </div>
                {todayRecords.length > 0 && (
                  <Badge className="bg-orange-100 text-orange-700">
                    {todayRecords.length} saved today
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-orange-50 border-b border-orange-200">
                    <th className="px-3 py-2 text-left font-medium text-orange-700 w-14">Sl.No</th>
                    <th className="px-3 py-2 text-left font-medium text-orange-700 min-w-[160px]">Colour / Design</th>
                    <th className="px-3 py-2 text-left font-medium text-orange-700 w-24">Length</th>
                    <th className="px-3 py-2 text-left font-medium text-orange-700 w-24">Illai</th>
                    <th className="px-3 py-2 text-left font-medium text-orange-700 w-28">Set Count</th>
                    <th className="px-3 py-2 text-left font-medium text-orange-700 w-36">
                      <span className="flex items-center gap-1">
                        Amount (₹)
                        <Calculator className="h-3 w-3 text-orange-400" />
                      </span>
                    </th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id} className={idx % 2 === 0 ? "bg-white" : "bg-orange-50/30"}>
                      {/* Sl No */}
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={row.slNo}
                          onChange={(e) => updateRow(row.id, "slNo", parseInt(e.target.value) || row.slNo)}
                          className="h-8 text-sm w-14"
                        />
                      </td>

                      {/* Colour */}
                      <td className="px-3 py-2">
                        <div className="flex gap-1 items-center">
                          {row.colourMode === "dropdown" ? (
                            <select
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                              value={row.colour}
                              onChange={(e) => updateRow(row.id, "colour", e.target.value)}
                            >
                              <option value="">Select…</option>
                              {COLOUR_OPTIONS.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              className="h-8 text-sm"
                              placeholder="e.g. Dark Red"
                              value={row.colour}
                              onChange={(e) => updateRow(row.id, "colour", e.target.value)}
                            />
                          )}
                          <button
                            type="button"
                            className="text-xs text-orange-500 underline whitespace-nowrap"
                            onClick={() => {
                              updateRow(row.id, "colourMode" as any, row.colourMode === "dropdown" ? "text" : "dropdown");
                              updateRow(row.id, "colour", "");
                            }}
                          >
                            {row.colourMode === "dropdown" ? "Type" : "List"}
                          </button>
                        </div>
                      </td>

                      {/* Length */}
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={row.length}
                          onChange={(e) => updateRow(row.id, "length", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </td>

                      {/* Illai */}
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={row.illai}
                          onChange={(e) => updateRow(row.id, "illai", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </td>

                      {/* Set Count */}
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={row.setCount}
                          onChange={(e) => updateRow(row.id, "setCount", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </td>

                      {/* Amount (auto-calculated, read-only) */}
                      <td className="px-3 py-2">
                        <div className="h-8 flex items-center px-3 rounded-md border border-input bg-muted/40 text-sm font-semibold text-orange-700 min-w-[5rem]">
                          {row.amount ? `₹${Number(row.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-muted-foreground font-normal">—</span>}
                        </div>
                      </td>

                      {/* Delete */}
                      <td className="px-2 py-2">
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t gap-3 flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50 gap-2"
                onClick={addRow}
              >
                <PlusCircle className="h-4 w-4" />
                Add Row
              </Button>

              <Button
                type="button"
                className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                disabled={isSubmitting || createRecord.isPending}
                onClick={handleSubmitAll}
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? `Submitting ${rows.length} record(s)…` : `Submit All (${rows.length} row${rows.length > 1 ? "s" : ""})`}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Records Preview */}
        {todayRecords.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-orange-500" />
                Today's Saved Entries
                <Badge className="ml-2 bg-orange-100 text-orange-700 text-xs">{todayRecords.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Sl</th>
                      <th className="px-3 py-2 text-left">Colour</th>
                      <th className="px-3 py-2 text-left">Length</th>
                      <th className="px-3 py-2 text-left">Illai</th>
                      <th className="px-3 py-2 text-left">Set</th>
                      <th className="px-3 py-2 text-right">₹</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayRecords.map((r, i) => (
                      <tr key={r.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                        <td className="px-3 py-1">{r.slNo ?? "—"}</td>
                        <td className="px-3 py-1">{r.colour || "—"}</td>
                        <td className="px-3 py-1">{r.length ?? "—"}</td>
                        <td className="px-3 py-1">{r.illai ?? "—"}</td>
                        <td className="px-3 py-1">{r.setCount ?? "—"}</td>
                        <td className="px-3 py-1 text-right font-medium">
                          {r.amount ? `₹${Number(r.amount).toLocaleString()}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
