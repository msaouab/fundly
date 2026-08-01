import { redirect } from "next/navigation";

/** Legacy simulations route — redirect to Forecast. */
export default function SimulationsPage() {
  redirect("/forecast");
}
