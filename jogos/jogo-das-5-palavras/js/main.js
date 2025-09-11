import * as Firebase from "./firebase.js";
import * as UI from "./ui.js";
import * as Game from "./game.js";

let gameState = {};
let config = { wordCount: 5 };
let gameMode = "local";
let salaId = null;
let meuPlayerId = null;
let refSalaAtual = null;
let jogadorAtualSetup = 1;
let refEscutaLobby = null;

function playSound(soundFile) {
  const audio = new Audio(`audio/${soundFile}`);
  audio.play().catch((error) => {
    console.warn(`Não foi possível tocar o som "${soundFile}":`, error);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fetch("config.json")
    .then((res) => res.json())
    .then((data) => {
      config = data;
    });
  vincularEventos();
  const params = new URLSearchParams(window.location.search);
  const idSalaURL = params.get("sala");
  if (idSalaURL) handleEntrarViaLink(idSalaURL.trim().toUpperCase());
});

function vincularEventos() {
  document
    .getElementById("btn-jogar-local")
    .addEventListener("click", handleJogarLocal);
  document
    .getElementById("btn-jogar-online")
    .addEventListener("click", handleJogarOnline);
  UI.elements.listaSalas.addEventListener("click", handleCliqueSala);
  document
    .getElementById("btn-ir-criar-sala")
    .addEventListener("click", () => UI.mudarTela("criarSala"));
  document
    .getElementById("btn-atualizar-salas")
    .addEventListener("click", handleJogarOnline);
  document
    .getElementById("btn-confirmar-criar-sala")
    .addEventListener("click", handleConfirmarCriarSala);
  document
    .getElementById("btn-iniciar-setup")
    .addEventListener("click", handleInicioSetup);
  document
    .getElementById("btn-confirmar-palavras")
    .addEventListener("click", handleConfirmarPalavras);
  document
    .getElementById("btn-passar-vez")
    .addEventListener("click", handlePassarVez);
  UI.elements.submitBtn.addEventListener("click", handleGuess);
  UI.elements.guessInput.addEventListener(
    "keyup",
    (e) => e.key === "Enter" && handleGuess()
  );
  document
    .getElementById("btn-revanche-vitoria")
    .addEventListener("click", handleRevanche);
  document
    .getElementById("btn-novo-jogo")
    .addEventListener("click", handleNovoJogo);
  UI.elements.btnVoltar.addEventListener("click", handleVoltarClick);

  document.addEventListener("click", (event) => {
    if (event.target.matches("button")) {
      playSound("button-press.mp3");
    }
  });
  document.addEventListener("input", (event) => {
    if (event.target.matches('input[type="text"], input[type="password"]')) {
      playSound("keypress.mp3");
    }
  });
}

// --- HANDLERS ---

function handleJogarLocal() {
  gameMode = "local";
  UI.prepararTelaNomes("local", "Nome do Jogador 1");
  UI.mudarTela("nomes");
}

function handleJogarOnline() {
  gameMode = "online";
  UI.mudarTela("onlineLobby");
  if (!refEscutaLobby) {
    refEscutaLobby = Firebase.escutarSalasDisponiveis(UI.renderizarLobby);
  }
}

function pararEscutaLobby() {
  if (refEscutaLobby) {
    refEscutaLobby.off(); // O comando .off() para de escutar
    refEscutaLobby = null;
  }
}

function handleCliqueSala(event) {
  const salaLi = event.target.closest("li[data-id]");
  if (!salaLi) return;
  const id = salaLi.dataset.id;
  Firebase.buscarMetadadosSala(id, (metadata) => {
    if (metadata.temSenha) {
      const senha = prompt("Esta sala é protegida. Digite a senha:");
      if (senha === metadata.senha) entrarNaSala(id);
      else if (senha !== null) alert("Senha incorreta!");
    } else {
      entrarNaSala(id);
    }
  });
}

function handleEntrarViaLink(id) {
  Firebase.buscarMetadadosSala(id, (metadata) => {
    if (metadata) entrarNaSala(id);
    else alert("Sala não encontrada!");
  });
}

function entrarNaSala(id) {
  salaId = id;
  meuPlayerId = 2;
  UI.prepararTelaNomes("online", "Seu Nome");
  UI.mudarTela("nomes");
}

function handleConfirmarCriarSala() {
  const nomeSala = UI.elements.nomeSalaInput.value.trim();
  const senha = UI.elements.senhaSalaInput.value;
  const criador = UI.elements.nomeCriadorInput.value.trim();
  if (!nomeSala || !criador)
    return UI.showToast("Preencha todos os campos!", "error");

  salaId = Math.random().toString(36).substring(2, 6).toUpperCase();
  meuPlayerId = 1;
  const dadosSala = {
    metadata: {
      nomeSala,
      senha,
      criador,
      temSenha: senha.length > 0,
      status: "aguardando",
    },
    gameState: {
      jogadores: [
        { id: 1, nome: criador, palavras: [], pronto: false },
        { id: 2, nome: "Aguardando...", palavras: [], pronto: false },
      ],
      placar: { jogador1: 0, jogador2: 0 },
      etapa: "espera",
    },
  };
  Firebase.criarSalaFirebase(salaId, dadosSala, () => {
    UI.mudarTela("espera");
    refSalaAtual = Firebase.iniciarEscutaSala(salaId, onGameStateUpdate);
  });
}

function handleInicioSetup() {
  const p1Name = UI.elements.p1NameInput.value.trim();
  if (gameMode === "local") {
    const p2Name = UI.elements.p2NameInput.value.trim();
    if (!p1Name || !p2Name)
      return UI.showToast("Preencha todos os nomes!", "error");
    gameState = Game.criarEstadoJogoLocal(p1Name, p2Name);
    jogadorAtualSetup = 1;
    UI.prepararTelaSetup(gameState.jogadores[0], config);
    UI.mudarTela("setup");
  } else {
    if (!p1Name) return UI.showToast("Digite seu nome!", "error");
    Firebase.entrarNaSalaFirebase(salaId, p1Name).then(() => {
      refSalaAtual = Firebase.iniciarEscutaSala(salaId, onGameStateUpdate);
    });
  }
}

function handleConfirmarPalavras() {
  const palavras = Array.from(document.querySelectorAll(".palavra-input")).map(
    (input) => Game.normalizeString(input.value.trim())
  );
  if (palavras.some((p) => p === "") || palavras.length < config.wordCount)
    return UI.showToast(`Preencha as ${config.wordCount} palavras!`, "error");
  for (const palavra of palavras) {
    if (/\s/.test(palavra)) {
      // Verifica se a palavra contém espaços
      return UI.showToast(
        `A palavra "${palavra}" não pode conter espaços.`,
        "error"
      );
    }
    if (palavra.length < 3) {
      return UI.showToast(`A palavra "${palavra}" é muito curta.`, "error");
    }
  }

  if (gameMode === "local") {
    gameState.jogadores[jogadorAtualSetup - 1].palavras = palavras;
    if (jogadorAtualSetup === 1) {
      jogadorAtualSetup = 2;
      UI.prepararTelaTransicao(gameState.jogadores[1].nome);
      UI.mudarTela("transicao");
    } else {
      gameState = Game.prepararPartida(gameState, config);
      UI.renderizarTabuleiro(gameState, meuPlayerId, gameMode);
      UI.mudarTela("jogo");
    }
  } else {
    Firebase.confirmarPalavrasFirebase(salaId, meuPlayerId, palavras);
  }
}

function handlePassarVez() {
  UI.prepararTelaSetup(gameState.jogadores[jogadorAtualSetup - 1], config);
  UI.mudarTela("setup");
}

function handleGuess() {
  const palpite = Game.normalizeString(UI.elements.guessInput.value.trim());
  if (!palpite || gameState.vencedor) return;
  UI.elements.guessInput.value = "";

  const { estadoFinal, foiAcerto } = Game.processarPalpite(palpite, gameState);

  playSound(foiAcerto ? "correct.mp3" : "wrong.mp3");
  UI.showToast(
    foiAcerto ? "Acertou!" : "Errado!",
    foiAcerto ? "success" : "error"
  );

  if (gameMode === "local") {
    gameState = estadoFinal;
    UI.renderizarTabuleiro(gameState);
    if (gameState.vencedor) {
      playSound("win.mp3");
      UI.mostrarTelaVitoria(gameState);
    }
  } else {
    Firebase.atualizarEstadoJogoFirebase(salaId, estadoFinal);
  }
}

function handleRevanche() {
  if (gameMode === "local") {
    // Mantém os nomes e o placar, reseta o resto
    const placarAtual = gameState.placar;
    const nomesJogadores = {
      p1: gameState.jogadores[0].nome,
      p2: gameState.jogadores[1].nome,
    };
    gameState = Game.criarEstadoJogoLocal(nomesJogadores.p1, nomesJogadores.p2);
    gameState.placar = placarAtual;

    jogadorAtualSetup = 1;
    UI.prepararTelaSetup(gameState.jogadores[0], config);
    UI.mudarTela("setup");
  } else {
    if (meuPlayerId !== 1) {
      return UI.showToast(
        "Apenas o criador da sala pode iniciar uma revanche.",
        "error"
      );
    }

    const novoEstadoRevanche = JSON.parse(JSON.stringify(gameState));

    // 2. Modificamos as propriedades da cópia da maneira correta
    novoEstadoRevanche.etapa = "setup";
    novoEstadoRevanche.vencedor = null;
    novoEstadoRevanche.dicas = null;
    novoEstadoRevanche.palavrasDescobertas = null;

    // Limpa os dados dos jogadores no array
    novoEstadoRevanche.jogadores[0].palavras = [];
    novoEstadoRevanche.jogadores[0].pronto = false;
    novoEstadoRevanche.jogadores[1].palavras = [];
    novoEstadoRevanche.jogadores[1].pronto = false;

    // 3. Enviamos o objeto agora válido para o Firebase
    Firebase.atualizarEstadoJogoFirebase(salaId, novoEstadoRevanche);
  }
}

function handleNovoJogo() {
  if (gameMode === "online" && salaId && meuPlayerId === 1)
    Firebase.removerSalaFirebase(salaId);
  pararEscutaLobby();
  if (refSalaAtual) refSalaAtual.off();
  gameState = {};
  salaId = null;
  meuPlayerId = null;
  refSalaAtual = null;
  window.history.replaceState({}, document.title, window.location.pathname);
  UI.mudarTela("inicial");
}

function onGameStateUpdate(novoEstado) {
  if (!novoEstado) {
    UI.showToast("A sala foi fechada pelo host.", "error");
    return handleNovoJogo();
  }

  const vitoriaRecente = novoEstado.vencedor && !gameState.vencedor;

  gameState = novoEstado;
  switch (gameState.etapa) {
    case "setup":
      const eu = gameState.jogadores[meuPlayerId - 1];
      const oponente = gameState.jogadores[meuPlayerId % 2];
      if (eu.pronto) {
        UI.mudarTela("aguardandoPalavras");
      } else {
        const setupScreenIsHidden =
          UI.elements.telas.setup.classList.contains("hidden");
        if (setupScreenIsHidden) {
          UI.prepararTelaSetup(eu, config);
          UI.mudarTela("setup");
        }
      }
      // Se ambos estiverem prontos, o Jogador 1 inicia o jogo
      if (eu.pronto && oponente.pronto && meuPlayerId === 1) {
        const estadoInicializado = Game.prepararPartida(gameState, config);
        Firebase.atualizarEstadoJogoFirebase(salaId, estadoInicializado);
      }
      break;
    case "jogo":
      UI.renderizarTabuleiro(gameState, meuPlayerId, gameMode);
      UI.mudarTela("jogo");
      break;
    case "vitoria":
      if (vitoriaRecente) {
        playSound("win.mp3");
      }
      UI.renderizarTabuleiro(gameState, meuPlayerId, gameMode);
      UI.mostrarTelaVitoria(gameState);
      break;
  }
}

function handleVoltarClick() {
  const telaVisivelKey = Object.keys(UI.elements.telas).find(
    (key) => !UI.elements.telas[key].classList.contains("hidden")
  );

  switch (telaVisivelKey) {
    case "onlineLobby":
      pararEscutaLobby();
      UI.mudarTela("inicial");
      break;
    case "criarSala":
    case "nomes":
      UI.mudarTela("inicial");
      break;

    case "setup":
    case "transicao":
      jogadorAtualSetup = 1;
      UI.mudarTela("nomes");
      break;

    case "espera":
    case "aguardandoPalavras":
    case "jogo":
      if (
        confirm(
          "Tem certeza que deseja abandonar a partida? Todo o progresso será perdido."
        )
      ) {
        handleNovoJogo();
      }
      break;

    default:
      UI.mudarTela("inicial");
  }
}
