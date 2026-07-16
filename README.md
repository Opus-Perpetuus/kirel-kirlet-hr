# KIRLET-hr — Human Resources

First vertical kirlet for **Kirel NOX**: employee registration under a nested HR menu.

## Identity

| | |
|--|--|
| Catalog id | `KIRLET-hr` |
| Technical id | `kirlet-hr` |
| Image | `kyostenas/kirlet-hr:0.1.0` |

## Endpoints (via NOX gateway `/api/m/kirlet-hr`)

| Path | Method | Purpose |
|------|--------|---------|
| `/health` | GET | Ready probe |
| `/menu` | GET | Nested HR menu (Registro de empleados) |
| `/pages` | GET | Employee registration UI descriptor (`nox.*`) |
| `/employees` | GET/POST | List / register employees |

## Build & run

```bash
docker build -t kyostenas/kirlet-hr:0.1.0 -t kyostenas/kirlet-hr:latest .
docker run --rm -p 3101:3000 kyostenas/kirlet-hr:0.1.0
```
