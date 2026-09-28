# syntax=docker/dockerfile:1

# The showcase site, not the library: the library ships to npm. The site is fully
# prerendered (adapter-static), so the image is a static file server and the files.

FROM node:24.21-trixie-slim@sha256:8ec5d7557396cfe32d21c3f9c13072355ceab22b584578ca4bb28af31120cffe AS build
WORKDIR /app
# pnpm's version comes from `packageManager` in package.json.
RUN corepack enable
ENV PNPM_HOME=/pnpm
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY . .
RUN pnpm exec vite build

# Only the binary is taken: the upstream image runs as root on port 80.
FROM ghcr.io/static-web-server/static-web-server:2.44.0@sha256:2c1a7c3e0feaea5859307403b74e1c575f3ec1499094fc077344173d11abaae2 AS server

FROM scratch
ARG GIT_SHA=dev
LABEL org.opencontainers.image.source="https://github.com/p-arndt/mascbob" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.licenses="MIT"
COPY --from=server /static-web-server /static-web-server
COPY --from=build /app/build /public
COPY sws.toml /sws.toml
ENV SERVER_CONFIG_FILE=/sws.toml
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/static-web-server"]
