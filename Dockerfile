# KIRLET-hr — production multi-stage (oven/bun:1.3-alpine)
#
# Preferred (monorepo sibling kit via named build-context):
#   docker build --build-context kit=../kirel-nox/libs/kit \
#     -t kyostenas/kirlet-hr:$(cat VERSION) .
#
# Requires Docker BuildKit (default on modern Docker).

# syntax=docker/dockerfile:1.4
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
# package.json only: rewriting the file: kit path invalidates a host bun.lock;
# resolve fresh inside the image against a vendored kit tree under /app.
COPY package.json ./
COPY --from=kit . /opt/kit
# Materialize kit under the app tree so node_modules does not symlink outside /app
# (runtime stage would otherwise lose the file: target).
RUN mkdir -p /app/vendor \
  && cp -a /opt/kit /app/vendor/kit \
  && sed -i 's|"@opus-perpetuus/kirel-nox-kit": "file:../kirel-nox/libs/kit"|"@opus-perpetuus/kirel-nox-kit": "file:./vendor/kit"|' package.json \
  && bun install --production \
  && test -e node_modules/@opus-perpetuus/kirel-nox-kit/package.json \
  && test -e node_modules/@opus-perpetuus/kirel-nox-kit/dist/index.js

FROM oven/bun:1.3-alpine
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/vendor ./vendor
COPY --from=deps /app/package.json ./package.json
COPY manifest.json VERSION ./
COPY src ./src

ENV PORT=3000 \
    KIRLET_TECHNICAL_ID=kirlet-hr \
    DATA_DIR=/data \
    KIRLET_AUTH=on

RUN mkdir -p /data/files \
  && chown -R bun:bun /data /app

USER bun
EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=3s --start-period=3s --retries=5 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "src/server.ts"]
