# Changelog

KIRLET-hr release notes. Types: `release/types.base.json` + `types.extra.json`.

## [0.5.0](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/compare/v0.4.7...v0.5.0) (2026-07-30)


### ⚠ BREAKING CHANGES

* kirlets no longer own a private domain DB; schema and persistence are owned by NOX Postgres via the kit.

### Features

* class modules + kit data client; drop private SQLite ([faf5c18](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/faf5c18c0b5780f613741a5aece29075d55e93fe))

### [0.4.7](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/compare/v0.4.6...v0.4.7) (2026-07-30)


### Features

* **employees:** select platform user via input-menu ([cfef50c](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/cfef50cb83621a844e8381100ae56b6ca885664e))

### [0.4.6](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/compare/v0.4.5...v0.4.6) (2026-07-29)


### Bug Fixes

* **menu:** single RR.HH. group instead of one section per page ([b4078e8](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/b4078e81973f39d4ab674cd92c2afb2b0d495839))
* **release:** bump VERSION and IMAGE.txt as standard-version files ([20cc0cc](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/20cc0cc2f460d3debab66f1363bca4a7faea53fe))
* **release:** use path-string VERSION/IMAGE updaters for standard-version ([aca3174](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/aca317429f2fcab92c59cd2d9cd080f6d82ea2f3))

### [0.4.5](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/compare/v0.4.4...v0.4.5) (2026-07-29)


### Miscellaneous Chores

* **release:** include VERSION and IMAGE.txt for 0.4.4 ([9e31188](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/9e311888e26a39bc10e3314961135c83032288c0))

### [0.4.4](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/compare/v0.4.0...v0.4.4) (2026-07-29)


### Features

* **hr:** live dashboard stats, employee user link, demo metrics ([f9e7c1d](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/f9e7c1dfa870eae14fa4313b2c7339bce2198b48))
* **hr:** registro de incidencias completo (0.4.3) ([45a07bd](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/45a07bdefad62a34f7bf991830a802cc95be9dec))
* **menu:** filled Kirita icon ids on every sidebar entry ([5433e96](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/5433e968500f80f837bff69d56127413ec71b1d6))


### Bug Fixes

* **hr:** allow history read with any module grant ([49154a1](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/49154a1e9c70314c915952b35b36a167729a216a))
* **hr:** log real actor email on request lines ([0b605f4](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/0b605f44d3319874a02d911deff3bcef0af30e1e))
* **icon:** original opus-reticulatum mark replaces Material glyph ([45ec09c](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/45ec09cdce7e5de68b1718f07222290dcfc7b857))


### Docker

* **hr:** vendor kit inside image so node_modules resolve at runtime ([8278d9c](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/8278d9c5fa1dedb5fc1fa7ac0d9dc4b10cd3e44a))


### Documentation

* **brand:** README logo and reticulatum mark assets ([8883d13](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/8883d13c74294a797a54a88b8818b2e21198c43e))


### Miscellaneous Chores

* **release:** 0.4.1 with reticulatum manifest icon ([c36e935](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/c36e935ecd53903707c5e00dccfd0a35dffcd9f8))
* **release:** sync NOX catalog pin on postbump ([42a1013](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/42a10133211392095f0cfec4832b8f961a6aaa6c))

## 0.3.0 (2026-07-19)


### Features

* HR kirlet with employee registration sub-menu ([e899e2c](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/e899e2c0e0f70bc122858df7e34fa11f964ca746))
* **hr:** change-history hooks on employee mutations ([d23c548](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/d23c548392dbe4c9093ace3736ffc18ce4267c15))
* **hr:** collapse menu to single Employees entry ([fd8b2c5](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/fd8b2c5b5b187d5ccee0e5b25ca389cd59980486))
* **hr:** Docker image + manifest version bump ([5009315](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/50093159d60c7a83d2d51e2f9cf9b6fb0d5d5344))
* **hr:** Docker image + manifest version bump prep ([7e5e43e](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/7e5e43ef0fcb7d6011f4a698ae059ba7f74a169e))
* **hr:** employees detail and edit page descriptors ([5ebf387](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/5ebf38777d45e417f773e6195d5f0f2775656549))
* **hr:** Employees list page via feature-shell pattern ([beb5784](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/beb578442d0e56ee1a94d7d0b30f3cddb25c17ce))
* **hr:** Kirita list columns + form fields ([fcd6de4](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/fcd6de468eb435baebf692b6ef66b80c08fb859c))
* **hr:** permissions for employees read/write ([3d90d27](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/3d90d279e964dcb126050487f0b1d9f1527ccf60))
* **hr:** pluralLabel Empleados + page titles ([4d76b0c](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/4d76b0c3c7ffbdc81ace67b65b3c3456b4d7d5de))
* **hr:** seed/demo employees data path ([b42f536](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/b42f53640b62341c0bef1fff5077eaf9452c2592))
* **release:** custom standard-version with full commit types + docker script ([9325489](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/9325489c273958dd860fbb3274bb26aef8d9570d))


### Bug Fixes

* **hr:** routes and menu paths ([fd1f59e](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/fd1f59e5905c63d6f1661143f0a7575d00f4090b))


### Tests

* **hr:** server unit tests for employees CRUD ([7adb331](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/7adb3310bc502b26c6cf3c14580d1c35623ffd1a))


### Styles

* **hr:** polish employees UI descriptors ([940fecb](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/940fecb447dccc7191c87fdc3d6210ed63e3b2e0))


### Miscellaneous Chores

* clone HR skirlet into opus-perpetuus workspace root ([d1330f6](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/d1330f691ab2c79856d5cef1963e404dce4fd41b))
* **hr:** add gitignore for node_modules and logs ([c3757de](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/c3757de9f4ff767547396d013a74cd34ea75451b))
* **hr:** baseline scripts and package hygiene ([e3a3c58](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/e3a3c58b154bc3d12a540385dd2ad90de875f3ea))
* **hr:** release commit Employees feature-shell MVP ([ca11242](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/ca11242678d0422639a61aa59ef737e40ac38ac1))


### Documentation

* **hr:** align README with feature-shell principles ([6494995](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/64949950d3fde6bad602ce4d4332ac778e655bad))
* **hr:** feature-shell Employees usage ([3a10b91](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/3a10b91ecbc2ae60454bdf63708f0868fabcfd30))
* **hr:** source-of-truth note for opus-perpetuus clone ([7de7878](https://github.com/Opus-Perpetuus/kirel-kirlet-hr/commit/7de787852abe087c5fe80e43f1ba0253d4fc49d9))
