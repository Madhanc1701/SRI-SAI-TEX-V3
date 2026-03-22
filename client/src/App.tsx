import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import OwnerDashboard from "@/pages/owner/dashboard";
import BillingPage from "@/pages/owner/bills";
import StockPage from "@/pages/owner/stocks";
import SalariesPage from "@/pages/owner/salaries";
import LabourManagementPage from "@/pages/owner/labour";
import LabourHome from "@/pages/labour/home";
import LabourHistory from "@/pages/labour/history";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

function Router() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={AuthPage} />
      
      {/* Owner Routes */}
      <Route path="/owner" component={OwnerDashboard} />
      <Route path="/owner/bills" component={BillingPage} />
      <Route path="/owner/stocks" component={StockPage} />
      <Route path="/owner/salaries" component={SalariesPage} />
      <Route path="/owner/labour" component={LabourManagementPage} />

      {/* Labour Routes */}
      <Route path="/labour" component={LabourHome} />
      <Route path="/labour/history" component={LabourHistory} />
      <Route path="/labour/profile" component={() => <div>Profile Page (Placeholder)</div>} />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
