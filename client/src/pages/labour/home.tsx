import { useState } from "react";
import { useCreateWorkRecord, useWorkRecords } from "@/hooks/use-labour";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLabourWorkRecordSchema, type InsertLabourWorkRecord } from "@shared/routes";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, PlusCircle } from "lucide-react";

const COLOUR_OPTIONS = [
  "Red", "Blue", "Green", "Yellow", "Black", "White", "Orange",
  "Pink", "Purple", "Brown", "Grey", "Checkered", "Striped", "Other"
];

export default function LabourHome() {
  const { user } = useAuth();
  const createRecord = useCreateWorkRecord();
  const { data: myRecords = [] } = useWorkRecords(user?.id ? { labourUserId: user.id } : undefined);

  const [colourMode, setColourMode] = useState<"dropdown" | "text">("dropdown");

  // Auto-increment slNo based on today's existing records
  const today = new Date().toISOString().split("T")[0];
  const todayRecords = myRecords.filter((r) => r.workDate === today);
  const nextSlNo = todayRecords.length + 1;

  const form = useForm<InsertLabourWorkRecord>({
    resolver: zodResolver(insertLabourWorkRecordSchema),
    defaultValues: {
      labourUserId: user?.id,
      workDate: today,
      slNo: nextSlNo,
      colour: "",
      length: undefined,
      illai: undefined,
      setCount: undefined,
      amount: "0",
    },
  });

  function onSubmit(data: InsertLabourWorkRecord) {
    createRecord.mutate(data, {
      onSuccess: () => {
        form.reset({
          labourUserId: user?.id,
          workDate: new Date().toISOString().split("T")[0],
          slNo: nextSlNo + 1,
          colour: "",
          length: undefined,
          illai: undefined,
          setCount: undefined,
          amount: "0",
        });
        setColourMode("dropdown");
      },
    });
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-display font-bold text-orange-600">Work Entry</h2>
          <p className="text-muted-foreground">Record your daily work</p>
        </div>

        <Card className="border-t-4 border-t-orange-500 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-orange-500" />
                  Daily Record
                </CardTitle>
                <CardDescription>Enter details for today's work entry</CardDescription>
              </div>
              {todayRecords.length > 0 && (
                <Badge className="bg-orange-100 text-orange-700">
                  {todayRecords.length} record(s) today
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                {/* Row 1: Date + Sl.No */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="workDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sl. No</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Colour — dropdown or free text */}
                <FormField
                  control={form.control}
                  name="colour"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-1">
                        <FormLabel>Colour / Design</FormLabel>
                        <button
                          type="button"
                          className="text-xs text-orange-600 underline"
                          onClick={() => {
                            setColourMode((m) => (m === "dropdown" ? "text" : "dropdown"));
                            field.onChange("");
                          }}
                        >
                          {colourMode === "dropdown" ? "Type manually" : "Pick from list"}
                        </button>
                      </div>
                      <FormControl>
                        {colourMode === "dropdown" ? (
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          >
                            <option value="">Select colour…</option>
                            {COLOUR_OPTIONS.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        ) : (
                          <Input placeholder="e.g. Dark Red Checkered" {...field} value={field.value ?? ""} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Row 2: Length + Illai */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="0"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="illai"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Illai</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="0"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row 3: Set Count + Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="setCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Set Count</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="0"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white mt-2"
                  disabled={createRecord.isPending}
                >
                  {createRecord.isPending ? "Submitting…" : "Submit Record"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Today's Records Preview */}
        {todayRecords.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-orange-500" />
                Today's Entries
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
