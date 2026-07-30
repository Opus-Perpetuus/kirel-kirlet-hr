// (o==================================================================o)
//   #region DESCRIPTORS + MANIFEST TESTS
// (o-----------------------------------------------------------\/-----o)

import { describe, expect, test } from "bun:test";
import {
  validate_page_descriptor,
  validate_feature_shell_props,
  validate_kirlet_manifest,
} from "@opus-perpetuus/kirel-nox-kit";
import { PAGE_ENTRIES } from "./modules/registry.ts";
import { build_hr_menu } from "./menu.ts";
import manifest from "../manifest.json";

describe("descriptors", () => {
  test("all pages pass validate_page_descriptor", () => {
    for (const entry of PAGE_ENTRIES) {
      const page = entry.build();
      const result = validate_page_descriptor(page);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        console.error(entry.id, result.issues);
      }
    }
  });

  test("feature-shell pages pass validate_feature_shell_props", () => {
    for (const entry of PAGE_ENTRIES) {
      const page = entry.build();
      if (page.page.component !== "nox.feature-shell") continue;
      const result = validate_feature_shell_props(page.page.props);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        console.error(entry.id, result.issues);
      }
    }
  });

  test("no English product strings in visible labels", () => {
    const english = /Employees|Save|Edit|Delete|Create|Dashboard|Documents|Contracts|Departments|Positions|Leave/;
    const labels: string[] = [];

    for (const item of build_hr_menu()) {
      labels.push(item.label);
    }

    for (const entry of PAGE_ENTRIES) {
      const page = entry.build();
      labels.push(page.title);
      if (page.page.component === "nox.feature-shell" && page.page.props) {
        const props = page.page.props as {
          view?: { title?: string; pluralLabel?: string; singularLabel?: string };
          table?: { columns?: Array<{ label?: string }> };
          form?: { fields?: Array<{ label?: string }> };
          headerActions?: Record<string, Array<{ label?: string }>>;
        };
        if (props.view?.title) labels.push(props.view.title);
        if (props.view?.pluralLabel) labels.push(props.view.pluralLabel);
        if (props.view?.singularLabel) labels.push(props.view.singularLabel);
        for (const col of props.table?.columns ?? []) {
          if (col.label) labels.push(col.label);
        }
        for (const f of props.form?.fields ?? []) {
          if (f.label) labels.push(f.label);
        }
        for (const actions of Object.values(props.headerActions ?? {})) {
          for (const a of actions) {
            if (a.label) labels.push(a.label);
          }
        }
      }
      // dashboard classic
      const walk = (n: { props?: Record<string, unknown>; children?: unknown[] }) => {
        if (n.props) {
          if (typeof n.props.title === "string") labels.push(n.props.title);
          if (typeof n.props.subtitle === "string") labels.push(n.props.subtitle);
          if (Array.isArray(n.props.items)) {
            for (const it of n.props.items as Array<{ label?: string }>) {
              if (it.label) labels.push(it.label);
            }
          }
          if (Array.isArray(n.props.columns)) {
            for (const c of n.props.columns as Array<{ label?: string }>) {
              if (c.label) labels.push(c.label);
            }
          }
        }
        for (const c of n.children ?? []) {
          if (c && typeof c === "object") walk(c as typeof n);
        }
      };
      walk(page.page);
    }

    for (const label of labels) {
      expect(english.test(label)).toBe(false);
    }
  });
});

describe("manifest", () => {
  test("passes validate_kirlet_manifest", () => {
    const result = validate_kirlet_manifest(manifest);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      console.error(result.issues);
    }
  });

  test("compat and shared-nox-postgres storage", () => {
    expect(manifest.compat.nox).toBe(">=0.3.0 <2.0.0");
    expect(manifest.compat.kit).toBe("^0.3.0");
    expect(manifest.storage?.domain).toBe("shared-nox-postgres");
    expect(manifest.storage?.files).toBe(true);
    expect(manifest.storage?.data).toBeUndefined();
  });
});

// (o-----------------------------------------------------------/\-----o)
//   #endregion DESCRIPTORS + MANIFEST TESTS
// (o==================================================================o)
