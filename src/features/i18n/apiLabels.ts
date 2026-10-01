import { translate } from './translate';

/** Turns an API enum value into a humanised fallback label. */
export function readable(value?: string | null): string {
  return (value || '\u2014').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Renders an API enum value (status, category, priority, availability…) in the
 * active language. Falls back to a humanised version of the raw value when the
 * dictionary has no entry, so an unrecognised server value is never blank.
 */
export function apiLabel(namespace: string, value?: string | null): string {
  if (!value) return '\u2014';
  const key = `${namespace}.${value}`;
  const label = translate(key);
  return label === key ? readable(value) : label;
}
