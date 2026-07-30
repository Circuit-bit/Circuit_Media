import { redirect } from "next/navigation";

export default function PhonesPage() {
  redirect("/devices?category=phone");
}
