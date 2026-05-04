import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
  name: z.string().trim().max(80).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
