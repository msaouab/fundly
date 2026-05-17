import type { HolidayType } from "@/generated/prisma/enums";

export type HolidaySeedRow = {
  countryCode: string;
  date: string;
  name: string;
  type: HolidayType;
  slug?: string;
};

/** Fixed + approximate religious dates — refresh Islamic dates yearly. */
export const HOLIDAY_SEED: HolidaySeedRow[] = [
  // Morocco 2025
  { countryCode: "MA", date: "2025-01-01", name: "New Year's Day", type: "PUBLIC", slug: "new-year" },
  { countryCode: "MA", date: "2025-01-11", name: "Independence Manifesto Day", type: "PUBLIC", slug: "manifesto" },
  { countryCode: "MA", date: "2025-05-01", name: "Labour Day", type: "PUBLIC", slug: "labour-day" },
  { countryCode: "MA", date: "2025-03-30", name: "Eid al-Fitr", type: "RELIGIOUS", slug: "eid-fitr" },
  { countryCode: "MA", date: "2025-03-31", name: "Eid al-Fitr (day 2)", type: "RELIGIOUS", slug: "eid-fitr-2" },
  { countryCode: "MA", date: "2025-06-06", name: "Eid al-Adha", type: "RELIGIOUS", slug: "eid-adha" },
  { countryCode: "MA", date: "2025-06-07", name: "Eid al-Adha (day 2)", type: "RELIGIOUS", slug: "eid-adha-2" },
  { countryCode: "MA", date: "2025-07-30", name: "Throne Day", type: "PUBLIC", slug: "throne-day" },
  { countryCode: "MA", date: "2025-08-14", name: "Oued Ed-Dahab Day", type: "PUBLIC", slug: "oued-ed-dahab" },
  { countryCode: "MA", date: "2025-08-20", name: "Revolution of the King and People", type: "PUBLIC", slug: "revolution" },
  { countryCode: "MA", date: "2025-08-21", name: "Youth Day", type: "PUBLIC", slug: "youth-day" },
  { countryCode: "MA", date: "2025-11-06", name: "Green March Day", type: "PUBLIC", slug: "green-march" },
  { countryCode: "MA", date: "2025-11-18", name: "Independence Day", type: "PUBLIC", slug: "independence" },
  // Morocco 2026
  { countryCode: "MA", date: "2026-01-01", name: "New Year's Day", type: "PUBLIC", slug: "new-year" },
  { countryCode: "MA", date: "2026-01-11", name: "Independence Manifesto Day", type: "PUBLIC", slug: "manifesto" },
  { countryCode: "MA", date: "2026-05-01", name: "Labour Day", type: "PUBLIC", slug: "labour-day" },
  { countryCode: "MA", date: "2026-03-20", name: "Eid al-Fitr", type: "RELIGIOUS", slug: "eid-fitr" },
  { countryCode: "MA", date: "2026-03-21", name: "Eid al-Fitr (day 2)", type: "RELIGIOUS", slug: "eid-fitr-2" },
  { countryCode: "MA", date: "2026-05-27", name: "Eid al-Adha", type: "RELIGIOUS", slug: "eid-adha" },
  { countryCode: "MA", date: "2026-05-28", name: "Eid al-Adha (day 2)", type: "RELIGIOUS", slug: "eid-adha-2" },
  { countryCode: "MA", date: "2026-07-30", name: "Throne Day", type: "PUBLIC", slug: "throne-day" },
  { countryCode: "MA", date: "2026-08-14", name: "Oued Ed-Dahab Day", type: "PUBLIC", slug: "oued-ed-dahab" },
  { countryCode: "MA", date: "2026-08-20", name: "Revolution of the King and People", type: "PUBLIC", slug: "revolution" },
  { countryCode: "MA", date: "2026-08-21", name: "Youth Day", type: "PUBLIC", slug: "youth-day" },
  { countryCode: "MA", date: "2026-11-06", name: "Green March Day", type: "PUBLIC", slug: "green-march" },
  { countryCode: "MA", date: "2026-11-18", name: "Independence Day", type: "PUBLIC", slug: "independence" },
  // France 2025 (sample)
  { countryCode: "FR", date: "2025-01-01", name: "New Year's Day", type: "PUBLIC", slug: "new-year" },
  { countryCode: "FR", date: "2025-05-01", name: "Labour Day", type: "PUBLIC", slug: "labour-day" },
  { countryCode: "FR", date: "2025-05-08", name: "Victory in Europe Day", type: "PUBLIC", slug: "ve-day" },
  { countryCode: "FR", date: "2025-07-14", name: "Bastille Day", type: "PUBLIC", slug: "bastille" },
  { countryCode: "FR", date: "2025-12-25", name: "Christmas Day", type: "PUBLIC", slug: "christmas" },
];
