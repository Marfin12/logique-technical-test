FROM node:24-alpine AS tooling
RUN npm install --global npm@11.17.0

FROM tooling AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY backend backend
RUN npm run build:contracts && npm run build -w @insurance/backend

FROM tooling AS runtime
WORKDIR /workspace
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /workspace/backend/dist backend/dist
COPY --from=build /workspace/packages/contracts/dist packages/contracts/dist

USER node
CMD ["node", "backend/dist/server.js"]
