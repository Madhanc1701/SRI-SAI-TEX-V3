import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateLabourUser, type InsertLabourWorkRecord, type InsertSalaryPayment } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// === PROFILES ===
export function useLabourProfiles() {
  return useQuery({
    queryKey: [api.profiles.listLabour.path],
    queryFn: async () => {
      const res = await fetch(api.profiles.listLabour.path);
      if (!res.ok) throw new Error("Failed to fetch labour profiles");
      return api.profiles.listLabour.responses[200].parse(await res.json());
    },
  });
}

export function useCreateLabour() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateLabourUser) => {
      const validated = api.profiles.createLabour.input.parse(data);
      const res = await fetch(api.profiles.createLabour.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) throw new Error("Failed to create labour user");
      return api.profiles.createLabour.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.profiles.listLabour.path] });
      toast({
        title: "Labour Added",
        description: "New labour account created successfully.",
      });
    },
  });
}

// === WORK RECORDS ===
export function useWorkRecords(filters?: { labourUserId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: [api.labourWork.list.path, filters],
    queryFn: async () => {
      const url = buildUrl(api.labourWork.list.path);
      const params = new URLSearchParams();
      if (filters?.labourUserId) params.append("labourUserId", filters.labourUserId);
      if (filters?.startDate) params.append("startDate", filters.startDate);
      if (filters?.endDate) params.append("endDate", filters.endDate);

      const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;
      const res = await fetch(fullUrl);
      if (!res.ok) throw new Error("Failed to fetch work records");
      return api.labourWork.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateWorkRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertLabourWorkRecord) => {
      const validated = api.labourWork.create.input.parse(data);
      const res = await fetch(api.labourWork.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) throw new Error("Failed to record work");
      return api.labourWork.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.labourWork.list.path] });
      toast({
        title: "Work Recorded",
        description: "Your work has been saved.",
      });
    },
  });
}

// === SALARIES ===
export function useSalaries(filters?: { labourUserId?: string; status?: 'PENDING' | 'PAID' }) {
  return useQuery({
    queryKey: [api.salaries.list.path, filters],
    queryFn: async () => {
      const url = buildUrl(api.salaries.list.path);
      const params = new URLSearchParams();
      if (filters?.labourUserId) params.append("labourUserId", filters.labourUserId);
      if (filters?.status) params.append("status", filters.status);

      const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;
      const res = await fetch(fullUrl);
      if (!res.ok) throw new Error("Failed to fetch salaries");
      return api.salaries.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSalaryPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertSalaryPayment) => {
      const validated = api.salaries.create.input.parse(data);
      const res = await fetch(api.salaries.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create payment");
      return api.salaries.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.salaries.list.path] });
      toast({
        title: "Payment Recorded",
        description: "Salary payment has been recorded.",
      });
    },
  });
}

export function useUpdateSalaryPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status, paidDate }: { id: string; status: 'PENDING' | 'PAID'; paidDate?: string }) => {
      const res = await fetch(`/api/salaries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paidDate }),
      });
      if (!res.ok) throw new Error("Failed to update payment");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.salaries.list.path] });
      toast({
        title: variables.status === "PAID" ? "Payment Completed" : "Marked as Pending",
        description: variables.status === "PAID"
          ? "Salary payment has been marked as paid."
          : "Payment moved back to pending.",
      });
    },
  });
}
