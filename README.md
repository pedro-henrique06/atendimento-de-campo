# Atendimento de Campo — App

Interface da plataforma de atendimento de campo hospitalar. Mobile-first, três
idiomas (PT/ES/EN), tema claro e escuro, feita para uso em celular no campo.

**Stack:** React 18 · Vite 6 · TypeScript · Tailwind CSS

## Rodando

```bash
npm install
npm run dev            # http://localhost:5173
```

O Vite faz proxy de `/api` para `http://localhost:5080`, onde roda a API do
repositório `atendimento-de-campo-back`. Suba o backend antes.

```bash
npm test               # 33 testes
npm run build
```

## Deploy no Railway

O repositório traz `Dockerfile`, `Caddyfile` e `railway.json`. O build gera os
arquivos estáticos e o Caddy os serve.

### Variável

| Variável | Valor |
|---|---|
| `VITE_API_URL` | URL do serviço da API, sem barra final |
| `VITE_LOGO_URL` | Logotipo da instituição que opera a base — opcional |
| `VITE_INSTITUICAO` | Nome da instituição — opcional |

**Elas são lidas em tempo de build, não de execução.** O Vite embute o valor no
bundle, então precisa estar definida no serviço do front *antes* de publicar —
defini-la depois não muda nada até um novo deploy. No Railway, adicione também
como *build arg* se o serviço não repassar as variáveis automaticamente.

Em desenvolvimento deixe vazia: o proxy do Vite encaminha `/api` para
`http://localhost:5080`.

### Logotipo da instituição

`VITE_LOGO_URL` aceita um caminho servido pelo próprio app ou uma URL completa.
**Prefira o arquivo local:** coloque a imagem em `public/` (ex.: `public/logo.png`)
e aponte `VITE_LOGO_URL=/logo.png`. Ela vai junto do bundle e continua aparecendo
quando a rede em campo cai; uma URL externa depende do servidor de origem estar
no ar. O logotipo é desenhado em cima de uma placa branca, porque marca
institucional costuma ser feita para fundo claro e sumiria no tema escuro.

Sem as duas variáveis o app usa a marca própria dele. Ele não embute logotipo de
nenhuma instituição: o que aparece é o que a coordenação configurou, e cabe a
ela ter o direito de uso da marca que subir ali.

### Rotas do lado do cliente

O `Caddyfile` faz `try_files {path} /index.html`. Sem isso, recarregar a página
em `/atendimentos/<id>` devolveria 404 — o arquivo não existe no disco, só a
rota existe dentro do JavaScript.

### CORS

A URL pública do front precisa estar em `Cors__OrigensTexto` no serviço da API.
Sem isso o app carrega normalmente e **toda** chamada é bloqueada pelo
navegador, com erro que não explica o motivo.

## Telas

| Rota | Tela |
|---|---|
| `/entrar` | Login com usuário e senha |
| `/criar-conta` | Registro de nova conta, sujeito a aprovação |
| `/bases` | Seleção da base de atendimento |
| `/atendimentos` | Fila, com filtro por especialidade, risco e busca |
| `/atendimentos/novo` | Cadastro do paciente e abertura |
| `/atendimentos/:id` | Prontuário completo |
| `/atendimentos/:id/triagem` | Triagem e classificação START |
| `/atendimentos/:id/consulta/:especialidade` | Consulta médica |
| `/atendimentos/:id/odontologia` | Odontologia com odontograma |
| `/contas` | Gestão de contas — só para administradores |

## Decisões

### Contas e acesso

Login e registro são telas separadas. Antes eram a mesma: se o nome não
existisse e a senha batesse com a da equipe, a conta era criada em silêncio — e
um erro de digitação no nome virava uma conta nova em vez de um erro de login.

A conta nasce **pendente** e não acessa nada até um administrador aprovar. A
tela de recusa diz o motivo, porque sem isso a pessoa fica sem saber se errou
algum dado e volta a tentar criar conta.

A identidade é um **usuário curto**, sugerido a partir do nome
("Cláudia Cândido da Luz" → `claudia.luz`) e editável. O modelo anterior
identificava por nome + função, o que impedia duas pessoas homônimas na mesma
função de terem conta e obrigava a digitar o nome completo a cada plantão.

A tela `/contas` some para quem não é administrador, mas quem garante a
restrição é o servidor: a API responde 403 independentemente do que a interface
mostre.

### Offline parcial

O envio exige conexão, mas o que o profissional já digitou não depende dela.
`useRascunho` salva o formulário em andamento no aparelho a cada alteração e
recupera se a aba fechar, o navegador matar a página ou o celular reiniciar no
meio do atendimento. O rascunho é apagado quando o servidor aceita o registro.

Erro de rede é tratado à parte de erro de servidor: em campo a causa mais comum
de falha é falta de sinal, e a tela precisa oferecer "tentar de novo" em vez de
acusar o preenchimento.

### Alerta de alergia

O componente `AlertaAlergia` não decide nada: ele exibe se, e somente se, o
backend disser `alerta.exibir`. No sistema que serviu de referência a interface
exibia alerta vermelho para qualquer texto preenchido no campo de alergia,
inclusive `"Nega alergia medicamentosa"` — e alerta que aparece em todo paciente
deixa de ser lido justamente por quem precisa dele.

### Odontograma

Cada dente pode carregar vários estados ao mesmo tempo, e cada estado ganha a
sua própria faixa de cor. No odontograma de referência um dente com cárie **e**
extração indicada era pintado de uma cor só, e a cárie sumia do desenho.

A cor nunca é o único portador da informação: o dente também mostra as iniciais
dos estados, o `aria-label` lista todos por extenso, e o resumo textual repete
tudo. Faces só são oferecidas para estados que se localizam em faces — extração
indicada, prótese e implante são do dente inteiro.

### Nada de enum na tela

Toda tradução vive em `src/i18n/`, e `enums.spec.ts` falha se algum valor de
enum ficar sem rótulo em qualquer um dos três idiomas, ou se algum rótulo for
igual ao identificador técnico. O relatório do sistema de referência exibia
`consulta_medica` cru no meio de rótulos traduzidos, por uma chave que faltava.

O histórico de alterações segue a mesma regra por um motivo extra: a auditoria
guarda chave e valor **canônicos** (`triagem.classificacaoRisco` → `Verde`), e
`src/i18n/auditoria.ts` traduz na hora de exibir. Gravar o rótulo pronto
congelaria o histórico no idioma de quem digitou — um registro feito em espanhol
apareceria em espanhol para quem revisa em português meses depois.

### Toque e leitura em campo

Alvo mínimo de 44px em tudo que é clicável, para uso com luva. Escolhas em
grupos de botões no lugar de `select` sempre que a lista é curta. Tema escuro
por padrão, claro disponível no cabeçalho, e ambos seguem o aparelho quando não
há escolha explícita. Listas largas — arcada dentária, filtros — rolam dentro do
próprio contêiner: a página nunca ganha rolagem horizontal.

## Estrutura

```
src/
  api/          cliente HTTP e tipos do contrato
  componentes/  peças compartilhadas (odontograma, dispensação, básicos)
  hooks/        sessão, tema, rascunho local
  i18n/         textos, rótulos de enum e tradução da auditoria
  paginas/      uma por rota
```
