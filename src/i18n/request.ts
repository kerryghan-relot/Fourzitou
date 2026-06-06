import { getRequestConfig } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { routing, type Locale } from "./routing";

export default getRequestConfig(async () => {
  const session = await auth();

  let rawLocale = "en";
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { locale: true },
    });
    rawLocale = dbUser?.locale ?? "en";
  }

  const locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
