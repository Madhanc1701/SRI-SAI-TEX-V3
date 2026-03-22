import { useState } from "react";
import { Layout } from "@/components/layout";
import { useWorkRecords, useLabourProfiles, useSalaries, useCreateSalaryPayment, useUpdateSalaryPayment } from "@/hooks/use-labour";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, IndianRupee, Clock, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SalariesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: workRecords = [], isLoading: loadingRecords } = useWorkRecords();
  const { data: labourProfiles = [], isLoading: loadingProfiles } = useLabourProfiles();
  const { data: salaryPayments = [], isLoading: loadingSalaries } = useSalaries();
  const createPayment = useCreateSalaryPayment();
  const updatePayment = useUpdateSalaryPayment();

  // State for per-labour salary amount input
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const isLoading = loadingRecords || loadingProfiles || loadingSalaries;

  // Map labourUserId -> profile
  const profileMap = Object.fromEntries(labourProfiles.map((p) => [p.id, p]));

  // Group work records by labourUserId
  const recordsByLabour: Record<string, typeof workRecords> = {};
  for (const record of workRecords) {
    if (!recordsByLabour[record.labourUserId]) {
      recordsByLabour[record.labourUserId] = [];
    }
    recordsByLabour[record.labourUserId].push(record);
  }

  // Pending salary payments totals
  const pendingPayments = salaryPayments.filter((p) => p.status === "PENDING");
  const totalPending = pendingPayments.reduce((sum, p) => sum + Number(p.salaryAmount), 0);

  const handleCreatePayment = async (labourUserId: string) => {
    const amount = amounts[labourUserId];
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }
    if (!user?.id) return;

    createPayment.mutate({
      ownerUserId: user.id,
      labourUserId,
      salaryAmount: amount,
      status: "PENDING",
    }, {
      onSuccess: () => {
        setAmounts((prev) => ({ ...prev, [labourUserId]: "" }));
      }
    });
  };

  const handleMarkPaid = (paymentId: string) => {
    updatePayment.mutate({
      id: paymentId,
      status: "PAID",
      paidDate: new Date().toISOString().split("T")[0],
    });
  };

  const handleMarkPending = (paymentId: string) => {
    updatePayment.mutate({ id: paymentId, status: "PENDING" });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Salary Management</h2>
          <p className="text-muted-foreground mt-1">
            View labour work records, calculate and manage salary payments.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending Payments</p>
                  <p className="text-2xl font-bold">{pendingPayments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <IndianRupee className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Pending Amount</p>
                  <p className="text-2xl font-bold">₹{totalPending.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Labour</p>
                  <p className="text-2xl font-bold">{labourProfiles.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Salary Alert */}
        {pendingPayments.length > 0 && (
          <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                    {pendingPayments.length} salary payment(s) still pending to be paid
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    Total pending: ₹{totalPending.toLocaleString()}. Mark them as paid once transferred.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Per-Labour Sections */}
        {Object.keys(recordsByLabour).length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
              No work records found. Labour members need to submit their records first.
            </CardContent>
          </Card>
        ) : (
          Object.entries(recordsByLabour).map(([labourId, records]) => {
            const profile = profileMap[labourId];
            const labourPayments = salaryPayments.filter((p) => p.labourUserId === labourId);
            const labourPending = labourPayments.filter((p) => p.status === "PENDING");
            const labourPendingTotal = labourPending.reduce((s, p) => s + Number(p.salaryAmount), 0);

            return (
              <Card key={labourId} className="shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-lg">
                        {profile?.name || "Unknown Labour"}
                        {profile?.labourCode && (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            [{profile.labourCode}]
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>{records.length} work record(s)</CardDescription>
                    </div>
                    {labourPendingTotal > 0 && (
                      <Badge variant="destructive" className="text-sm px-3 py-1">
                        ₹{labourPendingTotal.toLocaleString()} Pending
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Work Records Table */}
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Date</th>
                          <th className="px-4 py-2 text-left font-medium">Colour</th>
                          <th className="px-4 py-2 text-left font-medium">Length</th>
                          <th className="px-4 py-2 text-left font-medium">Set Count</th>
                          <th className="px-4 py-2 text-right font-medium">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((rec, idx) => (
                          <tr key={rec.id} className={idx % 2 === 0 ? "bg-white dark:bg-background" : "bg-muted/20"}>
                            <td className="px-4 py-2">{rec.workDate}</td>
                            <td className="px-4 py-2">{rec.colour || "—"}</td>
                            <td className="px-4 py-2">{rec.length ?? "—"}</td>
                            <td className="px-4 py-2">{rec.setCount ?? "—"}</td>
                            <td className="px-4 py-2 text-right font-medium">
                              {rec.amount ? `₹${Number(rec.amount).toLocaleString()}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Create Salary Payment */}
                  <div className="border rounded-md p-4 bg-muted/30 space-y-3">
                    <p className="font-semibold text-sm">Add Salary Payment</p>
                    <div className="flex gap-3 items-end flex-wrap">
                      <div className="flex-1 min-w-[180px]">
                        <Label htmlFor={`amount-${labourId}`} className="text-xs mb-1 block">
                          Salary Amount (₹)
                        </Label>
                        <Input
                          id={`amount-${labourId}`}
                          type="number"
                          placeholder="Enter amount"
                          value={amounts[labourId] || ""}
                          onChange={(e) =>
                            setAmounts((prev) => ({ ...prev, [labourId]: e.target.value }))
                          }
                        />
                      </div>
                      <Button
                        onClick={() => handleCreatePayment(labourId)}
                        disabled={createPayment.isPending}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {createPayment.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Add Payment
                      </Button>
                    </div>
                  </div>

                  {/* Salary Payment History for this labour */}
                  {labourPayments.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">Payment History</p>
                      <div className="space-y-2">
                        {labourPayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-3 rounded-md border bg-background flex-wrap gap-2"
                          >
                            <div className="flex items-center gap-3">
                              {payment.status === "PAID" ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <Clock className="h-5 w-5 text-yellow-500" />
                              )}
                              <div>
                                <p className="font-semibold">₹{Number(payment.salaryAmount).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">
                                  Added: {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "—"}
                                  {payment.paidDate && ` • Paid: ${payment.paidDate}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={payment.status === "PAID" ? "default" : "secondary"}
                                className={
                                  payment.status === "PAID"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                }
                              >
                                {payment.status === "PAID" ? "Payment Completed" : "Need to Pay"}
                              </Badge>
                              {payment.status === "PENDING" ? (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleMarkPaid(payment.id)}
                                  disabled={updatePayment.isPending}
                                >
                                  Mark as Paid
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkPending(payment.id)}
                                  disabled={updatePayment.isPending}
                                >
                                  Mark Pending
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </Layout>
  );
}
