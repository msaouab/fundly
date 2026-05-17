export type CountryOption = {
  code: string;
  name: string;
  defaultCurrency: string;
};

export const SUPPORTED_COUNTRIES: CountryOption[] = [
  { code: "MA", name: "Morocco", defaultCurrency: "MAD" },
  { code: "FR", name: "France", defaultCurrency: "EUR" },
  { code: "US", name: "United States", defaultCurrency: "USD" },
  { code: "GB", name: "United Kingdom", defaultCurrency: "GBP" },
  { code: "DE", name: "Germany", defaultCurrency: "EUR" },
  { code: "ES", name: "Spain", defaultCurrency: "EUR" },
  { code: "CA", name: "Canada", defaultCurrency: "CAD" },
  { code: "AE", name: "United Arab Emirates", defaultCurrency: "AED" },
  { code: "SA", name: "Saudi Arabia", defaultCurrency: "SAR" },
  { code: "TN", name: "Tunisia", defaultCurrency: "TND" },
  { code: "DZ", name: "Algeria", defaultCurrency: "DZD" },
  { code: "EG", name: "Egypt", defaultCurrency: "EGP" },
];

export function getCountry(code: string | null | undefined): CountryOption {
  return SUPPORTED_COUNTRIES.find((c) => c.code === code) ?? SUPPORTED_COUNTRIES[0]!;
}
