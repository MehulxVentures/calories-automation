"use client";

import { useQuery } from "@tanstack/react-query";
import { getUsageApi } from "@/lib/client/usage";

export const useUsage = () => useQuery({ queryKey: ["usage"], queryFn: getUsageApi });
