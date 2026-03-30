"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setLocale(locale: string) {
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, { path: "/" });
  revalidatePath("/"); // Force entire layout to re-render in new language
}
