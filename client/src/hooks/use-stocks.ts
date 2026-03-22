import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateStockWithItems } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useStocks(filters?: { startDate?: string; endDate?: string; colour?: string }) {
  return useQuery({
    queryKey: [api.stocks.list.path, filters],
    queryFn: async () => {
      const url = buildUrl(api.stocks.list.path);
      const params = new URLSearchParams();
      if (filters?.startDate) params.append("startDate", filters.startDate);
      if (filters?.endDate) params.append("endDate", filters.endDate);
      if (filters?.colour) params.append("colour", filters.colour);

      const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;

      const res = await fetch(fullUrl);
      if (!res.ok) throw new Error("Failed to fetch stocks");
      return api.stocks.list.responses[200].parse(await res.json());
    },
  });
}

export function useNextStockNo() {
  return useQuery({
    queryKey: ["/api/stocks/next-stock-no"],
    queryFn: async () => {
      const res = await fetch("/api/stocks/next-stock-no");
      if (!res.ok) throw new Error("Failed to fetch next stock number");
      const data = await res.json();
      return data.stockNo as string;
    },
    staleTime: 0,
  });
}

export function useStock(id: string) {
  return useQuery({
    queryKey: ["/api/stocks", id],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${id}`);
      if (!res.ok) throw new Error("Failed to fetch stock");
      return res.json() as Promise<{ stock: any; items: any[] }>;
    },
    enabled: !!id,
  });
}

export function useCreateStock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateStockWithItems) => {
      const validated = api.stocks.create.input.parse(data);
      const res = await fetch(api.stocks.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) throw new Error("Failed to create stock entry");
      return api.stocks.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stocks.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/next-stock-no"] });
      toast({
        title: "Stock Added",
        description: "Stock entry has been recorded successfully.",
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

export function useUpdateStock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, stock, items }: { id: string; stock: any; items: any[] }) => {
      const res = await fetch(`/api/stocks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock, items }),
      });
      if (!res.ok) throw new Error("Failed to update stock");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stocks.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/next-stock-no"] });
      toast({
        title: "Stock Updated",
        description: "Stock entry has been successfully updated.",
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
