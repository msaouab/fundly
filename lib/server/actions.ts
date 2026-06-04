import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { z } from "zod";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

export function fieldErrorsFromZod(error: z.ZodError): Record<string, string> {
  const flat = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(flat)) {
    const first = messages?.[0];
    if (first) out[key] = first;
  }
  return out;
}

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionFail(
  error: string,
  fieldErrors?: Record<string, string>,
): ActionResult<never> {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}

export function actionValidationError(error: z.ZodError): ActionResult<never> {
  return actionFail("Validation failed", fieldErrorsFromZod(error));
}

export function parseActionInput<T extends z.ZodType>(
  schema: T,
  input: unknown,
  options?: { fieldErrors?: boolean },
): { ok: true; data: z.infer<T> } | { ok: false; result: ActionResult<never> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  const withFields = options?.fieldErrors !== false;
  return {
    ok: false,
    result: withFields
      ? actionValidationError(parsed.error)
      : actionFail("Validation failed"),
  };
}

export async function runAction<T>(
  fn: () => Promise<ActionResult<T>>,
  fallbackMessage: string,
): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    return actionFail(e instanceof Error ? e.message : fallbackMessage);
  }
}

export function revalidateFinancePages() {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/incomes");
  revalidatePath("/expenses");
  revalidatePath("/savings");
}
