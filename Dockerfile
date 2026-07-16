# KIRLET-hr — Human Resources (employee registration)
FROM oven/bun:1.2-alpine

WORKDIR /app
COPY package.json server.ts manifest.json ./

ENV PORT=3000
ENV KIRLET_TECHNICAL_ID=kirlet-hr
EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=3s --start-period=2s --retries=5 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "server.ts"]
