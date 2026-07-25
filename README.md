# Atendimento de Campo

Sistema de acompanhamento de atendimentos médicos em campo (missões/bases de
voluntariado): o paciente entra pela **Triagem**, é classificado por risco
(START: Vermelho/Amarelo/Verde/Preto) e encaminhado para os setores clínicos
(Clínica Geral, Enfermagem, Pediatria — mais setores entram nas próximas
fases), até ser finalizado. Cada etapa fica registrada com responsável,
horário e um log de auditoria campo a campo.

Este é o **MVP** (fase 1). Fora de escopo por enquanto, para fases futuras:
Ortopedia, Odontologia (com odontograma), Saúde Mental, Painel/Relatórios
avançados (gráficos, CID, demografia, consumo de medicamentos), export
CSV/PDF, multi-idioma (PT/ES/EN) e geolocalização exibida no mapa.

## Arquitetura

Monorepo com dois serviços independentes, pensados para rodar como dois
serviços separados no [Railway](https://railway.app):

```
/backend    API .NET 8 (ASP.NET Core Web API + MongoDB.Driver, JWT)
/frontend   React + Vite + TypeScript + Tailwind
```

### Modelo de dados (resumo)

Banco de dados: **MongoDB**. Três coleções:

- **bases** — acampamento/abrigo onde a equipe atende; tem uma senha de
  equipe compartilhada.
- **usuarios** — voluntário (nome, função, registro profissional). Criado
  automaticamente no primeiro login de cada base.
- **atendimentos** — o "prontuário" do paciente: dados pessoais, código
  curto, classificação de risco, status, e dois arrays **embutidos** no
  próprio documento:
  - `etapas` — cada passagem por um setor (Triagem, Clínica Geral,
    Enfermagem, Pediatria). Os campos clínicos variam muito por setor,
    então ficam guardados como um sub-documento dinâmico em vez de uma
    coleção por especialidade — isso deixa fácil adicionar novos setores
    depois (basta registrar o schema do formulário no frontend, o
    backend não precisa mudar).
  - `historico` — log de auditoria: quem alterou o quê, valor anterior →
    novo, quando.

Modelar Etapas e Histórico como sub-documentos embutidos (em vez de
coleções separadas com referência) é proposital: eles sempre são lidos e
escritos junto com o atendimento, então evita joins/lookups e casa bem
com o jeito de modelar dados do MongoDB.

### Autenticação

Modelo simplificado adequado a equipes de campo: cada base tem **uma senha
de equipe** (compartilhada). Ao logar, a pessoa informa nome, função e a
senha da base; se é a primeira vez que esse nome aparece naquela base, o
cadastro é criado automaticamente. Isso identifica quem fez cada ação
(para o histórico/produção por voluntário) sem exigir gestão de senha
individual. Se depois for necessário granularidade por pessoa (senha
própria, permissões por função), dá para evoluir sem quebrar o schema.

> ⚠️ Este ambiente de desenvolvimento não tinha o SDK do .NET disponível
> (proxy bloqueia o domínio de download), então o backend não foi
> compilado localmente. A sintaxe segue os padrões-padrão do ASP.NET Core
> 8 minimal hosting — rode `dotnet build` antes do primeiro deploy para
> confirmar.

## Rodando localmente

### Backend

Requer .NET 8 SDK e MongoDB local (ou um container `mongo:7`, ex.:
`docker run -d -p 27017:27017 mongo:7`).

```bash
cd backend/AtendimentoCampo.Api
dotnet restore
dotnet run
```

Por padrão usa `appsettings.Development.json` (Mongo em
`mongodb://localhost:27017`, banco `atendimento_campo`). MongoDB não tem
schema/migração — as coleções e índices são criados automaticamente no
start, e uma Base "Base Principal" com senha de equipe `equipe123` é
semeada se o banco estiver vazio.

### Frontend

Requer Node 18+.

```bash
cd frontend
cp .env.example .env   # ajuste VITE_API_URL se necessário
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Deploy no Railway

1. Crie um projeto no Railway e adicione um plugin **MongoDB**.
2. Crie um serviço apontando para este repositório com **Root Directory =
   `backend`** (ele vai detectar o `Dockerfile`). Variáveis de ambiente:
   - `MONGO_URL` → referencie a variável do plugin Mongo
     (`${{MongoDB.MONGO_URL}}` — confira o nome exato da variável na aba
     "Variables" do plugin Mongo criado, pode vir como `MONGO_URL` ou
     `MONGO_PUBLIC_URL`/`MONGO_PRIVATE_URL` dependendo do template)
   - `JWT_KEY` → uma string aleatória longa (ex.: `openssl rand -base64 48`)
   - `FRONTEND_ORIGIN` → URL pública do serviço do frontend (pode ajustar
     depois de criar o segundo serviço)
   - `SEED_BASE_NOME` / `SEED_BASE_SENHA` (opcionais) → nome e senha da
     primeira base criada automaticamente
3. Crie um segundo serviço no mesmo projeto, apontando para este
   repositório com **Root Directory = `frontend`** (Nixpacks detecta
   Node automaticamente). Variável de ambiente:
   - `VITE_API_URL` → URL pública do serviço do backend
4. Redeploy o backend depois de ter a URL final do frontend, para o CORS
   (`FRONTEND_ORIGIN`) liberar a origem certa.

## Roadmap (pós-MVP)

- Setores: Ortopedia, Odontologia (com odontograma interativo),
  Psicólogo/Saúde Mental
- Painel avançado: gráficos de risco/desfecho/demografia, diagnósticos
  CID, sintomas, condições crônicas, vulnerabilidades, catálogo de
  medicamentos com consumo agregado
- Exportação CSV/PDF e impressão
- Multi-idioma (PT/ES/EN)
- Mapa com geolocalização dos atendimentos
