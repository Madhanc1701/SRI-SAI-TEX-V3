import { useState } from "react";
import { Layout } from "@/components/layout";
import { useLabourProfiles, useCreateLabour } from "@/hooks/use-labour";
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
import { UserPlus, Users, IdCard, Phone, MapPin, Loader2 } from "lucide-react";

export default function LabourManagementPage() {
  const { data: labourProfiles = [], isLoading } = useLabourProfiles();
  const createLabour = useCreateLabour();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<CreateLabourUser>({
    resolver: zodResolver(createLabourUserSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      labourCode: "",
    },
  });

  function onSubmit(data: CreateLabourUser) {
    createLabour.mutate(data, {
      onSuccess: () => {
        form.reset();
        setDialogOpen(false);
      },
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
              Create and manage labour accounts. Profiles are filled by each labour.
            </p>
          </div>

          {/* Create Labour Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Labour
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Labour Account</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Labour's name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="labourCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Labour ID / Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. LAB001" {...field} />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          A unique identifier to differentiate labours.
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Login Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="labour@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Login Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Min. 6 characters"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createLabour.isPending}
                  >
                    {createLabour.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating…</>
                    ) : "Create Account"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Card */}
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
              <Card key={labour.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {labour.name || <span className="text-muted-foreground italic">No name yet</span>}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Profile filled by labour
                      </CardDescription>
                    </div>
                    {labour.labourCode && (
                      <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary">
                        <IdCard className="h-3 w-3 mr-1" />
                        {labour.labourCode}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  {labour.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{labour.phone}</span>
                    </div>
                  )}
                  {labour.address && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{labour.address}</span>
                    </div>
                  )}
                  {labour.upiId && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                        UPI: {labour.upiId}
                      </span>
                    </div>
                  )}
                  {!labour.phone && !labour.address && !labour.upiId && (
                    <p className="text-xs text-muted-foreground italic">
                      Profile not filled yet
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
