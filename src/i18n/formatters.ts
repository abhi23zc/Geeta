/** Locale-scoped formatters avoid constructing Intl objects for every calendar cell. */
export function createLocaleFormatters(locale: string) {
  const numbers = new Intl.NumberFormat(locale);
  const dates = new Map<string, Intl.DateTimeFormat>();
  return {
    formatNumber: (value: number) => numbers.format(value),
    formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => {
      const key = JSON.stringify(options ?? {});
      let formatter = dates.get(key);
      if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, options);
        if (dates.size >= 32) {
          const oldest = dates.keys().next().value;
          if (oldest !== undefined) dates.delete(oldest);
        }
        dates.set(key, formatter);
      }
      return formatter.format(date);
    },
  };
}
