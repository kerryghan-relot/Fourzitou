import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/layout/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarPath: true },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav user={{ ...session.user, avatarPath: dbUser?.avatarPath ?? null }} />
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
