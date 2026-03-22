import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  Users,
  Briefcase, 
  LogOut, 
  Menu, 
  X,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, isOwner, isLabour } = useAuth();
  const [location] = useLocation();
  const logout = useLogout();
  const [open, setOpen] = useState(false);

  // Define navigation based on role
  const ownerNav = [
    { href: "/owner", label: "Dashboard", icon: LayoutDashboard },
    { href: "/owner/bills", label: "Billing", icon: Receipt },
    { href: "/owner/stocks", label: "Stock Mgmt", icon: Package },
    { href: "/owner/salaries", label: "Salaries", icon: CreditCard },
    { href: "/owner/labour", label: "Labour", icon: Users },
  ];

  const labourNav = [
    { href: "/labour", label: "Work Entry", icon: Briefcase },
    { href: "/labour/history", label: "My History", icon: LayoutDashboard },
    { href: "/labour/profile", label: "My Profile", icon: Users },
  ];

  const navItems = isOwner ? ownerNav : isLabour ? labourNav : [];

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <div className={cn("min-h-screen bg-background", isLabour && "labour-theme")}>
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur shadow-sm md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[350px]">
            <nav className="flex flex-col gap-4 mt-8">
              <div className="px-2 mb-4">
                <h2 className="text-2xl font-display font-bold text-primary">SRI SAI TEX</h2>
                <p className="text-sm text-muted-foreground">{isOwner ? "Owner Portal" : "Labour Portal"}</p>
              </div>
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={location === item.href ? "default" : "ghost"}
                    className="w-full justify-start gap-3 text-lg"
                    onClick={() => setOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                </Link>
              ))}
              <div className="mt-auto pt-8 border-t">
                <Button 
                  variant="destructive" 
                  className="w-full justify-start gap-3"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-display text-primary tracking-wide">
            SRI SAI TEX
          </h1>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh_-_theme(spacing.16))] md:min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden border-r bg-muted/40 md:block w-[280px] fixed h-screen overflow-y-auto">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-16 items-center border-b px-6">
              <h1 className="text-xl font-bold font-display text-primary tracking-wide">
                SRI SAI TEX
              </h1>
            </div>
            <div className="flex-1 overflow-auto py-2 px-4">
              <nav className="grid items-start px-2 text-sm font-medium gap-2">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={location === item.href ? "default" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </nav>
            </div>
            <div className="mt-auto p-6 border-t">
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{isOwner ? 'Owner' : 'Labour'}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-[280px] p-4 md:p-8 bg-muted/20">
          <div className="mx-auto max-w-6xl animate-slide-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
