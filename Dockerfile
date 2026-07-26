FROM node:22-alpine AS build
WORKDIR /origem

# package*.json primeiro faz o npm ci virar camada de cache.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# A URL da API entra no bundle em tempo de build, nao em tempo de execucao:
# precisa ser passada como build arg.
ARG VITE_API_URL=https://atendimento-de-campo-back-production.up.railway.app
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM caddy:2-alpine AS runtime
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /origem/dist /srv
EXPOSE 8080
