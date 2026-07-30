import { redirect } from "next/navigation";

export default function TabletsPage() {
  redirect("/devices?category=tablet");
}
