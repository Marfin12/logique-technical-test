const WIB_TIME_ZONE = "Asia/Jakarta";

const wibFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: WIB_TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function formatWibDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${wibFormatter.format(date)} WIB`;
}
