import { describe, expect, test } from "bun:test";
import { build_hr_menu, flatten_menu_leaves, type MenuItem } from "./menu.ts";

/**
 * Mirrors NOX `build_kirlet_nav`: each top-level menu root becomes one
 * sidebar group. Roots with `children` contribute those links; leaf roots
 * each become a single-item group.
 */
function nav_group_count(roots: readonly MenuItem[]): number {
  return roots.filter((r) =>
    r.children?.length ? true : Boolean(r.pageId?.trim()),
  ).length;
}

const PRIOR_PAGE_IDS = [
  "hr.dashboard",
  "hr.employees",
  "hr.departments",
  "hr.positions",
  "hr.contracts",
  "hr.leave-requests",
  "hr.documents",
  "hr.incidents",
] as const;

describe("build_hr_menu grouping", () => {
  test("top-level groups are fewer than navigable leaves (not one section per page)", () => {
    const menu = build_hr_menu();
    const leaves = flatten_menu_leaves(menu);
    const groups = nav_group_count(menu);
    expect(leaves.length).toBeGreaterThanOrEqual(PRIOR_PAGE_IDS.length);
    expect(groups).toBeLessThan(leaves.length);
    expect(groups).toBeLessThanOrEqual(2);
    // Group labels must not be a 1:1 copy of every leaf label.
    const group_labels = menu.map((m) => m.label);
    const leaf_labels = leaves.map((m) => m.label);
    expect(group_labels).not.toEqual(leaf_labels);
  });

  test("preserves prior page destinations, paths, permissions and icons", () => {
    const leaves = flatten_menu_leaves(build_hr_menu());
    const by_id = new Map(leaves.map((l) => [l.id, l]));
    for (const page_id of PRIOR_PAGE_IDS) {
      const leaf = by_id.get(page_id);
      expect(leaf).toBeDefined();
      expect(leaf!.pageId).toBe(page_id);
      expect(leaf!.path?.length).toBeGreaterThan(0);
      expect(leaf!.permission?.startsWith("kirlet.hr.")).toBe(true);
      expect(leaf!.icon?.length).toBeGreaterThan(0);
      expect(leaf!.realm).toBe("internal");
    }
  });
});
