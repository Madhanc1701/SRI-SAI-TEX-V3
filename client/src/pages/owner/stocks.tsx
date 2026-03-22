import { useState, useEffect } from "react";
import {
  useStocks,
  useCreateStock,
  useNextStockNo,
  useStock,
  useUpdateStock,
} from "@/hooks/use-stocks";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Package, Search, Edit2, Loader2, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createStockWithItemsSchema, type CreateStockWithItems } from "@shared/routes";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

// ─── Stock View / Edit Dialog ─────────────────────────────────────────────────
function StockViewEditDialog({
  stockId,
  open,
  onClose,
}: {
  stockId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useStock(stockId);
  const updateStock = useUpdateStock();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<CreateStockWithItems>({
    resolver: zodResolver(createStockWithItemsSchema),
    defaultValues: {
      stock: { stockNo: "", companyName: "", stockDate: "", totalAmount: "0", ownerUserId: "" },
      items: [],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  useEffect(() => {
    if (data) {
      form.reset({
        stock: {
          stockNo: data.stock.stockNo,
          companyName: data.stock.companyName ?? "",
          stockDate: data.stock.stockDate,
          totalAmount: data.stock.totalAmount ?? "0",
          ownerUserId: data.stock.ownerUserId,
        },
        items: data.items.map((it: any) => ({
          stockId: it.stockId,
          slNo: it.slNo,
          colour: it.colour ?? "",
          no: it.no ?? 0,
          weight: it.weight ?? 0,
          count: it.count ?? 0,
          amount: it.amount ?? "0",
        })),
      });
    }
  }, [data]);

  function onSubmit(formData: CreateStockWithItems) {
    const total = formData.items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    formData.stock.totalAmount = total.toString();
    formData.stock.ownerUserId = user?.id ?? formData.stock.ownerUserId;
    updateStock.mutate(
      { id: stockId, stock: formData.stock, items: formData.items },
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
              <DialogTitle>{isEditing ? "Edit Stock" : "Stock Details"}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Modify the stock and save changes." : "View stock details. Click Edit to make changes."}
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
                <FormField
                  control={form.control}
                  name="stock.stockNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock No</FormLabel>
                      <FormControl>
                        <Input {...field} disabled className="bg-gray-50 font-mono font-semibold" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock.stockDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={!isEditing} className={!isEditing ? "bg-gray-50" : ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock.companyName"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} disabled={!isEditing} className={!isEditing ? "bg-gray-50" : ""} placeholder="Enter company name" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Items</h3>
                  {isEditing && (
                    <Button
                      type="button" variant="outline" size="sm"
                      onClick={() => append({ slNo: fields.length + 1, colour: "", no: 0, weight: 0, count: 0, amount: "0" })}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Item
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
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
                        <FormField control={form.control} name={`items.${index}.weight`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Weight</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} value={field.value ?? 0} onChange={e => field.onChange(parseInt(e.target.value) || 0)} disabled={!isEditing} className={`h-9 ${!isEditing ? "bg-gray-50" : ""}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField control={form.control} name={`items.${index}.count`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Count</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} value={field.value ?? 0} onChange={e => field.onChange(parseInt(e.target.value) || 0)} disabled={!isEditing} className={`h-9 ${!isEditing ? "bg-gray-50" : ""}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-3">
                        <FormField control={form.control} name={`items.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Amount (₹)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} value={field.value ?? "0"} disabled={!isEditing} className={`h-9 ${!isEditing ? "bg-gray-50" : ""}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      {isEditing && (
                        <div className="col-span-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10 h-9 w-full text-xs">
                            ✕
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-lg font-bold">
                  Total: ₹{Number(data?.stock?.totalAmount ?? 0).toLocaleString()}
                </div>
                {isEditing && (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button type="submit" disabled={updateStock.isPending}>
                      {updateStock.isPending ? "Saving…" : "Save Changes"}
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

// ─── Create Stock Form ────────────────────────────────────────────────────────
function CreateStockForm({ onSuccess }: { onSuccess: () => void }) {
  const createStock = useCreateStock();
  const { user } = useAuth();
  const { data: nextStockNo, isLoading: stockNoLoading } = useNextStockNo();

  const form = useForm<CreateStockWithItems>({
    resolver: zodResolver(createStockWithItemsSchema),
    defaultValues: {
      stock: {
        stockNo: "",
        companyName: "",
        stockDate: new Date().toISOString().split("T")[0],
        totalAmount: "0",
        ownerUserId: user?.id ?? "",
      },
      items: [{ slNo: 1, colour: "", no: 0, weight: 0, count: 0, amount: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  useEffect(() => {
    if (nextStockNo) form.setValue("stock.stockNo", nextStockNo);
  }, [nextStockNo]);

  useEffect(() => {
    if (user?.id) form.setValue("stock.ownerUserId", user.id);
  }, [user?.id]);

  function onSubmit(data: CreateStockWithItems) {
    const total = data.items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    data.stock.totalAmount = total.toString();
    data.stock.ownerUserId = user?.id ?? data.stock.ownerUserId;
    createStock.mutate(data, { onSuccess: () => onSuccess() });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Stock No + Date */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="stock.stockNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock No</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    readOnly
                    className="bg-blue-50 font-mono font-semibold text-blue-800 border-blue-200"
                    placeholder={stockNoLoading ? "Loading…" : ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stock.stockDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Company Name — full width, above items */}
        <FormField
          control={form.control}
          name="stock.companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder="Enter company / supplier name" />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Items */}
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-lg bg-muted/10">
              <div className="col-span-1 text-center font-bold text-muted-foreground pt-6">
                {index + 1}
              </div>
              <div className="col-span-2">
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
                <FormField control={form.control} name={`items.${index}.weight`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Weight</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? 0} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-9" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-2">
                <FormField control={form.control} name={`items.${index}.count`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Count</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? 0} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-9" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-3">
                <FormField control={form.control} name={`items.${index}.amount`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? "0"} className="h-9" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-2 flex gap-1 pb-0.5">
                {index === fields.length - 1 && (
                  <Button type="button" size="sm" onClick={() => append({ slNo: fields.length + 1, colour: "", no: 0, weight: 0, count: 0, amount: "0" })}>
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
                {fields.length > 1 && (
                  <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => remove(index)}>
                    ✕
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button type="submit" className="w-full" disabled={createStock.isPending}>
          {createStock.isPending ? "Saving..." : "Save Stock Batch"}
        </Button>
      </form>
    </Form>
  );
}

// ─── Stock Filter Panel ───────────────────────────────────────────────────────
interface StockFilters {
  filterDate: string;
  filterColour: string;
}

function StockFilterPanel({ filters, onChange, onClear }: {
  filters: StockFilters;
  onChange: (key: keyof StockFilters, value: string) => void;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasFilters = filters.filterDate !== "" || filters.filterColour !== "";

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 text-sm font-medium"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span>Filter Stocks</span>
          {hasFilters && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Active</span>
          )}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t pt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            <Input
              type="date"
              value={filters.filterDate}
              onChange={e => onChange("filterDate", e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Colour</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search colour…"
                value={filters.filterColour}
                onChange={e => onChange("filterColour", e.target.value)}
                className="h-9 pl-8"
              />
            </div>
          </div>
          {hasFilters && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={onClear}
                className="h-9 px-3 text-sm text-muted-foreground border rounded-md hover:bg-muted/50 w-full"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default function StockPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [viewStockId, setViewStockId] = useState<string | null>(null);

  // Filters
  const [filterDate, setFilterDate] = useState("");
  const [filterColour, setFilterColour] = useState("");

  const activeFilters = {
    ...(filterDate ? { startDate: filterDate, endDate: filterDate } : {}),
    ...(filterColour ? { colour: filterColour } : {}),
  };

  const { data: stocks, isLoading } = useStocks(
    Object.keys(activeFilters).length > 0 ? activeFilters : undefined
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Stock Management</h2>
            <p className="text-muted-foreground">Track inventory and batches</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg hover:shadow-xl transition-all">
                <Plus className="mr-2 h-5 w-5" /> Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Stock Batch</DialogTitle>
                <DialogDescription>Enter stock batch details and items below.</DialogDescription>
              </DialogHeader>
              <CreateStockForm onSuccess={() => setIsOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Panel */}
        <StockFilterPanel
          filters={{ filterDate, filterColour }}
          onChange={(key, value) => {
            if (key === "filterDate") setFilterDate(value);
            else setFilterColour(value);
          }}
          onClear={() => { setFilterDate(""); setFilterColour(""); }}
        />

        {/* Stock Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
              <span className="text-muted-foreground">Loading…</span>
            </div>
          ) : stocks?.length === 0 ? (
            <div className="col-span-full text-center p-8 bg-white rounded-lg border border-dashed">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No stock records found.</p>
            </div>
          ) : (
            stocks?.map((stock) => (
              <div
                key={stock.id}
                className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
                onClick={() => setViewStockId(stock.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold">
                        #{stock.stockNo}
                      </span>
                    </div>
                    {(stock as any).companyName && (
                      <p className="font-semibold mt-1">{(stock as any).companyName}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(stock.stockDate), "dd MMM yyyy")}
                    </p>
                  </div>
                  <Package className="h-5 w-5 text-blue-500 flex-shrink-0" />
                </div>
                <div className="pt-3 border-t flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Total Value</span>
                  <span className="font-bold text-lg">₹{Number(stock.totalAmount).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stock View/Edit Dialog */}
      {viewStockId && (
        <StockViewEditDialog
          stockId={viewStockId}
          open={!!viewStockId}
          onClose={() => setViewStockId(null)}
        />
      )}
    </Layout>
  );
}
