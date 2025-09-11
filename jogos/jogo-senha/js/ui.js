// Objeto que centraliza todos os elementos do DOM
export const elements = {
  // Elementos principais
  toast: document.getElementById("toast-notification"),
  btnVoltar: document.getElementById("btn-voltar"),
  btnHome: document.getElementById("btn-home"),

  // Telas
  telas: {
    inicial: document.getElementById("tela-inicial"),
    onlineLobby: document.getElementById("tela-online-lobby"),
    criarSala: document.getElementById("tela-criar-sala"),
    espera: document.getElementById("tela-espera"),
    nomes: document.getElementById("tela-nomes"),
    setup: document.getElementById("tela-setup"),
    aguardandoOponente: document.getElementById("tela-aguardando-oponente"),
    transicao: document.getElementById("tela-transicao"),
    jogo: document.getElementById("tela-jogo"),
    vitoria: document.getElementById("tela-vitoria"),
  },

  // Botões
  btnJogarLocal: document.getElementById("btn-jogar-local"),
  btnJogarOnline: document.getElementById("btn-jogar-online"),
  btnIrCriarSala: document.getElementById("btn-ir-criar-sala"),
  btnAtualizarSalas: document.getElementById("btn-atualizar-salas"),
  btnConfirmarCriarSala: document.getElementById("btn-confirmar-criar-sala"),
  btnIniciarSetup: document.getElementById("btn-iniciar-setup"),
  btnConfirmarSenha: document.getElementById("btn-confirmar-senha"),
  btnPassarVez: document.getElementById("btn-passar-vez"),
  submitGuessBtn: document.getElementById("submit-guess-btn"),
  btnNovoJogo: document.getElementById("btn-novo-jogo"),

  // Elementos do Lobby e Criação de Sala
  listaSalas: document.getElementById("lista-salas"),
  nomeSalaInput: document.getElementById("nome-sala-input"),
  senhaSalaInput: document.getElementById("senha-sala-input"),
  nomeCriadorInput: document.getElementById("nome-criador-input"),

  // Elementos de Nomes e Setup
  p1NameInput: document.getElementById("p1-name-input"),
  p2NameInput: document.getElementById("p2-name-input"),
  containerP1Name: document.getElementById("container-p1-name"),
  containerP2Name: document.getElementById("container-p2-name"),
  setupTitulo: document.getElementById("setup-titulo"),
  secretCodeInput: document.getElementById("secret-code-input"),
  setupError: document.getElementById("setup-error"),
  transicaoTexto: document.getElementById("transicao-texto"),

  // Elementos da Tela de Jogo
  headerP1: document.getElementById("header-p1"),
  headerP2: document.getElementById("header-p2"),
  headerP1Name: document.getElementById("header-p1-name"),
  headerP2Name: document.getElementById("header-p2-name"),
  headerP1Score: document.getElementById("header-p1-score"),
  headerP2Score: document.getElementById("header-p2-score"),
  finalP1Name: document.getElementById("final-p1-name"),
  finalP1Score: document.getElementById("final-p1-score"),
  finalP2Name: document.getElementById("final-p2-name"),
  finalP2Score: document.getElementById("final-p2-score"),
  boardP1: document.getElementById("jogador1-board"),
  boardP2: document.getElementById("jogador2-board"),
  boardTitle1: document.getElementById("board-title-1"),
  boardTitle2: document.getElementById("board-title-2"),
  p1History: document.getElementById("jogador1-history"),
  p2History: document.getElementById("jogador2-history"),
  guessInput: document.getElementById("guess-input"),

  // Elementos da Tela de Vitória
  vencedorNome: document.getElementById("vencedor-nome"),
};

let toastTimeout;
export function showToast(message, type) {
  clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.className = `toast-${type} show`;
  toastTimeout = setTimeout(
    () => elements.toast.classList.remove("show"),
    1500
  );
}

export function mudarTela(telaVisivel) {
  Object.values(elements.telas).forEach((tela) => tela.classList.add("hidden"));
  elements.telas[telaVisivel]?.classList.remove("hidden");
  const isVoltarHidden = ["inicial", "vitoria"].includes(telaVisivel);
  elements.btnVoltar.classList.toggle("hidden", isVoltarHidden);
  const isHomeHidden = !["inicial"].includes(telaVisivel);
  elements.btnHome.classList.toggle("hidden", isHomeHidden);
}

export function prepararTelaNomes(modo, nomeLabel) {
  elements.containerP1Name.style.display = "block";
  elements.containerP2Name.style.display = modo === "local" ? "block" : "none";
  elements.containerP1Name.querySelector("label").textContent = nomeLabel;
}

export function prepararTelaSetup(jogador) {
  elements.setupTitulo.textContent = `Vez de ${jogador.name}`;
  elements.secretCodeInput.value = ""; // CORREÇÃO APLICADA AQUI
  elements.setupError.textContent = ""; // E aqui, para limpar erros antigos
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

export function renderizarTabuleiro(gameState, meuPlayerId) {
  if (!gameState || !gameState.players) return;
  const { players, currentTurn, placar } = gameState;
  const [p1, p2] = players;

  elements.headerP1Name.textContent = p1.name;
  elements.headerP2Name.textContent = p2.name;
  elements.headerP1Score.textContent = `(${placar.jogador1})`;
  elements.headerP2Score.textContent = `(${placar.jogador2})`;
  elements.headerP1.classList.toggle("active-turn", currentTurn === 1);
  elements.headerP2.classList.toggle("active-turn", currentTurn === 2);

  if (currentTurn === 1) {
    elements.boardP1.classList.remove("hidden");
    elements.boardP2.classList.add("hidden");
    elements.boardP1.classList.add("active");
    elements.boardP2.classList.remove("active");
  } else {
    elements.boardP2.classList.remove("hidden");
    elements.boardP1.classList.add("hidden");
    elements.boardP2.classList.add("active");
    elements.boardP1.classList.remove("active");
  }

  elements.boardTitle1.textContent = `Tentativas de ${p1.name}`;
  elements.boardTitle2.textContent = `Tentativas de ${p2.name}`;

  elements.p1History.innerHTML = "";
  if (p1.history) {
    p1.history.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = item.feedback;
      elements.p1History.appendChild(li);
    });
  }

  elements.p2History.innerHTML = "";
  if (p2.history) {
    p2.history.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = item.feedback;
      elements.p2History.appendChild(li);
    });
  }

  // Controla o input no modo online
  const isMyTurn = currentTurn === meuPlayerId;
  const isOnline = !!meuPlayerId;
  const isProcessing = gameState.isProcessing || false;

  elements.guessInput.disabled = isProcessing || (isOnline && !isMyTurn);
  elements.submitGuessBtn.disabled = isProcessing || (isOnline && !isMyTurn);
  elements.guessInput.placeholder =
    isOnline && !isMyTurn ? "Aguarde o oponente..." : "Digite seu palpite...";
}
