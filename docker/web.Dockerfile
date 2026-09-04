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
COPY frontend frontend
ARG API_INTERNAL_URL=http://api:4000
ENV API_INTERNAL_URL=$API_INTERNAL_URL
RUN npm run build:contracts && npm run build -w @insurance/frontend

FROM node:24-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /workspace/frontend/.next/standalone ./
COPY --from=build /workspace/frontend/.next/static frontend/.next/static
COPY --from=build /workspace/frontend/public frontend/public

USER node
CMD ["node", "frontend/server.js"]
