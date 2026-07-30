import { redirect } from "next/navigation";

export default function WatchesPage() {
  redirect("/devices?category=watch");
}
