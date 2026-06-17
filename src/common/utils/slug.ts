import { randomBytes } from "crypto";

const SLUG_MAX_LENGTH = 120;
const RANDOM_SUFFIX_BYTES = 3;

export function createSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");

  return slug || "item";
}

export function createSlugWithRandomSuffix(slug: string): string {
  const suffix = randomBytes(RANDOM_SUFFIX_BYTES).toString("hex");
  const maxBaseLength = SLUG_MAX_LENGTH - suffix.length - 1;
  const base = slug.slice(0, maxBaseLength).replace(/-+$/g, "") || "item";

  return `${base}-${suffix}`;
}
