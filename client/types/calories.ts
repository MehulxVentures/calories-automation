export type CalorieEntry = {
    id: string;
    userId: string;
    dish: string;
    fat: number;
    ingredients: string;
    calories: number;
    source: "agent" | "manual" | "import";
    consumedAt: string;
    createdAt: string;
    updatedAt: string;
};

export type CreateCalorieInput = Pick<CalorieEntry, "dish" | "fat" | "ingredients" | "calories"> & {
    consumedAt?: string;
};
