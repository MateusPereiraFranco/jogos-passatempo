// Módulo de Interface do Usuário (UI)

export const elements = {
  toast: document.getElementById("toast-notification"),
  btnHome: document.getElementById("btn-home"),
  btnVoltar: document.getElementById("btn-voltar"),
  telas: {
    inicial: document.getElementById("tela-inicial"),
    onlineLobby: document.getElementById("tela-online-lobby"),
    criarSala: document.getElementById("tela-criar-sala"),
    espera: document.getElementById("tela-espera"),
    nomes: document.getElementById("tela-nomes"),
    setup: document.getElementById("tela-setup-palavras"),
    aguardandoPalavras: document.getElementById("tela-aguardando-palavras"),
    transicao: document.getElementById("tela-transicao"),
    jogo: document.getElementById("tela-jogo"),
    vitoria: document.getElementById("tela-vitoria"),
  },
  listaSalas: document.getElementById("lista-salas"),
  nomeSalaInput: document.getElementById("nome-sala-input"),
  senhaSalaInput: document.getElementById("senha-sala-input"),
  nomeCriadorInput: document.getElementById("nome-criador-input"),
  p1NameInput: document.getElementById("p1-name-input"),
  p2NameInput: document.getElementById("p2-name-input"),
  containerP1Name: document.getElementById("container-p1-name"),
  containerP2Name: document.getElementById("container-p2-name"),
  setupTitulo: document.getElementById("setup-titulo"),
  setupDescricao: document.getElementById("setup-descricao"),
  setupInputs: document.getElementById("setup-inputs"),
  transicaoTexto: document.getElementById("transicao-texto"),
  headerP1Name: document.getElementById("header-p1-name"),
  headerP1Score: document.getElementById("header-p1-score"),
  headerP2Name: document.getElementById("header-p2-name"),
  headerP2Score: document.getElementById("header-p2-score"),
  headerP1: document.getElementById("header-p1"),
  headerP2: document.getElementById("header-p2"),
  boardP1: document.getElementById("jogador1-board"),
  boardP2: document.getElementById("jogador2-board"),
  boardTitle1: document.getElementById("board-title-1"),
  boardTitle2: document.getElementById("board-title-2"),
  p1Words: document.getElementById("jogador1-words"),
  p2Words: document.getElementById("jogador2-words"),
  guessInput: document.getElementById("guess-input"),
  submitBtn: document.getElementById("submit-guess-btn"),
  inputArea: document.querySelector(".input-area"),
  vencedorNome: document.getElementById("vencedor-nome"),
  finalP1Name: document.getElementById("final-p1-name"),
  finalP1Score: document.getElementById("final-p1-score"),
  finalP2Name: document.getElementById("final-p2-name"),
  finalP2Score: document.getElementById("final-p2-score"),
};

function init() {
  mudarTela("inicial");
}

init();

let toastTimeout;
export function showToast(message, type) {
  clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.className = `toast-${type} show`;
  toastTimeout = setTimeout(
    () => elements.toast.classList.remove("show"),
    2000
  );
}

export function mudarTela(telaVisivel) {
  Object.values(elements.telas).forEach((tela) => tela.classList.add("hidden"));
  elements.telas[telaVisivel]?.classList.remove("hidden");
  elements.btnVoltar.classList.toggle(
    "hidden",
    ["inicial", "vitoria"].includes(telaVisivel)
  );
  const isHomeHidden = !["inicial"].includes(telaVisivel);
  elements.btnHome.classList.toggle("hidden", isHomeHidden);
}

export function renderizarLobby(salas) {
  elements.listaSalas.innerHTML = "";
  let encontrouSala = false;
  if (salas) {
    Object.entries(salas).forEach(([salaId, salaData]) => {
      if (salaData.metadata?.status === "aguardando") {
        encontrouSala = true;
        const li = document.createElement("li");
        li.dataset.id = salaId;
        const lockIcon = salaData.metadata.temSenha ? `🔒` : "";
        li.innerHTML = `<div class="sala-info"><span class="sala-nome">${salaData.metadata.nomeSala}</span><span class="sala-criador">Por: ${salaData.metadata.criador}</span></div><div class="sala-status aguardando"><span>${lockIcon} Aguardando</span></div>`;
        elements.listaSalas.appendChild(li);
      }
    });
  }
  if (!encontrouSala) {
    elements.listaSalas.innerHTML =
      "<li>Nenhuma sala disponível. Crie uma!</li>";
  }
}

export function prepararTelaNomes(modo, nomeLabel) {
  elements.containerP1Name.style.display = "block";
  elements.containerP2Name.style.display = modo === "local" ? "block" : "none";
  elements.containerP1Name.querySelector("label").textContent = nomeLabel;
}

export function prepararTelaSetup(jogador, config) {
  elements.setupTitulo.textContent = `Vez de ${jogador.nome}`;
  elements.setupDescricao.textContent = `Insira as suas ${config.wordCount} palavras secretas:`;
  elements.setupInputs.innerHTML = Array.from(
    { length: config.wordCount },
    (_, i) =>
      `<div class="input-group"><input type="text" class="palavra-input" placeholder="Palavra ${
        i + 1
      }"></div>`
  ).join("");
}

export function prepararTelaTransicao(nomeJogador) {
  elements.transicaoTexto.textContent = `Agora, passe o dispositivo para ${nomeJogador}.`;
}

export function renderizarTabuleiro(gameState, meuPlayerId, gameMode) {
  if (!gameState || !gameState.jogadores) return;
  const { jogadores, placar, turno, palavrasDescobertas, vencedor, dicas } =
    gameState;

  elements.headerP1Name.textContent = jogadores[0].nome;
  elements.headerP1Score.textContent = `(${placar.jogador1})`;
  elements.headerP2Name.textContent = jogadores[1].nome;
  elements.headerP2Score.textContent = `(${placar.jogador2})`;

  elements.headerP1.classList.toggle("active-turn", turno === 1);
  elements.headerP2.classList.toggle("active-turn", turno === 2);
  elements.boardP1.classList.toggle("active", turno === 2);
  elements.boardP2.classList.toggle("active", turno === 1);

  elements.boardTitle1.textContent = `Palavras de ${jogadores[0].nome}`;
  elements.boardTitle2.textContent = `Palavras de ${jogadores[1].nome}`;

  const renderPalavras = (playerIdx, wordsEl) => {
    wordsEl.innerHTML = "";
    const playerKey = `jogador${playerIdx + 1}`;
    jogadores[playerIdx].palavras.forEach((palavra, index) => {
      const li = document.createElement("li");
      if (palavrasDescobertas[playerKey][index]) {
        li.textContent = palavra.toUpperCase();
        li.style.color = "#28a745";
      } else {
        const dicasDaPalavra = new Set(dicas[playerKey][index] || []);
        const letrasReveladas = [];
        if (dicasDaPalavra.size > 0) {
          for (let i = 0; i < palavra.length; i++) {
            if (dicasDaPalavra.has(i)) {
              letrasReveladas.push(palavra[i].toUpperCase());
            }
          }
        }
        li.textContent =
          letrasReveladas.length > 0 ? letrasReveladas.join("") : "?";
      }
      wordsEl.appendChild(li);
    });
  };

  renderPalavras(0, elements.p1Words);
  renderPalavras(1, elements.p2Words);

  let deveBloquearInput = false;

  if (vencedor) {
    deveBloquearInput = true;
  } else if (gameMode === "online") {
    deveBloquearInput = turno !== meuPlayerId;
  }

  elements.guessInput.disabled = deveBloquearInput;
  elements.submitBtn.disabled = deveBloquearInput;

  if (gameMode === "online" && !deveBloquearInput) {
    elements.guessInput.placeholder = "Sua vez de jogar!";
  } else if (gameMode === "online" && deveBloquearInput) {
    elements.guessInput.placeholder = "Aguarde o oponente...";
  } else {
    elements.guessInput.placeholder = "Digite seu palpite...";
  }
  // ===================================================================

  const targetBoard = turno === 1 ? elements.boardP2 : elements.boardP1;
  targetBoard.insertAdjacentElement("afterend", elements.inputArea);
}

export function mostrarTelaVitoria(gameState) {
  const { vencedor, jogadores, placar } = gameState;
  elements.vencedorNome.textContent = `${vencedor.nome} Venceu!`;
  elements.finalP1Name.textContent = jogadores[0].nome;
  elements.finalP1Score.textContent = `(${placar.jogador1})`;
  elements.finalP2Name.textContent = jogadores[1].nome;
  elements.finalP2Score.textContent = `(${placar.jogador2})`;
  mudarTela("vitoria");
}
