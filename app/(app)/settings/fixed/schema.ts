import { z } from "zod";
import { expenseCategorySchema } from "@/app/(app)/expenses/schema";

export const recurringExpenseFormSchema = z.object({
  description: z
    .string()
    .max(200)
    .transform((s) => s.trim()),
  category: expenseCategorySchema,
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.string().default("MAD"),
  recurrenceFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
});

export type RecurringExpenseFormValues = z.infer<typeof recurringExpenseFormSchema>;

export const recurringExpenseEditSchema = recurringExpenseFormSchema.extend({
  id: z.string().min(1),
});

export const recurringIncomeFormSchema = z.object({
  source: z.string().trim().min(1, "Source is required").max(120),
  type: z.enum(["SALARY", "PASSIVE"]),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.string().default("MAD"),
  recurrenceFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
});

export type RecurringIncomeFormValues = z.infer<typeof recurringIncomeFormSchema>;

export const recurringIncomeEditSchema = recurringIncomeFormSchema.extend({
  id: z.string().min(1),
});

export const recurringPaidSchema = z.object({
  templateId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  payee: z.boolean(),
});
