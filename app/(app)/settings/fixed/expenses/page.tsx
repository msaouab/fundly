import { redirect } from "next/navigation";

export default function FixedExpensesRedirectPage() {
  redirect("/settings/fixed");
}
