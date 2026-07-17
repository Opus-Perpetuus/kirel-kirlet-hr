# Employees feature-shell

| Mode | Route / page id | Behavior |
|------|-----------------|----------|
| List | `hr.employees.list` | Table `fillHeight`, columns name/email/depto |
| Detail | `hr.employees.detail?id=` | Read-only form; title = Name |
| Edit | `hr.employees.edit?id=` | PATCH form; title = Editando el empleados: Name |

Standard fields: `id`, `name` (+ HR fields).

History: `GET /history?record_id=` + auto-append on POST/PATCH.

## Change history

Mutations (POST/PATCH employees) append to an in-memory audit list:

- resource: `employee`
- record_id, action, summary, payload before/after
- Query: `GET /history?record_id=<id>`
