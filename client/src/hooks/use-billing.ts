import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateBillWithItems } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useBills(filters?: { billNo?: string; companyName?: string; startDate?: string; endDate?: string; colour?: string; illai?: string; lengthM?: string }) {
  const queryKey = [api.bills.list.path, filters];
  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = buildUrl(api.bills.list.path);
      const params = new URLSearchParams();
      if (filters?.billNo) params.append("billNo", filters.billNo);
      if (filters?.companyName) params.append("companyName", filters.companyName);
      if (filters?.startDate) params.append("startDate", filters.startDate);
      if (filters?.endDate) params.append("endDate", filters.endDate);
      if (filters?.colour) params.append("colour", filters.colour);
      if (filters?.illai) params.append("illai", filters.illai);
      if (filters?.lengthM) params.append("lengthM", filters.lengthM);

      const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;

      const res = await fetch(fullUrl);
      if (!res.ok) throw new Error("Failed to fetch bills");
      return api.bills.list.responses[200].parse(await res.json());
    },
  });
}

export function useNextBillNo() {
  return useQuery({
    queryKey: ["/api/bills/next-bill-no"],
    queryFn: async () => {
      const res = await fetch("/api/bills/next-bill-no");
      if (!res.ok) throw new Error("Failed to fetch next bill number");
      const data = await res.json();
      return data.billNo as string;
    },
    staleTime: 0, // Always re-fetch to get fresh number
  });
}

export function useFrequentCompanies() {
  return useQuery({
    queryKey: ["/api/bills/frequent-companies"],
    queryFn: async () => {
      const res = await fetch("/api/bills/frequent-companies");
      if (!res.ok) throw new Error("Failed to fetch frequent companies");
      return res.json() as Promise<{ companyName: string; count: number }[]>;
    },
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateBillWithItems) => {
      const validated = api.bills.create.input.parse(data);
      const res = await fetch(api.bills.create.path, {
        method: api.bills.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.bills.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create bill");
      }
      return api.bills.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bills.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/next-bill-no"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/frequent-companies"] });
      toast({
        title: "Bill Created",
        description: "The bill has been successfully generated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, bill, items }: { id: string; bill: any; items: any[] }) => {
      const res = await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bill, items }),
      });
      if (!res.ok) throw new Error("Failed to update bill");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bills.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/next-bill-no"] });
      toast({
        title: "Bill Updated",
        description: "The bill has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useBill(id: string) {
  return useQuery({
    queryKey: [api.bills.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.bills.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch bill");
      return api.bills.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

