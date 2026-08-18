CREATE TABLE calories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dish TEXT NOT NULL DEFAULT 'Quick calorie entry',
    fat NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (fat >= 0),
    ingredients TEXT NOT NULL DEFAULT '',
    calories NUMERIC(10, 2) NOT NULL CHECK (calories > 0),
    source TEXT NOT NULL DEFAULT 'agent' CHECK (source IN ('agent', 'manual', 'import')),
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT calories_dish_not_blank CHECK (BTRIM(dish) <> '')
);

CREATE INDEX calories_user_consumed_at_idx
    ON calories (user_id, consumed_at DESC);
