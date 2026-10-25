# Manual do Atendimento de Campo

Como usar o sistema, por profissional. Cada página tem as telas reais, na ordem
em que aparecem no plantão.

As imagens foram capturadas do sistema em funcionamento, contra a API e o banco
de verdade. Os pacientes e a equipe são fictícios.

## Por onde começar

| Se você é | Leia |
|---|---|
| Qualquer pessoa, no primeiro dia | [Primeiro acesso](01-primeiro-acesso.md) |
| Coordenação / administrador | [Coordenação](02-coordenacao.md) |
| Recepção | [Recepção e cadastro](03-recepcao.md) |
| Enfermeiro, técnico de enfermagem | [Triagem](04-triagem.md) e [Enfermagem](07-enfermagem.md) |
| Clínico, pediatra, ortopedista, ginecologista, cardiologista, psicólogo, fisioterapeuta | [Consultas](05-consultas.md) |
| Dentista | [Odontologia](06-odontologia.md) |
| Farmacêutico | [Farmácia](08-farmacia.md) |
| Ultrassonografista | [Ultrassom](09-ultrassom.md) |
| Cirurgião, anestesista | [Cirurgia e anestesia](10-cirurgia-e-anestesia.md) |
| Todos | [Alta e desfecho](11-alta-e-desfecho.md) e [Prontuário e auditoria](12-prontuario-e-auditoria.md) |

## O caminho do paciente

O sistema é uma sequência de **filas**. O paciente entra numa, alguém o assume,
registra a ficha daquela etapa, e então o encaminha para outra fila ou encerra o
atendimento.

```
                  ┌──────────────────────────────────────────┐
                  │                                          │
   Recepção       │   Triagem          Filas clínicas        │   Alta
   cadastra   ──▶ │   classifica  ──▶  consulta, odonto, ──▶ │   encerra
   o paciente     │   o risco          enfermagem, ...       │   o atendimento
                  │                                          │
                  └──────────────────────────────────────────┘
                         ▲                     │
                         └─────────────────────┘
                          devolução à fila de origem
```

Três coisas que valem para todas as etapas:

- **Assumir tira o paciente da fila dos outros.** Enquanto você não assume, ele
  aparece para todo mundo daquela fila. Depois de assumir, aparece como seu.
  Se você não vai atender, use **Liberar** para devolvê-lo à fila.
- **Você pode atender fora da sua fila.** Em campo a equipe é curta e as funções
  se cobrem — o médico tria quando a fila estoura. Nada trava isso; o sistema só
  registra no histórico que o atendimento foi feito fora da fila habitual.
- **A alta pode ser dada de qualquer etapa.** Não é preciso voltar ao prontuário
  nem passar por outra fila. Veja [Alta e desfecho](11-alta-e-desfecho.md).

## Em que fila cada profissão entra

A profissão escolhida no cadastro decide qual fila abre por padrão. A primeira
da lista é a que aparece primeiro.

| Profissão | Filas | Registro no conselho |
|---|---|---|
| Clínico(a) geral | Clínica Geral | CRM |
| Pediatra | Pediatria | CRM |
| Ortopedista | Ortopedia | CRM |
| Ginecologista | Ginecologia | CRM |
| Cirurgião(ã) | Cirurgia | CRM |
| Anestesista | Anestesia, Cirurgia | CRM |
| Cardiologista | Cardiologia | CRM |
| Ultrassonografista | Ultrassom | CRM |
| Dentista | Odontologia | CRO |
| Enfermeiro(a) | Triagem, Enfermagem | COREN |
| Técnico(a) de enfermagem | Triagem, Enfermagem | COREN |
| Psicólogo(a) | Saúde Mental | CRP |
| Fisioterapeuta | Ortopedia | CREFITO |
| Farmacêutico(a) | Farmácia | CRF |
| Recepção | Triagem | — |
| Coordenação | todas | — |
| Outro | todas | — |

O anestesista vê duas filas porque avalia antes da cirurgia e acompanha durante:
as duas são o trabalho dele, não uma exceção. A enfermagem vê duas porque começa
o plantão triando e depois atende na própria fila.

Existe ainda a profissão **Médico**, sem especialidade, que vê Clínica Geral,
Pediatria e Ortopedia ao mesmo tempo. Ela só existe para contas criadas antes de
as especialidades existirem e não é oferecida em cadastro novo — a coordenação
deve reclassificar essas contas.

## Idioma

O sistema fala português, espanhol e inglês. A escolha fica no menu do cabeçalho
e também na tela de entrada, antes de fazer login — que é onde ela importa para
quem chega e não lê português.

## Funciona offline?

Parcialmente, e é importante saber onde está o limite.

O app é instalável (PWA) e **abre** sem rede: ele fica guardado no aparelho. O
que não funciona sem rede é qualquer coisa que dependa da API — carregar a fila,
buscar um paciente pelo código, salvar uma ficha. Nessas horas aparece
**"Sem conexão"**, e o que você tentou salvar **não foi gravado**.

O que o app protege é o formulário: triagem, consulta, cirurgia, sinais vitais e
cadastro guardam um rascunho no próprio aparelho enquanto você digita. Se a tela
fechar, o aparelho desligar ou a rede cair, o texto continua lá quando você
voltar. O rascunho é local: ele não chega a ninguém até você salvar com sinal.

Na prática: dá para preencher sem rede e salvar quando o sinal voltar. Não dá
para considerar gravado o que não mostrou confirmação.
