"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CategoryOption } from "@/lib/types";

/**
 * Fixed + custom categories for the signed-in user, provided once by the (app) layout.
 * Read with useCategoryOptions() in any picker instead of threading props through every page.
 */
const Ctx = createContext<CategoryOption[]>([]);

export function CategoryProvider({ options, children }: { options: CategoryOption[]; children: ReactNode }) {
  return <Ctx.Provider value={options}>{children}</Ctx.Provider>;
}

export function useCategoryOptions() {
  return useContext(Ctx);
}
