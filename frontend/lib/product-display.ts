export function formatMoney(amount: string, currency: string): string {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(amount);
  if (!match) return `${currency} ${amount}`;
  const whole = match[1]!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${currency} ${whole}${match[2] ? `.${match[2]}` : ""}`;
}

export function formatInsuranceType(value: string): string {
  return value
    .split("_")
    .map((part) => `${part.charAt(0)}${part.slice(1).toLowerCase()}`)
    .join(" ");
}
