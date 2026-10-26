# As treze filas, uma por profissional

Cada profissão abre na sua fila. Esta página mostra as treze como elas aparecem
para quem atende nelas — a mesma tela, com os pacientes daquela especialidade.

As imagens saíram do roteiro de ponta a ponta (`e2e/`), rodado contra a API e o
banco de verdade: cada uma é uma sessão real, com login e senha, e a fila
carregada do servidor. Os pacientes e a equipe são fictícios.

## O que a tela mostra

Em todas elas, a mesma estrutura:

- **Atendendo agora** — quem está com você. O cronômetro conta desde que você
  assumiu, e não desde que o paciente entrou na fila: entre uma coisa e outra
  está a espera, e somar as duas faria todo atendimento parecer durar o plantão.
- **Aguardando** — quem ninguém pegou ainda, com o ponto de risco e o tempo de
  espera. É o número que decide quem passa na frente.
- **As abas** — a sua fila primeiro, depois "Todas as filas" e as demais. A
  ordem vem da profissão da sua conta.

## Triagem

**Quem abre aqui:** recepção, enfermeiro, técnico de enfermagem.

Quem está nesta fila ainda não foi triado — por isso o risco aparece em branco.
É a única fila sem cor: classificar é justamente o que acontece aqui.

![Fila da triagem](imagens/filas-01-triagem.png)

## Clínica Geral

![Fila da clínica geral](imagens/filas-02-clinicageral.png)

## Pediatria

![Fila da pediatria](imagens/filas-03-pediatria.png)

## Ortopedia

**Quem abre aqui:** ortopedista e fisioterapeuta.

![Fila da ortopedia](imagens/filas-04-ortopedia.png)

## Odontologia

![Fila da odontologia](imagens/filas-05-odontologia.png)

## Enfermagem

É a segunda aba do enfermeiro: a primeira é a triagem, porque a enfermagem
começa o plantão triando.

![Fila da enfermagem](imagens/filas-06-enfermagem.png)

## Saúde Mental

![Fila da saúde mental](imagens/filas-07-saudemental.png)

## Ginecologia

![Fila da ginecologia](imagens/filas-08-ginecologia.png)

## Cirurgia

![Fila da cirurgia](imagens/filas-09-cirurgia.png)

## Anestesia

O anestesista vê duas filas: anestesia e cirurgia. Avaliar antes e acompanhar
durante são o trabalho dele, e não uma exceção à regra de uma fila por
profissão.

![Fila da anestesia](imagens/filas-10-anestesia.png)

## Cardiologia

![Fila da cardiologia](imagens/filas-11-cardiologia.png)

## Ultrassom

Fila derivada: ninguém chega aqui sem alguém ter mandado.

![Fila do ultrassom](imagens/filas-12-ultrassom.png)

## Farmácia

Também derivada, e com fila própria desde que o farmacêutico deixou de cair na
fila da enfermagem — o que misturava a produção das duas.

![Fila da farmácia](imagens/filas-13-farmacia.png)

## A visão da coordenação

Quem é da coordenação vê as treze abas de uma vez, e "Todas as filas" junta o
plantão inteiro numa lista só.

![Todas as filas](imagens/filas-00-coordenacao-todas.png)

## As contas do plantão

Uma por profissão, como a gestão de contas as mostra. A profissão de cada uma
decide as filas listadas abaixo do nome.

![Gestão de contas](imagens/filas-contas.png)
