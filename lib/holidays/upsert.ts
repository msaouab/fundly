import { prisma } from "@/lib/prisma";
import { HOLIDAY_SEED } from "./seed-data";

export async function upsertHolidaysForCountry(countryCode: string): Promise<number> {
  const rows = HOLIDAY_SEED.filter((h) => h.countryCode === countryCode);
  let count = 0;
  for (const h of rows) {
    const date = new Date(`${h.date}T12:00:00`);
    await prisma.holiday.upsert({
      where: {
        countryCode_date_name: {
          countryCode: h.countryCode,
          date,
          name: h.name,
        },
      },
      create: {
        countryCode: h.countryCode,
        date,
        name: h.name,
        type: h.type,
        slug: h.slug ?? null,
      },
      update: { type: h.type, slug: h.slug ?? null },
    });
    count += 1;
  }
  return count;
}
