FROM node:26-alpine@sha256:ef24c5053d50fdc3e4e56eb4e7ddb7861874ab0fdc797046ba897581deb8e868 AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:26-alpine@sha256:ef24c5053d50fdc3e4e56eb4e7ddb7861874ab0fdc797046ba897581deb8e868

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
COPY package.json ./

USER node

# stdio transport: the container must be run with -i and without -t.
ENTRYPOINT ["node", "dist/cli.js"]
