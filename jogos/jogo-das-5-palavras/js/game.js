// Módulo de Lógica Pura do Jogo

export function normalizeString(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function criarEstadoJogoLocal(p1Name, p2Name) {
  return {
    jogadores: [
      { id: 1, nome: p1Name, palavras: [] },
      { id: 2, nome: p2Name, palavras: [] },
    ],
    placar: { jogador1: 0, jogador2: 0 },
  };
}

export function prepararPartida(gameState, config) {
  const novoEstado = {
    ...gameState,
    turno: 1,
    vencedor: null,
    etapa: "jogo",
    palavrasDescobertas: {
      jogador1: [true, ...Array(config.wordCount - 1).fill(false)],
      jogador2: [true, ...Array(config.wordCount - 1).fill(false)],
    },
    dicas: {
      jogador1: Array(config.wordCount)
        .fill(null)
        .map(() => []), // Usando Array para ser serializável no Firebase
      jogador2: Array(config.wordCount)
        .fill(null)
        .map(() => []),
    },
  };
  // Adiciona a dica inicial para a segunda palavra
  novoEstado.dicas.jogador1[1].push(0);
  novoEstado.dicas.jogador2[1].push(0);
  return novoEstado;
}

export function processarPalpite(palpite, estadoAtual) {
  const novoEstado = JSON.parse(JSON.stringify(estadoAtual)); // Clona para não modificar o original
  const defensorIdx = novoEstado.turno === 1 ? 1 : 0;
  const defensorKey = `jogador${defensorIdx + 1}`;

  const descobertas = novoEstado.palavrasDescobertas[defensorKey];
  const indice = descobertas.indexOf(false);
  let foiAcerto = false;

  if (indice !== -1) {
    const palavraCerta = novoEstado.jogadores[defensorIdx].palavras[indice];

    if (palpite === palavraCerta) {
      foiAcerto = true;
      descobertas[indice] = true;
      const proximoIndice = indice + 1;
      if (proximoIndice < novoEstado.jogadores[defensorIdx].palavras.length) {
        if (!novoEstado.dicas[defensorKey][proximoIndice]) {
          novoEstado.dicas[defensorKey][proximoIndice] = [];
        }
        novoEstado.dicas[defensorKey][proximoIndice].push(0);
      }
    } else {
      foiAcerto = false;
      const dicasAtuais = new Set(novoEstado.dicas[defensorKey][indice]);
      for (let i = 0; i < palavraCerta.length; i++) {
        if (!dicasAtuais.has(i)) {
          novoEstado.dicas[defensorKey][indice].push(i);
          break;
        }
      }
      novoEstado.turno = novoEstado.turno === 1 ? 2 : 1;
    }
  }

  const estadoFinal = verificarVencedor(novoEstado);
  return { estadoFinal, foiAcerto };
}

function verificarVencedor(estado) {
  if (estado.vencedor) return estado;
  const p1Venceu = !estado.palavrasDescobertas.jogador2.includes(false);
  const p2Venceu = !estado.palavrasDescobertas.jogador1.includes(false);

  if (p1Venceu || p2Venceu) {
    estado.vencedor = p1Venceu ? estado.jogadores[0] : estado.jogadores[1];
    estado.etapa = "vitoria";
    if (p1Venceu) estado.placar.jogador1++;
    else estado.placar.jogador2++;
  }
  return estado;
}
