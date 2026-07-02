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

const incomeFormFields = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.coerce.date().transform(normalizeDateToLocalNoon),
  source: z.string().trim().min(1, "Source is required").max(120),
  type: incomeTypeSchema,
  currency: z.string().default("MAD"),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: recurrenceSchema,
  payee: z.boolean().default(false),
});

function refineIncomeForm(
  data: z.infer<typeof incomeFormFields>,
  ctx: z.RefinementCtx,
) {
  if (data.isRecurring && data.type !== "SALARY" && data.type !== "PASSIVE") {
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
}

export const incomeAddFormSchema = incomeFormFields.superRefine(refineIncomeForm);

export type IncomeAddFormValues = z.infer<typeof incomeAddFormSchema>;

export const incomeEditFormSchema = incomeFormFields
  .extend({
    id: z.string().min(1),
    note: z.string().trim().max(200).optional().nullable(),
  })
  .superRefine(refineIncomeForm);

export type IncomeEditFormValues = z.infer<typeof incomeEditFormSchema>;
