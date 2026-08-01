import { z } from "zod";
import { expenseCategorySchema } from "@/app/(app)/expenses/schema";

const occurrenceFields = {
  endsMode: z.enum(["indefinite", "limited"]).default("indefinite"),
  occurrenceCount: z.coerce.number().int().optional().nullable(),
  startsAt: z.coerce.date(),
};

function refineOccurrence<
  T extends { endsMode: "indefinite" | "limited"; occurrenceCount?: number | null },
>(data: T, ctx: z.RefinementCtx) {
  if (data.endsMode === "limited") {
    const n = data.occurrenceCount;
    if (n == null || Number.isNaN(n) || n < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter at least 2",
        path: ["occurrenceCount"],
      });
    }
  }
}

/** Persist shape: null = indefinite. */
export function toOccurrenceCount(
  endsMode: "indefinite" | "limited",
  occurrenceCount?: number | null,
): number | null {
  if (endsMode !== "limited") return null;
  if (occurrenceCount == null || occurrenceCount < 2) return null;
  return occurrenceCount;
}

export function fromOccurrenceCount(occurrenceCount: number | null | undefined): {
  endsMode: "indefinite" | "limited";
  occurrenceCount: number | null;
} {
  if (occurrenceCount != null && occurrenceCount >= 2) {
    return { endsMode: "limited", occurrenceCount };
  }
  return { endsMode: "indefinite", occurrenceCount: null };
}

export const recurringExpenseFormSchema = z
  .object({
    description: z
      .string()
      .max(200)
      .transform((s) => s.trim()),
    category: expenseCategorySchema,
    amount: z.coerce.number().positive("Amount must be positive"),
    currency: z.string().default("MAD"),
    recurrenceFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
    ...occurrenceFields,
  })
  .superRefine(refineOccurrence);

export type RecurringExpenseFormValues = z.infer<typeof recurringExpenseFormSchema>;

export const recurringExpenseEditSchema = recurringExpenseFormSchema.and(
  z.object({ id: z.string().min(1) }),
);

export const recurringIncomeFormSchema = z
  .object({
    source: z.string().trim().min(1, "Source is required").max(120),
    type: z.enum(["SALARY", "PASSIVE"]),
    amount: z.coerce.number().positive("Amount must be positive"),
    currency: z.string().default("MAD"),
    recurrenceFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
    ...occurrenceFields,
  })
  .superRefine(refineOccurrence);

export type RecurringIncomeFormValues = z.infer<typeof recurringIncomeFormSchema>;

export const recurringIncomeEditSchema = recurringIncomeFormSchema.and(
  z.object({ id: z.string().min(1) }),
);

export const recurringPaidSchema = z.object({
  templateId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  payee: z.boolean(),
});
