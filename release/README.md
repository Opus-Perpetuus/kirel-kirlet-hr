# KIRLET-hr release system

Same model as Kirel NOX: custom **standard-version** with full commit-type coverage + `types.extra.json` for new types.

```bash
npm run release:dry
npm run release
git push --follow-tags origin main
```

Image tag: `kyostenas/kirlet-hr:$(cat VERSION)`
