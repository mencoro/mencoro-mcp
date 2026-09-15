FROM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81 AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81

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
