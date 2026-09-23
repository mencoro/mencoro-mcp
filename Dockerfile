FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4

# io.modelcontextprotocol.server.name is how the MCP registry proves this image
# belongs to the server named in server.json; it must match that name exactly.
LABEL io.modelcontextprotocol.server.name="com.mencoro/mencoro" \
      org.opencontainers.image.title="Mencoro MCP bridge" \
      org.opencontainers.image.description="Stdio bridge to the hosted Mencoro MCP server." \
      org.opencontainers.image.source="https://github.com/mencoro/mencoro-mcp" \
      org.opencontainers.image.url="https://mencoro.com/features/mcp-server/" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# catalog.json is read at runtime by the keyless setup server, exactly like package.json is read
# for the version: omit it and `docker run` without a credential crashes on startup.
COPY package.json catalog.json ./

USER node

# stdio transport: the container must be run with -i and without -t.
ENTRYPOINT ["node", "dist/cli.js"]
