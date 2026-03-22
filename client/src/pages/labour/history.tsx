import { Layout } from "@/components/layout";
import { useWorkRecords, useSalaries } from "@/hooks/use-labour";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, IndianRupee, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export default function LabourHistory() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: workRecords = [], isLoading: loadingRecords } = useWorkRecords(
    userId ? { labourUserId: userId } : undefined
  );
  const { data: salaryPayments = [], isLoading: loadingSalaries } = useSalaries(
    userId ? { labourUserId: userId } : undefined
  );

  const isLoading = loadingRecords || loadingSalaries;

  const pendingPayments = salaryPayments.filter((p) => p.status === "PENDING");
  const paidPayments = salaryPayments.filter((p) => p.status === "PAID");
  const totalPending = pendingPayments.reduce((sum, p) => sum + Number(p.salaryAmount), 0);
  const totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.salaryAmount), 0);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-orange-600">My Work History</h2>
          <p className="text-muted-foreground mt-1">Your work records and salary payment status.</p>
        </div>

        {/* Pending Alert */}
        {pendingPayments.length > 0 && (
          <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                    Salary Pending: ₹{totalPending.toLocaleString()}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    {pendingPayments.length} payment(s) are yet to be paid by the owner.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <Clock className="h-7 w-7 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Pending Salary</p>
                  <p className="text-xl font-bold">₹{totalPending.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <IndianRupee className="h-7 w-7 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-xl font-bold">₹{totalPaid.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Work Records */}
        <Card className="border-t-4 border-t-orange-500">
          <CardHeader>
            <CardTitle className="text-lg">Work Records</CardTitle>
          </CardHeader>
          <CardContent>
            {workRecords.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">
                No work records found. Submit your first record from the Work Entry page.
              </p>
            ) : (
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
                    {workRecords.map((rec, idx) => (
                      <tr
                        key={rec.id}
                        className={idx % 2 === 0 ? "bg-white dark:bg-background" : "bg-muted/20"}
                      >
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
                  <tfoot className="border-t bg-muted/30">
                    <tr>
                      <td colSpan={4} className="px-4 py-2 font-semibold text-right">
                        Total
                      </td>
                      <td className="px-4 py-2 text-right font-bold">
                        ₹
                        {workRecords
                          .reduce((sum, r) => sum + Number(r.amount || 0), 0)
                          .toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salary Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Salary Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {salaryPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">
                No salary payments recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {salaryPayments.map((payment) => (
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
                          {payment.createdAt
                            ? new Date(payment.createdAt).toLocaleDateString()
                            : "—"}
                          {payment.paidDate && ` • Paid on: ${payment.paidDate}`}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={
                        payment.status === "PAID"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                      }
                    >
                      {payment.status === "PAID" ? "✓ Payment Completed" : "⏳ Need to Pay"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
