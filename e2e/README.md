# Roteiro de ponta a ponta

Uma conta para cada profissão, um paciente da recepção à alta, e um print de
cada uma das treze filas.

Os testes de `src/**/*.spec.tsx` conferem telas isoladas, com a API simulada.
Este roteiro confere a outra metade: o app e a API conversando de verdade, em
ordem, com um banco de verdade atrás. É onde aparecem os erros que só existem
entre as duas pontas — campo que grava e não volta, fila que abre no banco e
não na tela, permissão que a interface esconde e o servidor aceita.

## Como rodar

Precisa de três coisas de pé: o Postgres, a API e o app.

```sh
# 1. a API, com uma conta de coordenação para semear o resto
ASPNETCORE_URLS=http://localhost:5080 \
Admin__Usuario=coordenacao Admin__Senha='...' \
dotnet run --project src/AtendimentoDeCampo.Api --no-launch-profile

# 2. o app
npm run dev

# 3. o roteiro
E2E_ADMIN_SENHA='...' \
E2E_PLAYWRIGHT=/caminho/do/playwright \
node e2e/executar.mjs
```

| Variável | Para quê | Padrão |
| --- | --- | --- |
| `E2E_ADMIN_SENHA` | senha da conta de coordenação que semeia o elenco | — (obrigatória) |
| `E2E_ADMIN_USUARIO` | usuário dessa conta | `coordenacao` |
| `E2E_API` | onde está a API | `http://localhost:5080` |
| `E2E_APP` | onde está o app | `http://localhost:5173` |
| `E2E_PRINTS` | onde gravar os prints | `e2e/prints` |
| `E2E_PLAYWRIGHT` | de onde importar o Playwright | `playwright` |
| `E2E_PERMITIR_REMOTO` | libera uma API que não seja local | — |

Modos:

```sh
node e2e/executar.mjs --sem-prints   # só o roteiro, sem navegador
node e2e/executar.mjs --so-prints    # só os prints, com o elenco já no banco
```

Sai com código 1 quando algum passo falha, algum fica sem executar ou algum
print não sai — é o que faz isto valer em automação.

### Não aponte para uma base de verdade

O roteiro cria contas com uma senha escrita neste repositório e deixa dezenas
de pacientes de mentira para trás. Num prontuário real não há como separar
depois o paciente fictício do paciente. Por isso a API precisa ser local, e sair
disso exige dizer `E2E_PERMITIR_REMOTO=1` por escrito.

### Playwright

Não é dependência do projeto. O navegador é o que estiver instalado na máquina,
e `E2E_PLAYWRIGHT` diz onde encontrá-lo. Fixar uma versão aqui brigaria com o
Chromium já baixado: outra versão do pacote não acha o navegador que existe.

### Para os prints saírem limpos

As filas se enchem a cada rodada, e o banco não é limpo entre elas — de
propósito, porque rodar duas vezes seguidas tem que funcionar. Para prints de
apresentação, recrie o banco antes: a API roda as migrações e semeia bases,
catálogo e CID-10 ao subir.

## O que o roteiro cobre

Seis blocos, em ordem. Cada um recebe o estado em que o anterior parou — o
clínico só atende quem a triagem encaminhou, e a farmácia só confere o que
alguém prescreveu. Por isso a falha de um passo para o bloco: os seguintes
testariam um estado que não existe, e a cascata de falhas esconderia a primeira,
que é a única real.

**1. Contas — uma por profissão.** As dezessete profissões que o cadastro
oferece, cada uma pelo caminho inteiro do primeiro acesso: a coordenação
cadastra, a senha provisória sai uma única vez na resposta, a conta com senha
provisória não consegue fazer mais nada além de trocá-la, e é com a senha nova
que a pessoa entra. Confere também a fila que abre para cada profissão — que é o
motivo de existir uma conta por profissão, e não uma genérica — e os dois eixos
da permissão: função decide fila, administrador decide gestão.

**2. Filas — as treze com gente dentro.** Três pacientes em cada: dois
esperando, com riscos diferentes, e um assumido por quem é daquela fila. São os
três juntos que fazem a tela mostrar o que ela tem para mostrar. Confere também
o que a lista faz: esconder quem já está com outra pessoa, separar por risco,
achar por código e por nome.

**3. Fichas — uma preenchida em cada fila.** Triagem com a sugestão do START,
consulta com CID e prescrição, criança com nome da mãe, bloco de trauma,
odontograma com dois estados no mesmo dente, procedimentos de enfermagem,
sintomas e perdas da saúde mental, história obstétrica, a ficha cirúrgica
inteira — das quatro paradas à recuperação —, avaliação pré-anestésica,
teleconsulta, laudo assinado e dispensação com item fora do catálogo. Cada passo
grava e lê de volta: metade dos erros de contrato só aparece na volta.

**4. Jornada — da recepção à alta.** Um paciente, seis profissionais, em
sequência: recepção cadastra, enfermagem assume e tria, clínica geral atende e
pede ultrassom, o laudo volta para quem pediu, a farmácia confere o que foi
prescrito, e a alta fecha o atendimento. No fim, o tempo de vida do atendimento,
fila por fila.

**5. Desfechos.** Alta com fila pendente (recusada antes de confirmada),
transferência (exige dizer para onde), óbito (ação própria no histórico) e outro
(exige o motivo). Mais evasão, que é desfecho da ficha e não do atendimento.

**6. Exceções.** O que o sistema permite de propósito e registra: assumir fora
da própria fila, liberar de volta, devolver para quem encaminhou, encaminhar sem
ter atendido. Mais o que ele recusa: menor sem responsável, cadastro sem
consentimento, alergia sem dizer qual.

## Os prints

Um por fila, pela conta de quem atende nela, mais a visão da coordenação com as
treze abas e a tela de contas com o elenco inteiro.

Saem do navegador de verdade, com login de verdade: a tela é aberta, a senha é
digitada, a aba da fila é clicada. Montar a sessão no `localStorage` e ir direto
para a URL seria mais rápido e tiraria do caminho justamente o que o print
deveria provar — que a pessoa entra, cai na fila dela e vê os pacientes.

A tabela de quem printa cada fila está em `elenco.mjs`. Ela existe porque nem
toda fila é a padrão de alguém: a enfermagem é a segunda aba do enfermeiro,
já que a enfermagem começa o plantão triando. Sem a tabela, seria a única fila
sem print, e a falta passaria por acidente.

## Arquivos

| Arquivo | O quê |
| --- | --- |
| `executar.mjs` | roda tudo, escreve o relatório, define o código de saída |
| `motor.mjs` | o encadeamento dos blocos e as conferências |
| `api.mjs` | o cliente HTTP, e a trava contra apontar para uma base real |
| `elenco.mjs` | as contas, as filas e quem printa cada uma |
| `comum.mjs` | abrir paciente, triar, pôr na fila |
| `blocos/*.mjs` | os seis blocos |
| `prints.mjs` | o navegador |
| `prints/relatorio.md` | o que saiu da última rodada |
