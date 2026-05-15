import { redirect } from "next/navigation";

export default function PortfolioRedirect() {
  redirect("/inversiones?tab=portfolio");
}
