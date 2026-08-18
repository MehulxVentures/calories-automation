"use client";

import { FormEvent, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCalories, useCreateCalorie, useDeleteCalorie } from "@/hooks/use-calories";

export function CaloriesDashboard() {
    const calories = useCalories();
    const createEntry = useCreateCalorie();
    const deleteEntry = useDeleteCalorie();
    const [dish, setDish] = useState("");
    const [amount, setAmount] = useState("");

    async function submit(event: FormEvent) {
        event.preventDefault();
        const numericAmount = Number(amount);
        if (!dish.trim() || numericAmount <= 0) return toast.error("Enter a dish and calorie amount.");
        await createEntry.mutateAsync({ dish: dish.trim(), calories: numericAmount, fat: 0, ingredients: "" });
        setDish("");
        setAmount("");
        toast.success("Manual calorie entry added.");
    }

    return (
        <div className="mx-auto grid max-w-5xl gap-6 px-4 lg:grid-cols-[20rem_1fr] lg:px-6">
            <Card className="h-fit">
                <CardHeader><CardTitle className="text-base">Manual entry</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-3">
                        <Input value={dish} onChange={(event) => setDish(event.target.value)} placeholder="Dish or food" />
                        <Input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="1" step="0.01" placeholder="Calories" />
                        <Button className="w-full" disabled={createEntry.isPending}>Add calories</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-base">Recent entries</CardTitle>
                    <span className="text-sm font-semibold">{calories.data?.totalCalories ?? 0} kcal</span>
                </CardHeader>
                <CardContent className="space-y-2">
                    {calories.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
                    {calories.data?.entries.map((entry) => (
                        <div key={entry.id} className="flex items-center gap-3 rounded-xl border p-3">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{entry.dish}</p>
                                <p className="text-xs text-muted-foreground">{entry.source} · {new Date(entry.consumedAt).toLocaleString()}</p>
                            </div>
                            <span className="text-sm font-semibold">{entry.calories} kcal</span>
                            <Button variant="ghost" size="icon" onClick={() => deleteEntry.mutate(entry.id)} aria-label="Delete entry">
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    ))}
                    {!calories.isLoading && calories.data?.entries.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No calorie entries yet.</p>}
                </CardContent>
            </Card>
        </div>
    );
}
