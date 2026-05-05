import { z } from "zod";
import { normalizeDateToLocalNoon } from "@/lib/date";

export const expenseKindSchema = z.enum(["FIXED", "VARIABLE"]);

export const expenseCategorySchema = z.enum([
  "HOUSING",
  "FOOD_GROCERIES",
  "TRANSPORT",
  "UTILITIES",
  "HEALTH",
  "ENTERTAINMENT",
  "SHOPPING",
  "SUBSCRIPTIONS",
  "EDUCATION",
  "TRAVEL",
  "DONATIONS",
  "OTHER",
]);

export const expenseRecurrenceSchema = z
  .enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"])
  .nullable()
  .optional();

export const expenseFormSchema = z
  .object({
    amount: z.coerce.number().positive("Amount must be positive"),
    date: z.coerce.date().transform(normalizeDateToLocalNoon),
    description: z
      .string()
      .max(200)
      .transform((s) => s.trim()),
    kind: expenseKindSchema,
    category: expenseCategorySchema,
    currency: z.string().default("MAD"),
    isRecurring: z.boolean().default(false),
    recurrenceFrequency: expenseRecurrenceSchema,
    payee: z.string().trim().max(120).optional().nullable(),
    note: z.string().trim().max(200).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "FIXED" && data.isRecurring && !data.recurrenceFrequency) {
      ctx.addIssue({
        code: "custom",
        message: "Pick recurrence.",
        path: ["recurrenceFrequency"],
      });
    }
    if (data.kind === "VARIABLE" && data.isRecurring) {
      ctx.addIssue({
        code: "custom",
        message: "Recurring applies to fixed expenses only.",
        path: ["isRecurring"],
      });
    }
  });

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const expenseEditFormSchema = expenseFormSchema.extend({
  id: z.string().min(1),
});

export type ExpenseEditFormValues = z.infer<typeof expenseEditFormSchema>;
