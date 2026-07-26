FROM node:22-alpine AS build
WORKDIR /origem

# package*.json primeiro faz o npm ci virar camada de cache.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Tudo que comeca com VITE_ entra no bundle em tempo de build, nao em tempo de
# execucao: precisa ser passado como build arg. Definir essas variaveis so no
# ambiente de execucao do servico nao muda nada ate um novo build.
ARG VITE_API_URL=https://atendimento-de-campo-back-production.up.railway.app
ENV VITE_API_URL=${VITE_API_URL}

# Opcionais: trocam a marca empacotada por outra instituicao. Vazias usam a
# marca padrao.
ARG VITE_LOGO_URL
ENV VITE_LOGO_URL=${VITE_LOGO_URL}
ARG VITE_INSTITUICAO
ENV VITE_INSTITUICAO=${VITE_INSTITUICAO}

RUN npm run build

FROM caddy:2-alpine AS runtime
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /origem/dist /srv
EXPOSE 8080
