import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProfileSchema } from "@shared/routes";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { User, Phone, MapPin, Wallet, QrCode, IdCard, Loader2 } from "lucide-react";
import { z } from "zod";

const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  upiId: z.string().optional(),
  upiQrUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});
type ProfileForm = z.infer<typeof profileFormSchema>;

export default function LabourProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/profiles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await fetch(`/api/profiles/${user!.id}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const res = await fetch(`/api/profiles/${user!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", user?.id] });
      toast({ title: "Profile Saved", description: "Your profile has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    },
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      upiId: "",
      upiQrUrl: "",
    },
  });

  // Populate form once profile loads
  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        upiId: profile.upiId ?? "",
        upiQrUrl: profile.upiQrUrl ?? "",
      });
    }
  }, [profile]);

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
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-orange-600">My Profile</h2>
          <p className="text-muted-foreground mt-1">Update your personal information</p>
        </div>

        {/* Labour ID Badge */}
        {profile?.labourCode && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <IdCard className="h-6 w-6 text-orange-600" />
                <div>
                  <p className="text-xs text-orange-700 font-medium uppercase tracking-wide">Your Labour ID</p>
                  <p className="text-2xl font-bold text-orange-800 tracking-widest">{profile.labourCode}</p>
                </div>
                <Badge className="ml-auto bg-orange-600 text-white">Labour</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email (read-only) */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Account Email</p>
            <p className="font-medium text-sm">{user?.email}</p>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card className="border-t-4 border-t-orange-500 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>Fill in your contact and payment information</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => updateProfile.mutate(data))} className="space-y-4">
                
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> Full Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+91 98765 43210" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Address
                      </FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                          placeholder="Your full address"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* UPI ID */}
                <FormField
                  control={form.control}
                  name="upiId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5" /> UPI ID
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="yourname@upi" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* UPI QR URL */}
                <FormField
                  control={form.control}
                  name="upiQrUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <QrCode className="h-3.5 w-3.5" /> UPI QR Code Image URL
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://... (link to your QR image)"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                      {field.value && (
                        <div className="mt-2 border rounded-md p-2 inline-block bg-white">
                          <img
                            src={field.value}
                            alt="UPI QR Code"
                            className="h-32 w-32 object-contain"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</>
                  ) : "Save Profile"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
