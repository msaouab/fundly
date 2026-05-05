import { z } from "zod";
import { normalizeDateToLocalNoon } from "@/lib/date";

export const incomeTypeSchema = z.enum([
  "SALARY",
  "FREELANCE",
  "PASSIVE",
  "BONUS",
  "OTHER",
]);

export const recurrenceSchema = z
  .enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"])
  .nullable()
  .optional();

export const incomeFormSchema = z
  .object({
    amount: z.coerce.number().positive("Amount must be positive"),
    date: z.coerce.date().transform(normalizeDateToLocalNoon),
    source: z.string().trim().min(1, "Source is required").max(120),
    type: incomeTypeSchema,
    currency: z.string().default("MAD"),
    isRecurring: z.boolean().default(false),
    recurrenceFrequency: recurrenceSchema,
    payee: z.string().trim().max(120).optional().nullable(),
    note: z.string().trim().max(200).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.isRecurring &&
      data.type !== "SALARY" &&
      data.type !== "PASSIVE"
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Recurring only for salary or passive.",
        path: ["isRecurring"],
      });
    }
    if (data.isRecurring && !data.recurrenceFrequency) {
      ctx.addIssue({
        code: "custom",
        message: "Pick recurrence.",
        path: ["recurrenceFrequency"],
      });
    }
  });

export type IncomeFormValues = z.infer<typeof incomeFormSchema>;

export const incomeEditFormSchema = incomeFormSchema.extend({
  id: z.string().min(1),
});

export type IncomeEditFormValues = z.infer<typeof incomeEditFormSchema>;
