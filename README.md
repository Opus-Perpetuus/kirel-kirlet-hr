# KIRLET-hr — Human Resources

Kirel NOX kirlet for **Employees** (single menu entry), aligned with admin **feature-shell** principles: list / detail / edit.

## Identity

| | |
|--|--|
| Catalog id | `KIRLET-hr` |
| Technical id | `kirlet-hr` |
| Image | `kyostenas/kirlet-hr:0.2.0` |

## Menu

**One menu:** Employees (`hr.employees`) — list/detail/edit under the feature-shell pattern (no separate “Nuevo empleado” root item).

## Endpoints (via NOX gateway `/api/m/kirlet-hr`)

| Path | Method | Purpose |
|------|--------|---------|
| `/health` | GET | Ready probe |
| `/menu` | GET | Single Employees menu |
| `/pages` | GET | Page catalog |
| `/pages/hr.employees.list` | GET | List descriptor |
| `/pages/hr.employees.detail` | GET | Detail descriptor |
| `/pages/hr.employees.edit` | GET | Edit descriptor |
| `/employees` | GET/POST | List / create |
| `/employees/:id` | GET/PATCH | Read / update |

## Workspace

See [WORKSPACE.md](./WORKSPACE.md) — open with `kirel-nox` multi-root workspace.

## Build & run

```bash
bun test
bun run start
docker build -t kyostenas/kirlet-hr:0.2.0 .
```
Source of truth: github.com/Opus-Perpetuus/kirel-kirlet-hr
