<p align="center">
  <img src="docs/brand/kirlet-hr-readme-256.png" alt="KIRLET-hr mark" width="128" height="128" />
</p>

<h1 align="center">KIRLET-hr</h1>

<p align="center">
  Human Resources kirlet for <strong>Kirel NOX</strong> — employees, departments,
  positions, contracts, leave, documents and dashboard.
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-0.4.1-14b8a6?style=flat-square" />
  <img alt="Catalog" src="https://img.shields.io/badge/id-KIRLET--hr-0f172a?style=flat-square" />
  <img alt="Technical" src="https://img.shields.io/badge/technical-kirlet--hr-243044?style=flat-square" />
  <img alt="Bun" src="https://img.shields.io/badge/runtime-Bun-fbf0df?style=flat-square&logo=bun&logoColor=black" />
  <img alt="SQLite" src="https://img.shields.io/badge/DB-bun:sqlite-003B57?style=flat-square" />
  <img alt="Brand" src="https://img.shields.io/badge/mark-Opus_Reticulatum-2dd4bf?style=flat-square" />
</p>

## Identity

| | |
|--|--|
| Catalog id | `KIRLET-hr` |
| Technical id | `kirlet-hr` |
| Image | `kyostenas/kirlet-hr:0.4.1` |
| Mark | `manifest.icon` (reticulatum permutation) → NOX registry `kirlet:kirlet-hr` |

## Menu (sidebar icons)

Every entry ships a filled Kirita icon for accessibility:

| Item | Icon |
|------|------|
| Panel | `dashboard` |
| Empleados | `users` |
| Departamentos | `building` |
| Puestos | `briefcase` |
| Contratos | `document` |
| Ausencias | `calendar` |
| Documentos | `attachment` |

## Endpoints (via NOX gateway `/api/m/kirlet-hr`)

| Path | Method | Purpose |
|------|--------|---------|
| `/health` | GET | Ready probe |
| `/manifest` | GET | Manifest v1 + brand icon |
| `/menu` | GET | Menu with icons |
| `/pages/*` | GET | Feature-shell descriptors |
| `/employees` … | CRUD | HR modules |

## Workspace

See [WORKSPACE.md](./WORKSPACE.md) — open with `kirel-nox` multi-root workspace.

## Build & run

```bash
bun test
bun run start
docker build -t kyostenas/kirlet-hr:0.4.1 .
```

Brand mark sources: `docs/brand/kirlet-hr.on-dark.svg` · PNG for GitHub: `docs/brand/kirlet-hr-readme-256.png`.

Source of truth: [github.com/Opus-Perpetuus/kirel-kirlet-hr](https://github.com/Opus-Perpetuus/kirel-kirlet-hr)
