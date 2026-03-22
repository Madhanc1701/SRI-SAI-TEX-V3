import { useState, useEffect, useRef } from "react";
import { useBills, useCreateBill, useNextBillNo, useFrequentCompanies, useUpdateBill } from "@/hooks/use-billing";
import { useBill } from "@/hooks/use-billing";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, FileText, Trash2, Zap, Edit2, Download, X, Loader2, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBillWithItemsSchema, type CreateBillWithItems } from "@shared/routes";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Bill } from "@shared/schema";

// ─── Quick Bills Section ───────────────────────────────────────────────────────
function QuickBillSection({ onSelectCompany }: { onSelectCompany: (name: string) => void }) {
  const { data: companies, isLoading } = useFrequentCompanies();

  if (isLoading || !companies || companies.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-5 w-5 text-yellow-500 fill-yellow-400" />
        <h3 className="font-bold text-sm uppercase tracking-wide text-gray-800">⚡ Frequent Companies</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {companies.map((c) => (
          <button
            key={c.companyName}
            onClick={() => onSelectCompany(c.companyName)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-blue-300 bg-blue-50 hover:bg-blue-600 hover:border-blue-600 hover:text-white hover:shadow-lg transition-all text-sm font-semibold text-blue-900 cursor-pointer group"
          >
            <span>{c.companyName}</span>
            <Badge
              variant="secondary"
              className="text-xs px-1.5 py-0 h-5 bg-blue-200 text-blue-800 group-hover:bg-blue-500 group-hover:text-white transition-colors"
            >
              {c.count}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── PDF Preview Dialog ────────────────────────────────────────────────────────
function PdfPreviewDialog({
  billId,
  billNo,
  open,
  onClose,
}: {
  billId: string;
  billNo: string;
  open: boolean;
  onClose: () => void;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !billId) return;

    setIsLoading(true);
    setError(null);
    setPdfUrl(null);

    fetch(`/api/bills/${billId}/pdf`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to generate PDF");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        blobRef.current = url;
        setPdfUrl(url);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));

    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [open, billId]);

  function handleDownload() {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `Bill-${billNo}.pdf`;
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <DialogTitle>Bill #{billNo} — PDF Preview</DialogTitle>
            <DialogDescription>Review the bill before downloading.</DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm" onClick={handleDownload} disabled={!pdfUrl}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Download className="h-4 w-4 mr-1" /> Download
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-gray-100">
          {isLoading && (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-3 text-muted-foreground">Generating PDF…</span>
            </div>
          )}
          {error && (
            <div className="h-full flex items-center justify-center text-destructive">{error}</div>
          )}
          {pdfUrl && (
            <iframe src={pdfUrl} className="w-full h-full border-0" title="Bill PDF Preview" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bill View / Edit Dialog ───────────────────────────────────────────────────
function BillViewEditDialog({
  billId,
  open,
  onClose,
}: {
  billId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useBill(billId);
  const updateBill = useUpdateBill();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<CreateBillWithItems>({
    resolver: zodResolver(createBillWithItemsSchema),
    defaultValues: {
      bill: { billNo: "", companyName: "", billDate: "", totalAmount: "0", ownerUserId: "" },
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchItems = form.watch("items");
  const total = watchItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  useEffect(() => {
    if (data) {
      form.reset({
        bill: {
          billNo: data.bill.billNo,
          companyName: data.bill.companyName,
          billDate: data.bill.billDate,
          totalAmount: data.bill.totalAmount ?? "0",
          ownerUserId: data.bill.ownerUserId,
        },
        items: data.items.map((it: any) => ({
          billId: it.billId,
          slNo: it.slNo,
          colour: it.colour ?? "",
          illai: it.illai ?? 0,
          lengthM: it.lengthM ?? 0,
          quantity: it.quantity ?? 0,
          amount: it.amount ?? "0",
        })),
      });
    }
  }, [data]);

  function onSubmit(formData: CreateBillWithItems) {
    formData.bill.totalAmount = total.toString();
    formData.bill.ownerUserId = user?.id ?? formData.bill.ownerUserId;
    updateBill.mutate(
      { id: billId, bill: formData.bill, items: formData.items },
      {
        onSuccess: () => {
          setIsEditing(false);
          onClose();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setIsEditing(false); onClose(); } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{isEditing ? "Edit Bill" : "Bill Details"}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Modify the bill and save changes." : "View bill details. Click Edit to make changes."}
              </DialogDescription>
            </div>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                <Edit2 className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="bill.billNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill No</FormLabel>
                      <FormControl>
                        <Input {...field} disabled className="bg-gray-50 font-mono font-semibold" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="bill.billDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={!isEditing} className={!isEditing ? "bg-gray-50" : ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="bill.companyName"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} className={!isEditing ? "bg-gray-50" : ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Items</h3>
                  {isEditing && (
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => append({ slNo: fields.length + 1, colour: "", illai: 0, lengthM: 0, quantity: 0, amount: "0" })}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Item
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-1">
                        <FormLabel className="text-xs">Sl No</FormLabel>
                        <Input value={index + 1} disabled className="h-9 bg-gray-50" />
                      </div>
                      <div className="col-span-3">
                        <FormField control={form.control} name={`items.${index}.colour`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Colour</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ""} disabled={!isEditing} className={`h-9 ${!isEditing ? "bg-gray-50" : ""}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField control={form.control} name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Qty</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} disabled={!isEditing} className={`h-9 ${!isEditing ? "bg-gray-50" : ""}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField control={form.control} name={`items.${index}.lengthM`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Length</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} disabled={!isEditing} className={`h-9 ${!isEditing ? "bg-gray-50" : ""}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-3">
                        <FormField control={form.control} name={`items.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Amount</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} value={field.value ?? "0"} disabled={!isEditing} className={`h-9 ${!isEditing ? "bg-gray-50" : ""}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      {isEditing && (
                        <div className="col-span-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-lg font-bold">
                  Total: ₹{(isEditing ? total : Number(data?.bill?.totalAmount ?? 0)).toLocaleString()}
                </div>
                {isEditing && (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button type="submit" disabled={updateBill.isPending}>
                      {updateBill.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Bill Form ──────────────────────────────────────────────────────────
function CreateBillForm({
  onSuccess,
  prefillCompany,
}: {
  onSuccess: () => void;
  prefillCompany?: string;
}) {
  const createBill = useCreateBill();
  const { user } = useAuth();
  const { data: nextBillNo, isLoading: billNoLoading } = useNextBillNo();

  const form = useForm<CreateBillWithItems>({
    resolver: zodResolver(createBillWithItemsSchema),
    defaultValues: {
      bill: {
        billNo: "",
        companyName: prefillCompany ?? "",
        billDate: new Date().toISOString().split("T")[0],
        totalAmount: "0",
        ownerUserId: user?.id ?? "",
      },
      items: [{ slNo: 1, colour: "", illai: 0, lengthM: 0, quantity: 0, amount: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchItems = form.watch("items");
  const total = watchItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  useEffect(() => {
    if (nextBillNo) form.setValue("bill.billNo", nextBillNo);
  }, [nextBillNo]);

  useEffect(() => {
    if (prefillCompany) form.setValue("bill.companyName", prefillCompany);
  }, [prefillCompany]);

  useEffect(() => {
    if (user?.id) form.setValue("bill.ownerUserId", user.id);
  }, [user?.id]);

  function onSubmit(data: CreateBillWithItems) {
    data.bill.ownerUserId = user?.id ?? data.bill.ownerUserId;
    data.bill.totalAmount = total.toString();
    createBill.mutate(data, { onSuccess: () => onSuccess() });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="bill.billNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bill No</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    readOnly
                    className="bg-blue-50 font-mono font-semibold text-blue-800 border-blue-200"
                    placeholder={billNoLoading ? "Loading…" : ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField control={form.control} name="bill.billDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField control={form.control} name="bill.companyName"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="border rounded-lg p-4 bg-muted/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Items</h3>
            <Button type="button" variant="outline" size="sm"
              onClick={() => append({ slNo: fields.length + 1, colour: "", illai: 0, lengthM: 0, quantity: 0, amount: "0" })}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-1">
                  <FormLabel className="text-xs">Sl No</FormLabel>
                  <Input value={index + 1} disabled className="h-9" />
                </div>
                <div className="col-span-3">
                  <FormField control={form.control} name={`items.${index}.colour`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Colour</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} className="h-9" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <FormField control={form.control} name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Qty</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} className="h-9" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <FormField control={form.control} name={`items.${index}.lengthM`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Length</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} className="h-9" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-3">
                  <FormField control={form.control} name={`items.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Amount</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value ?? "0"} className="h-9" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-lg font-bold">Total: ₹{total.toLocaleString()}</div>
          <Button type="submit" disabled={createBill.isPending} className="min-w-[150px]">
            {createBill.isPending ? "Generating…" : "Generate Bill"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Filter Panel ──────────────────────────────────────────────────────────────
interface BillFilters {
  billNo: string;
  companyName: string;
  startDate: string;
  endDate: string;
  colour: string;
  illai: string;
  lengthM: string;
}

function FilterPanel({ filters, onChange, onClear }: {
  filters: BillFilters;
  onChange: (key: keyof BillFilters, value: string) => void;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasFilters = Object.values(filters).some(v => v !== "");

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 text-sm font-medium"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span>Filter Bills</span>
          {hasFilters && (
            <Badge variant="secondary" className="h-5 text-xs bg-blue-100 text-blue-700">Active</Badge>
          )}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t pt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Bill No</label>
            <Input
              placeholder="e.g. 42"
              value={filters.billNo}
              onChange={e => onChange("billNo", e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Company Name</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={filters.companyName}
                onChange={e => onChange("companyName", e.target.value)}
                className="h-9 pl-8"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">From Date</label>
            <Input type="date" value={filters.startDate} onChange={e => onChange("startDate", e.target.value)} className="h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">To Date</label>
            <Input type="date" value={filters.endDate} onChange={e => onChange("endDate", e.target.value)} className="h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Colour</label>
            <Input placeholder="e.g. Red" value={filters.colour} onChange={e => onChange("colour", e.target.value)} className="h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Illai</label>
            <Input type="number" placeholder="e.g. 5" value={filters.illai} onChange={e => onChange("illai", e.target.value)} className="h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Length (m)</label>
            <Input type="number" placeholder="e.g. 10" value={filters.lengthM} onChange={e => onChange("lengthM", e.target.value)} className="h-9" />
          </div>
          {hasFilters && (
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={onClear} className="h-9 w-full text-muted-foreground">
                Clear All
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Billing Page ─────────────────────────────────────────────────────────
export default function BillingPage() {
  const [filters, setFilters] = useState<BillFilters>({
    billNo: "",
    companyName: "",
    startDate: "",
    endDate: "",
    colour: "",
    illai: "",
    lengthM: "",
  });

  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== "")
  );

  const { data: bills, isLoading } = useBills(
    Object.keys(activeFilters).length > 0 ? activeFilters : undefined
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [prefillCompany, setPrefillCompany] = useState<string | undefined>(undefined);
  const [viewBillId, setViewBillId] = useState<string | null>(null);
  const [pdfBill, setPdfBill] = useState<{ id: string; billNo: string } | null>(null);

  function openQuickBill(companyName: string) {
    setPrefillCompany(companyName);
    setIsCreateOpen(true);
  }

  function openNewBill() {
    setPrefillCompany(undefined);
    setIsCreateOpen(true);
  }

  function handleCreateOpenChange(open: boolean) {
    setIsCreateOpen(open);
    if (!open) setPrefillCompany(undefined);
  }

  function updateFilter(key: keyof BillFilters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({ billNo: "", companyName: "", startDate: "", endDate: "", colour: "", illai: "", lengthM: "" });
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Billing</h2>
            <p className="text-muted-foreground">Manage invoices and generate PDFs</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg hover:shadow-xl transition-all" onClick={openNewBill}>
                <Plus className="mr-2 h-5 w-5" /> New Bill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Bill</DialogTitle>
                <DialogDescription>Fill in the bill details and add items below.</DialogDescription>
              </DialogHeader>
              <CreateBillForm
                key={prefillCompany ?? "new"}
                prefillCompany={prefillCompany}
                onSuccess={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Bills */}
        <QuickBillSection onSelectCompany={openQuickBill} />

        {/* Filter Panel */}
        <FilterPanel filters={filters} onChange={updateFilter} onClear={clearFilters} />

        {/* Bills Table */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Bill No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-5 w-5 animate-spin inline-block mr-2 text-blue-500" />
                    Loading…
                  </TableCell>
                </TableRow>
              ) : bills?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No bills found.
                  </TableCell>
                </TableRow>
              ) : (
                bills?.map((bill) => (
                  <TableRow
                    key={bill.id}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    onClick={() => setViewBillId(bill.id)}
                  >
                    <TableCell className="font-mono font-semibold text-blue-700">#{bill.billNo}</TableCell>
                    <TableCell>{format(new Date(bill.billDate), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium">{bill.companyName}</TableCell>
                    <TableCell className="text-right font-bold">₹{Number(bill.totalAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost" size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPdfBill({ id: bill.id, billNo: bill.billNo });
                        }}
                      >
                        <FileText className="h-4 w-4 mr-1" /> PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Bill View/Edit Dialog */}
      {viewBillId && (
        <BillViewEditDialog
          billId={viewBillId}
          open={!!viewBillId}
          onClose={() => setViewBillId(null)}
        />
      )}

      {/* PDF Preview Dialog */}
      {pdfBill && (
        <PdfPreviewDialog
          billId={pdfBill.id}
          billNo={pdfBill.billNo}
          open={!!pdfBill}
          onClose={() => setPdfBill(null)}
        />
      )}
    </Layout>
  );
}
