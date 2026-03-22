import { useBills } from "@/hooks/use-billing";
import { useStocks } from "@/hooks/use-stocks";
import { useLabourProfiles } from "@/hooks/use-labour";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Users, Package, TrendingUp, IndianRupee } from "lucide-react";
import { Layout } from "@/components/layout";

export default function OwnerDashboard() {
  const { data: bills } = useBills();
  const { data: stocks } = useStocks();
  const { data: labours } = useLabourProfiles();

  // Basic analytics logic
  const totalRevenue = bills?.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0) || 0;
  const totalStockValue = stocks?.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0) || 0;
  
  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white px-3 py-1 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            System Online
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm border-l-4 border-l-primary hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                From bills generated
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-blue-400 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Stock</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stocks?.length || 0} Batches</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                Value: ₹{totalStockValue.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Labour</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{labours?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Registered workers
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-orange-400 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-xs text-muted-foreground mt-1">
                Requiring attention
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bills?.slice(0, 5).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{bill.companyName}</p>
                      <p className="text-xs text-muted-foreground">{bill.billNo}</p>
                    </div>
                    <div className="font-bold">₹{Number(bill.totalAmount).toLocaleString()}</div>
                  </div>
                ))}
                {!bills?.length && <p className="text-sm text-muted-foreground">No recent bills found.</p>}
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-3 shadow-sm bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
               {/* Quick links handled by Sidebar, this is visual filler for dashboard completeness */}
               <div className="p-3 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors">
                 <p className="font-medium">Create New Bill</p>
                 <p className="text-xs opacity-70">Generate invoice PDF</p>
               </div>
               <div className="p-3 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors">
                 <p className="font-medium">Add Stock</p>
                 <p className="text-xs opacity-70">Update inventory</p>
               </div>
               <div className="p-3 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors">
                 <p className="font-medium">Register Labour</p>
                 <p className="text-xs opacity-70">Add new employee</p>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
