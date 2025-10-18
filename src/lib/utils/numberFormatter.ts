/**
 * Safe number formatting utilities to prevent .toFixed() errors
 */

/**
 * Safely formats a number with fixed decimal places
 * @param value - The value to format (can be number, null, undefined, or string)
 * @param decimals - Number of decimal places
 * @param fallback - Fallback string if value is not a valid number
 * @returns Formatted string
 */
export function safeToFixed(
  value: number | null | undefined | string,
  decimals: number,
  fallback: string = '0'
): string {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value.toFixed(decimals);
  }
  
  // Try to parse as number if it's a string
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed.toFixed(decimals);
    }
  }
  
  return fallback;
}

/**
 * Safely formats a percentage value
 * @param value - The value to format (0-100 or 0-1 depending on isDecimal)
 * @param decimals - Number of decimal places
 * @param isDecimal - If true, treats value as 0-1 and multiplies by 100
 * @param fallback - Fallback string if value is not valid
 * @returns Formatted percentage string with % symbol
 */
export function safePercentage(
  value: number | null | undefined | string,
  decimals: number = 1,
  isDecimal: boolean = false,
  fallback: string = '0.0'
): string {
  const numValue = typeof value === 'number' ? value : 
                   typeof value === 'string' ? parseFloat(value) : null;
  
  if (numValue !== null && !isNaN(numValue) && isFinite(numValue)) {
    const displayValue = isDecimal ? numValue * 100 : numValue;
    return `${displayValue.toFixed(decimals)}%`;
  }
  
  return `${fallback}%`;
}

/**
 * Safely formats a currency value
 * @param value - The value to format
 * @param decimals - Number of decimal places
 * @param symbol - Currency symbol
 * @param fallback - Fallback string if value is not valid
 * @returns Formatted currency string
 */
export function safeCurrency(
  value: number | null | undefined | string,
  decimals: number = 2,
  symbol: string = '$',
  fallback: string = '0.00'
): string {
  const formatted = safeToFixed(value, decimals, fallback);
  return `${symbol}${formatted}`;
}

/**
 * Safely formats a price value (forex precision)
 * @param value - The value to format
 * @param isJPY - If true, uses 3 decimals, otherwise 5
 * @param fallback - Fallback string if value is not valid
 * @returns Formatted price string
 */
export function safePrice(
  value: number | null | undefined | string,
  isJPY: boolean = false,
  fallback: string = 'N/A'
): string {
  const decimals = isJPY ? 3 : 5;
  return safeToFixed(value, decimals, fallback);
}

/**
 * Safely formats pips
 * @param value - The pips value
 * @param decimals - Number of decimal places
 * @param fallback - Fallback string if value is not valid
 * @returns Formatted pips string with "pips" label
 */
export function safePips(
  value: number | null | undefined | string,
  decimals: number = 1,
  fallback: string = '0.0'
): string {
  const formatted = safeToFixed(value, decimals, fallback);
  return `${formatted} pips`;
}

/**
 * Type guard to check if a value is a valid number
 * @param value - The value to check
 * @returns True if value is a valid, finite number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Safely converts any value to a number
 * @param value - The value to convert
 * @param fallback - Fallback number if conversion fails
 * @returns Converted number or fallback
 */
export function toSafeNumber(
  value: unknown,
  fallback: number = 0
): number {
  if (isValidNumber(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  
  return fallback;
}
