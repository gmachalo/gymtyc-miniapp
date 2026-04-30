import BottomNav from "@/components/nav/BottomNav";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="page-wrapper">
      {children}
      <BottomNav />
    </div>
  );
}
