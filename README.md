# 🍼 Diário do Bebê

**A agenda da creche, no celular.** A tia registra a rotina do bebê com poucos toques — mamadeira, refeição, sono, fralda, remédio, temperatura, atividades — e no fim do dia envia aos pais um relatório bonito pelo WhatsApp.

**Acesse:** https://guilhermecorrea77.github.io/day-care/

---

## ✨ Como funciona

### ✏️ Registrar (para a tia)
- **Adesivos grandes por toque**, pensados para quem está com um bebê no colo:
  🍼 Mamadeira · 🍽️ Refeição · 💧 Água · 😴 Dormiu/Acordou · 🧷 Fralda · 🛁 Banho · 💊 Remédio · 🌡️ Temperatura · 🎨 Atividade.
- **A hora já vem preenchida**, e as opções são botões (ex.: *150 ml*, *comeu metade*, *cocô mole*), sem precisar digitar.
- **Sono com cronômetro:** toque em *Dormiu*; quando acordar, toque em *Acordou* e a duração é calculada sozinha.
- **Banho e humor em um toque**, com **Desfazer** se tocar sem querer.
- **Temperatura** com botões − / + e aviso de febre a partir de 37,8 °C (axilar).
- **Remédio** com dose e confirmação de que a autorização dos pais foi conferida.
- **Recado para os pais** num “post-it”, com o nome de quem escreveu.
- **Linha do dia:** toque em qualquer registro para corrigir ou apagar.
- **Tudo é salvo na hora.**

### 📖 Dia (relatório para os pais)
- “O dia de Alice”, com foto, idade e um resumo: horas de sono, refeições, fraldas e humor.
- **Febre e remédio aparecem em destaque no topo.**
- Linha do tempo do dia e o recado da tia.
- **📲 Enviar pelo WhatsApp**, copiar o texto ou imprimir/salvar em PDF.

### 🗓️ Mês
- Calendário com marcas coloridas: sono, fraldas, remédio e febre. Tocar num dia abre o relatório daquele dia.
- Média de sono e de fraldas por dia, dias com febre e gráficos por dia.

### 👶 Crianças
- Várias crianças, com foto, data de nascimento (a idade é calculada) e **alergias e cuidados**, que ficam sempre visíveis na tela de registro.
- **Backup:** baixar uma cópia e restaurar em outro aparelho.

### Também
- Tema **claro, escuro ou do sistema**.
- Feito para celular, tablet e computador.
- **Os registros da versão anterior são convertidos automaticamente**, sem perder nada.

---

## 🔧 O que foi corrigido em relação à versão anterior

| Problema | Correção |
|---|---|
| Os dados só eram salvos ao trocar de aba; fechar a página antes perdia tudo | Salvamento automático a cada registro |
| Depois das 21h a data pulava para o dia seguinte (cálculo em UTC) | Datas sempre no horário local |
| Uma criança só | Várias crianças |
| Texto digitado era inserido como HTML no relatório | Todo texto é tratado antes de exibir |
| Dependia do Tailwind via CDN (não recomendado em produção) e do Chart.js | CSS próprio e gráficos em SVG, sem dependências |
| README descrevia outro app | Atualizado |

---

## 🗺️ Próximos passos sugeridos

1. **Relatório ao vivo para os pais:** um link por criança em que os pais acompanham o dia em tempo real, com os dados **criptografados de ponta a ponta** (dá para reaproveitar a sincronização assinada do projeto [Fila Digital](https://github.com/Guilhermecorrea77/fila-digital)).
2. **Login da creche e várias tias** registrando no mesmo diário, num servidor próprio (ex.: Supabase).
3. **Fotos do dia** no relatório (com autorização de imagem dos pais).
4. **Lembretes:** horário do remédio, mamadeira a cada X horas e itens para trazer (fraldas, pomada, roupa extra).
5. **Curvas de crescimento** (peso e altura) com as referências da OMS.
6. **Visão da turma:** quem está dormindo, quem já comeu e quem tem remédio pendente, numa só tela.
7. **Exportar o mês em PDF** para os pais ou para o pediatra.

---

## 💻 Desenvolvimento

HTML, CSS e JavaScript puro (módulos ES), sem etapa de build.

```bash
git clone https://github.com/Guilhermecorrea77/day-care.git
cd day-care
python3 -m http.server 8080   # abra http://localhost:8080
npm test                       # testes do modelo de dados (Node 18+)
```

```
/
├── index.html
├── css/estilo.css     # visual, temas e animações
├── js/dados.js        # modelo de dados, resumos, texto do WhatsApp e migração (testado)
├── js/app.js          # telas e interação
└── tests/dados.test.js
```

> Os dados ficam só no navegador do aparelho (localStorage). Nada é enviado para a internet.
