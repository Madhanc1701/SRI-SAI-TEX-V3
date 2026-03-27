import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RateConfigData } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

const RATE_CONFIG_KEY = "/api/rate-config";

export function useRateConfig() {
  return useQuery<RateConfigData>({
    queryKey: [RATE_CONFIG_KEY],
    queryFn: async () => {
      const res = await fetch("/api/rate-config");
      if (!res.ok) throw new Error("Failed to fetch rate config");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateRateConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: RateConfigData) => {
      const res = await fetch("/api/rate-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save rate config");
      return res.json() as Promise<RateConfigData>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RATE_CONFIG_KEY] });
      toast({ title: "Rates Saved", description: "Salary rate configuration has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save rates.", variant: "destructive" });
    },
  });
}

/** Find the rate for a given value in a sorted set of ranges.
 *  Rule: min <= value. If max is null, it means "no upper limit".
 *  We pick the LAST matching range (i.e., highest min that still applies). */
export function findRate(value: number, ranges: { min: number; max: number | null; rate: number }[]): number | null {
  if (!ranges || ranges.length === 0) return null;
  // Sort by min ascending; pick the range where min <= value
  const sorted = [...ranges].sort((a, b) => a.min - b.min);
  let matched: number | null = null;
  for (const range of sorted) {
    if (value >= range.min) {
      matched = range.rate;
    } else {
      break;
    }
  }
  return matched;
}

/** Per-labour rate config fetch hook */
export function useLabourRateConfig(labourUserId: string | undefined) {
  return useQuery<RateConfigData>({
    queryKey: ["/api/labour-rate-config", labourUserId],
    queryFn: async () => {
      if (!labourUserId) return { lengthRanges: [], illaiRanges: [] };
      const res = await fetch(`/api/labour-rate-config/${labourUserId}`);
      if (!res.ok) throw new Error("Failed to fetch labour rate config");
      return res.json();
    },
    enabled: !!labourUserId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Per-labour rate config update hook */
export function useUpdateLabourRateConfig(labourUserId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: RateConfigData) => {
      if (!labourUserId) throw new Error("No labour user ID");
      const res = await fetch(`/api/labour-rate-config/${labourUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save labour rate config");
      return res.json() as Promise<RateConfigData>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labour-rate-config", labourUserId] });
      toast({ title: "Rates Saved", description: "Labour's rate configuration has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save rates.", variant: "destructive" });
    },
  });
}
