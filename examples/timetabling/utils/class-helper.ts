/**
 * Helper functions for class comparison
 */

/**
 * Check if two class values have overlapping classes
 *
 * Examples:
 * - hasClassOverlap("MR-3A", "MR-3A") => true
 * - hasClassOverlap("MR-3A", "MR-5A") => false
 * - hasClassOverlap("MR-3A,MR-5A,MR-7A", "MR-3A") => true
 * - hasClassOverlap("MR-3A,MR-5A", "MR-7A,MR-9A") => false
 * - hasClassOverlap(["MR-3A", "MR-5A"], "MR-3A") => true
 * - hasClassOverlap(["MR-3A", "MR-5A"], ["MR-7A", "MR-9A"]) => false
 *
 * @param class1 First class value (string or array)
 * @param class2 Second class value (string or array)
 * @returns true if there's any overlap between the classes
 */
export function hasClassOverlap(
  class1: string | string[],
  class2: string | string[]
): boolean {
  // Convert both to arrays for consistent processing
  const classes1 = normalizeClassToArray(class1);
  const classes2 = normalizeClassToArray(class2);

  // Check if there's any intersection
  for (const c1 of classes1) {
    for (const c2 of classes2) {
      if (c1.trim() === c2.trim()) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Normalize class value to array
 * Handles both string (comma-separated) and array formats
 *
 * @param classValue Class value (string or array)
 * @returns Array of class codes
 */
function normalizeClassToArray(classValue: string | string[]): string[] {
  if (Array.isArray(classValue)) {
    return classValue;
  }

  // If string contains comma, split it
  if (classValue.includes(",")) {
    return classValue.split(",").map((c) => c.trim());
  }

  // Single class string
  return [classValue];
}
