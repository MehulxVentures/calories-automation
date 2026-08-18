"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUsage } from "@/hooks/use-usage";

export function UsageDashboard() {
    const usage = useUsage();
    const summary = usage.data?.summary;
    const stats = [
        ["Requests", summary?.requests ?? 0],
        ["Input tokens", summary?.inputTokens ?? 0],
        ["Output tokens", summary?.outputTokens ?? 0],
    ];
    return (
        <div className="mx-auto grid max-w-5xl gap-4 px-4 sm:grid-cols-3 lg:px-6">
            {stats.map(([label, value]) => (
                <Card key={label}>
                    <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-semibold tabular-nums">{Number(value).toLocaleString()}</CardContent>
                </Card>
            ))}
        </div>
    );
}
