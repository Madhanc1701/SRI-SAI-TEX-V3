import { useState } from "react";
import { Layout } from "@/components/layout";
import { useLabourProfiles, useCreateLabour } from "@/hooks/use-labour";
import { useLabourRateConfig, useUpdateLabourRateConfig } from "@/hooks/use-rate-config";
import type { RateRange } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createLabourUserSchema, type CreateLabourUser } from "@shared/routes";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UserPlus, Users, IdCard, Phone, MapPin, Loader2, QrCode, Wallet,
  Settings2, PlusCircle, Trash2, Save, Info
} from "lucide-react";

// ─── Shared range helpers ────────────────────────────────────────────────────

type LocalRange = { min: string; max: string; rate: string };

function rangeToLocal(r: RateRange): LocalRange {
  return { min: String(r.min), max: r.max !== null ? String(r.max) : "", rate: String(r.rate) };
}
function localToRange(r: LocalRange): RateRange {
  return {
    min: parseFloat(r.min) || 0,
    max: r.max.trim() === "" ? null : parseFloat(r.max) || 0,
    rate: parseFloat(r.rate) || 0,
  };
}

// ─── Range Table Component ───────────────────────────────────────────────────

function RangeTable({
  label, unit, rows, onAdd, onDelete, onUpdate,
}: {
  label: string; unit: string; rows: LocalRange[];
  onAdd: () => void; onDelete: (i: number) => void;
  onUpdate: (i: number, field: keyof LocalRange, val: string) => void;
}) {
  return (
    <div className="flex-1 min-w-[260px]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">{label}</h4>
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={onAdd}>
          <PlusCircle className="h-3.5 w-3.5" /> Add Range
        </Button>
      </div>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Min ({unit})</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">
                Max ({unit}) <span className="text-muted-foreground/60 italic">blank=above</span>
              </th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Rate (₹)</th>
              <th className="px-2 py-1.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-muted-foreground italic">No ranges yet</td></tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                <td className="px-2 py-1.5"><Input type="number" min={0} step="any" value={row.min} onChange={e => onUpdate(i, "min", e.target.value)} className="h-7 text-sm w-20" placeholder="0" /></td>
                <td className="px-2 py-1.5"><Input type="number" min={0} step="any" value={row.max} onChange={e => onUpdate(i, "max", e.target.value)} className="h-7 text-sm w-20" placeholder="∞" /></td>
                <td className="px-2 py-1.5"><Input type="number" min={0} step="any" value={row.rate} onChange={e => onUpdate(i, "rate", e.target.value)} className="h-7 text-sm w-16" placeholder="0" /></td>
                <td className="px-2 py-1.5">
                  <button type="button" onClick={() => onDelete(i)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Per-Labour Rate Config Panel ──────────────────────────────────────────

function LabourRateConfigPanel({ labour, dialogOpen, setDialogOpen }: { labour: { id: string; name?: string | null }; dialogOpen: boolean; setDialogOpen: (open: boolean) => void }) {
  const { data: savedConfig, isLoading } = useLabourRateConfig(dialogOpen ? labour.id : undefined);
  const updateConfig = useUpdateLabourRateConfig(labour.id);

  const [lengthRows, setLengthRows] = useState<LocalRange[] | null>(null);
  const [illaiRows, setIllaiRows] = useState<LocalRange[] | null>(null);

  // Sync from server once dialog opens and data loads
  const effectiveLength: LocalRange[] = lengthRows !== null ? lengthRows : (savedConfig?.lengthRanges ?? []).map(rangeToLocal);
  const effectiveIllai: LocalRange[] = illaiRows !== null ? illaiRows : (savedConfig?.illaiRanges ?? []).map(rangeToLocal);

  function handleSave() {
    updateConfig.mutate(
      { lengthRanges: effectiveLength.map(localToRange), illaiRanges: effectiveIllai.map(localToRange) },
      {
        onSuccess: () => {
          setLengthRows(null);
          setIllaiRows(null);
          setDialogOpen(false); // Close the parent dialog
        }
      }
    );
  }

  function makeOps(setter: React.Dispatch<React.SetStateAction<LocalRange[] | null>>, current: LocalRange[]) {
    return {
      add: () => setter([...current, { min: "", max: "", rate: "" }]),
      delete: (i: number) => setter(current.filter((_, idx) => idx !== i)),
      update: (i: number, field: keyof LocalRange, val: string) =>
        setter(current.map((r, idx) => idx === i ? { ...r, [field]: val } : r)),
    };
  }

  const lenOps = makeOps(v => setLengthRows(v instanceof Function ? v(effectiveLength) : v), effectiveLength);
  const ilOps = makeOps(v => setIllaiRows(v instanceof Function ? v(effectiveIllai) : v), effectiveIllai);

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
        <Settings2 className="h-5 w-5 text-emerald-600" />
        Rate Configuration
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Set individual salary rates for this labour.{" "}
        <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">Amount = lengthRate × illaiRate × setCount</span>
      </p>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-xs text-blue-700 mb-4">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Leave <strong>Max</strong> blank to mean "above" (no upper limit). Rates are matched by the largest Min ≤ actual value.</span>
          </div>

          <div className="flex flex-wrap gap-5 mt-1 flex-grow">
            <RangeTable label="Length Rates" unit="m" rows={effectiveLength}
              onAdd={lenOps.add} onDelete={lenOps.delete} onUpdate={lenOps.update} />
            <RangeTable label="Illai Rates" unit="illai" rows={effectiveIllai}
              onAdd={ilOps.add} onDelete={ilOps.delete} onUpdate={ilOps.update} />
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-3 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={updateConfig.isPending}
              onClick={handleSave}
            >
              {updateConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Rates
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Labour Detail Dialog ──────────────────────────────────────────────────

function LabourDetailDialog({ labour }: { labour: { id: string; name?: string | null; labourCode?: string | null; phone?: string | null; address?: string | null; upiId?: string | null; upiQrUrl?: string | null; } }) {
  const [open, setOpen] = useState(false);

  // Reset state when dialog closes
  const handleOpenChange = (o: boolean) => {
    setOpen(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  {labour.name || <span className="text-muted-foreground italic">No name yet</span>}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">Profile filled by labour</CardDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {labour.labourCode && (
                  <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary">
                    <IdCard className="h-3 w-3 mr-1" />{labour.labourCode}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {labour.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" /><span>{labour.phone}</span>
              </div>
            )}
            {labour.address && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span className="line-clamp-2">{labour.address}</span>
              </div>
            )}
            {labour.upiId && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{labour.upiId}</span>
              </div>
            )}
            {labour.upiQrUrl && (
              <div className="mt-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <QrCode className="h-3.5 w-3.5" /><span>UPI QR Code</span>
                </div>
                <div className="border rounded-md p-2 inline-block bg-white">
                  <img src={labour.upiQrUrl} alt="UPI QR" className="h-28 w-28 object-contain"
                    onError={e => (e.currentTarget.style.display = "none")} />
                </div>
              </div>
            )}
            {!labour.phone && !labour.address && !labour.upiId && (
              <p className="text-xs text-muted-foreground italic">Profile not filled yet</p>
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Labour Details — {labour.name || "Labour"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage labour profile and individual rate configurations.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Left Panel: Labour Profile Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
              <IdCard className="h-5 w-5 text-blue-600" />
              Profile Information
            </h3>
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {labour.name || <span className="text-muted-foreground italic">Not set</span>}</p>
              <p><strong>Labour ID:</strong> {labour.labourCode || <span className="text-muted-foreground italic">Not set</span>}</p>
              <p><strong>Phone:</strong> {labour.phone || <span className="text-muted-foreground italic">Not set</span>}</p>
              <p><strong>Address:</strong> {labour.address || <span className="text-muted-foreground italic">Not set</span>}</p>
              <p><strong>UPI ID:</strong> {labour.upiId || <span className="text-muted-foreground italic">Not set</span>}</p>
              {labour.upiQrUrl && (
                <div className="mt-4">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <QrCode className="h-3.5 w-3.5" /><span>UPI QR Code</span>
                  </p>
                  <div className="border rounded-md p-2 inline-block bg-white">
                    <img src={labour.upiQrUrl} alt="UPI QR" className="h-28 w-28 object-contain"
                      onError={e => (e.currentTarget.style.display = "none")} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Rate Configuration */}
          <div className="border-l pl-6 -ml-6 md:ml-0 md:pl-0 md:border-l-0 md:border-t md:pt-6">
            <LabourRateConfigPanel labour={labour} dialogOpen={open} setDialogOpen={setOpen} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LabourManagementPage() {
  const { data: labourProfiles = [], isLoading } = useLabourProfiles();
  const createLabour = useCreateLabour();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<CreateLabourUser>({
    resolver: zodResolver(createLabourUserSchema),
    defaultValues: { email: "", password: "", name: "", labourCode: "" },
  });

  function onSubmit(data: CreateLabourUser) {
    createLabour.mutate(data, {
      onSuccess: () => { form.reset(); setDialogOpen(false); },
    });
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Labour Management</h2>
            <p className="text-muted-foreground mt-1">
              Create and manage labour accounts. Click on any labour card to view details and configure individual salary rates.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="h-4 w-4" />Add Labour</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Create Labour Account</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Labour's name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="labourCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Labour ID / Code</FormLabel>
                      <FormControl><Input placeholder="e.g. LAB001" {...field} /></FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">A unique identifier to differentiate labours.</p>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Login Email</FormLabel><FormControl><Input type="email" placeholder="labour@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Login Password</FormLabel><FormControl><Input type="password" placeholder="Min. 6 characters" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createLabour.isPending}>
                    {createLabour.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</> : "Create Account"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <Users className="h-7 w-7 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Labour</p>
                  <p className="text-2xl font-bold">{labourProfiles.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Labour List */}
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : labourProfiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No labour accounts yet.</p>
              <p className="text-sm mt-1">Click <strong>"Add Labour"</strong> to create the first account.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {labourProfiles.map((labour) => (
              <LabourDetailDialog key={labour.id} labour={labour} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
