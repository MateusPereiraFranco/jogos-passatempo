import * as Firebase from "./firebase.js";
import * as UI from "./ui.js";

let gameState = {};
let gameMode = "local";
let salaId = null;
let meuPlayerId = null;
let refSalaAtual = null;
let refEscutaLobby = null;

function playSound(soundFile) {
  const audio = new Audio(`audio/${soundFile}`);
  audio.play().catch((e) => console.warn(`Não foi possível tocar o som: ${e}`));
}

function validarSenha(senha) {
  if (senha.length !== 4 || !/^\d{4}$/.test(senha)) {
    return "A senha deve conter 4 dígitos numéricos.";
  }
  return null;
}

function gerarFeedback(palpite, senhaSecreta) {
  let spans = "";
  let acertos = 0;
  for (let i = 0; i < 4; i++) {
    if (palpite[i] === senhaSecreta[i]) {
      spans += `<span class="correct-digit">${palpite[i]}</span>`;
      acertos++;
    } else {
      spans += `<span class="wrong-digit">${palpite[i]}</span>`;
    }
  }
  return {
    feedbackHTML: `<div class="feedback-digits">${spans}</div>`,
    acertos,
  };
}

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
      temSenha: !!senha,
      status: "aguardando",
    },
    gameState: {
      players: [
        { id: 1, name: criador, secretCode: null, history: [], pronto: false },
        {
          id: 2,
          name: "Aguardando...",
          secretCode: null,
          history: [],
          pronto: false,
        },
      ],
      placar: { jogador1: 0, jogador2: 0 },
      currentTurn: 1,
      etapa: "espera",
    },
  };

  Firebase.criarSalaFirebase(salaId, dadosSala, () => {
    UI.mudarTela("espera");
    refSalaAtual = Firebase.iniciarEscutaSala(salaId, onGameStateUpdate);
  });
}

function handleEntrarEmSala(id) {
  salaId = id;
  meuPlayerId = 2;
  UI.prepararTelaNomes("online", "Seu Nome");
  UI.mudarTela("nomes");
}

function handleCliqueSala(event) {
  const salaLi = event.target.closest("li[data-id]");
  if (!salaLi) return;
  const id = salaLi.dataset.id;
  Firebase.buscarMetadadosSala(id, (metadata) => {
    if (metadata.temSenha) {
      const senha = prompt("Esta sala é protegida. Digite a senha:");
      if (senha === metadata.senha) handleEntrarEmSala(id);
      else if (senha !== null) alert("Senha incorreta!");
    } else {
      handleEntrarEmSala(id);
    }
  });
}

function iniciarJogo() {
  const p1Name = UI.elements.p1NameInput.value.trim() || "Jogador 1";

  if (gameMode === "local") {
    const p2Name = UI.elements.p2NameInput.value.trim() || "Jogador 2";
    gameState = {
      players: [
        { id: 1, name: p1Name, secretCode: null, history: [] },
        { id: 2, name: p2Name, secretCode: null, history: [] },
      ],
      placar: { jogador1: 0, jogador2: 0 }, // ADICIONE ESTA LINHA
      currentTurn: 1,
      setupStep: 1,
    };
    UI.prepararTelaSetup(gameState.players[0]);
    UI.mudarTela("setup");
  } else {
    if (!p1Name) return UI.showToast("Digite seu nome!", "error");
    Firebase.entrarNaSalaFirebase(salaId, p1Name).then(() => {
      refSalaAtual = Firebase.iniciarEscutaSala(salaId, onGameStateUpdate);
    });
  }
}

function handleConfirmarSenha() {
  const senha = UI.elements.secretCodeInput.value;
  const erro = validarSenha(senha);
  if (erro) {
    UI.elements.setupError.textContent = erro;
    return;
  }
  UI.elements.secretCodeInput.value = "";
  UI.elements.setupError.textContent = "";

  if (gameMode === "local") {
    gameState.players[gameState.setupStep - 1].secretCode = senha;
    if (gameState.setupStep === 1) {
      gameState.setupStep = 2;
      const nextPlayer = gameState.players[1];
      UI.elements.transicaoTexto.textContent = `Senha confirmada! Passe para ${nextPlayer.name}.`;
      UI.mudarTela("transicao");
    } else {
      UI.mudarTela("jogo");
      UI.renderizarTabuleiro(gameState, null);
    }
  } else {
    Firebase.confirmarSenhaFirebase(salaId, meuPlayerId, senha);
  }
}

function passarVezSetup() {
  const nextPlayer = gameState.players[1];
  UI.prepararTelaSetup(nextPlayer);
  UI.mudarTela("setup");
}

function handleGuess() {
  if (gameState.vencedor || gameState.isProcessing) return;

  const palpite = UI.elements.guessInput.value;
  const erro = validarSenha(palpite);
  if (erro) {
    alert(erro);
    return;
  }

  if (gameMode === "local") {
    gameState.isProcessing = true;
    const atacante = gameState.players[gameState.currentTurn - 1];
    const defensor = gameState.players[gameState.currentTurn === 1 ? 1 : 0];
    const { feedbackHTML, acertos } = gerarFeedback(
      palpite,
      defensor.secretCode
    );

    atacante.history.push({ palpite, feedback: feedbackHTML });

    const novoEstado = JSON.parse(JSON.stringify(gameState));
    if (palpite === defensor.secretCode) {
      novoEstado.vencedor = atacante;
      novoEstado.placar[atacante.id === 1 ? "jogador1" : "jogador2"] += 1;
    } else {
      novoEstado.currentTurn = novoEstado.currentTurn === 1 ? 2 : 1;
    }

    UI.renderizarTabuleiro(gameState, null);
    UI.elements.guessInput.value = "";

    if (acertos > 0) {
      playSound("correct.mp3");
      UI.showToast(
        acertos === 4 ? "SENHA CORRETA!" : `Acertou ${acertos}!`,
        "success"
      );
    } else {
      playSound("wrong.mp3");
      UI.showToast("Errou tudo!", "error");
    }

    setTimeout(() => {
      gameState = novoEstado;
      gameState.isProcessing = false;
      if (gameState.vencedor) {
        playSound("win.mp3");

        const { vencedor, players, placar } = gameState;
        UI.elements.vencedorNome.textContent = `${vencedor.name} Venceu!`;
        UI.elements.finalP1Name.textContent = players[0].name;
        UI.elements.finalP1Score.textContent = `(${placar.jogador1})`;
        UI.elements.finalP2Name.textContent = players[1].name;
        UI.elements.finalP2Score.textContent = `(${placar.jogador2})`;

        UI.mudarTela("vitoria");
      } else {
        UI.renderizarTabuleiro(gameState, null);
        UI.elements.guessInput.focus();
      }
    }, 1500);
  } else {
    // Modo Online
    UI.elements.submitGuessBtn.disabled = true;

    const atacante = gameState.players[meuPlayerId - 1];
    const defensor = gameState.players[meuPlayerId === 1 ? 1 : 0];
    const { feedbackHTML } = gerarFeedback(palpite, defensor.secretCode);

    const novoEstado = JSON.parse(JSON.stringify(gameState));

    if (!novoEstado.players[meuPlayerId - 1].history) {
      novoEstado.players[meuPlayerId - 1].history = [];
    }
    novoEstado.players[meuPlayerId - 1].history.push({
      palpite,
      feedback: feedbackHTML,
    });

    Firebase.atualizarEstadoJogoFirebase(salaId, novoEstado);
  }
}

function handleRevanche() {
  if (gameMode === "local") {
    // Modo Local: Reseta o estado do jogo mantendo os nomes dos jogadores
    const p1Name = gameState.players[0].name;
    const p2Name = gameState.players[1].name;
    const placarAtual = gameState.placar;

    // Cria um novo estado de jogo limpo
    gameState = {
      players: [
        { id: 1, name: p1Name, secretCode: null, history: [] },
        { id: 2, name: p2Name, secretCode: null, history: [] },
      ],
      placar: placarAtual,
      currentTurn: 1,
      setupStep: 1, // Reinicia o passo de configuração
    };

    // Leva o jogo de volta para a tela de setup do primeiro jogador
    UI.prepararTelaSetup(gameState.players[0]);
    UI.mudarTela("setup");
  } else {
    // Modo Online: Apenas o criador da sala pode iniciar a revanche
    if (meuPlayerId !== 1) {
      return UI.showToast(
        "Apenas o criador da sala pode iniciar uma revanche.",
        "error"
      );
    }

    // Cria uma cópia profunda do estado atual para modificar
    const novoEstadoRevanche = JSON.parse(JSON.stringify(gameState));

    // Reseta as propriedades do jogo para uma nova partida
    novoEstadoRevanche.etapa = "setup";
    novoEstadoRevanche.vencedor = null;
    novoEstadoRevanche.currentTurn = 1;

    // Limpa os dados de cada jogador (senha, histórico e status de pronto)
    novoEstadoRevanche.players[0].secretCode = null;
    novoEstadoRevanche.players[0].history = [];
    novoEstadoRevanche.players[0].pronto = false;

    novoEstadoRevanche.players[1].secretCode = null;
    novoEstadoRevanche.players[1].history = [];
    novoEstadoRevanche.players[1].pronto = false;

    // Envia o estado de jogo resetado para o Firebase
    Firebase.atualizarEstadoJogoFirebase(salaId, novoEstadoRevanche);
  }
}

function novoJogo() {
  if (gameMode === "online" && salaId && meuPlayerId === 1) {
    Firebase.removerSalaFirebase(salaId);
  }
  if (refSalaAtual) refSalaAtual.off();
  if (refEscutaLobby) {
    refEscutaLobby.off();
    refEscutaLobby = null;
  }
  gameState = {};
  gameMode = "local";
  salaId = null;
  meuPlayerId = null;
  refSalaAtual = null;
  UI.mudarTela("inicial");
}

function onGameStateUpdate(novoEstado) {
  if (!novoEstado) {
    UI.showToast("A sala foi fechada pelo host.", "error");
    return novoJogo();
  }

  const oldGameState = gameState;
  gameState = novoEstado;

  const vitoriaRecente = gameState.vencedor && !oldGameState.vencedor;

  switch (gameState.etapa) {
    case "espera":
      break;
    case "setup":
      const eu = gameState.players[meuPlayerId - 1];
      if (eu.pronto) {
        UI.mudarTela("aguardandoOponente");
      } else if (UI.elements.telas.setup.classList.contains("hidden")) {
        UI.prepararTelaSetup(eu);
        UI.mudarTela("setup");
      }
      if (gameState.players[0].pronto && gameState.players[1].pronto) {
        const estadoJogo = { ...gameState, etapa: "jogo" };
        if (meuPlayerId === 1)
          Firebase.atualizarEstadoJogoFirebase(salaId, estadoJogo);
      }
      break;
    case "jogo":
      const atacanteIndex = oldGameState.currentTurn - 1;
      const defensorIndex = oldGameState.currentTurn === 1 ? 1 : 0;

      const oldHistory = oldGameState.players?.[atacanteIndex]?.history ?? [];
      const newHistory = gameState.players?.[atacanteIndex]?.history ?? [];
      const palpiteRecente = newHistory.length > oldHistory.length;

      if (palpiteRecente && !vitoriaRecente) {
        gameState.isProcessing = true;
        UI.renderizarTabuleiro(gameState, meuPlayerId);
        UI.elements.guessInput.value = "";

        const ultimoPalpiteObj = newHistory.slice(-1)[0];
        const { acertos } = gerarFeedback(
          ultimoPalpiteObj.palpite,
          gameState.players[defensorIndex].secretCode
        );

        playSound(acertos > 0 ? "correct.mp3" : "wrong.mp3");
        UI.showToast(
          acertos === 4 ? "SENHA CORRETA!" : `Acertou ${acertos}!`,
          acertos > 0 ? "success" : "error"
        );

        setTimeout(() => {
          const estadoFinal = JSON.parse(JSON.stringify(gameState));
          if (
            ultimoPalpiteObj.palpite ===
            gameState.players[defensorIndex].secretCode
          ) {
            estadoFinal.vencedor = estadoFinal.players[atacanteIndex];
            estadoFinal.placar[
              atacanteIndex === 0 ? "jogador1" : "jogador2"
            ] += 1;
          } else {
            estadoFinal.currentTurn = estadoFinal.currentTurn === 1 ? 2 : 1;
          }
          estadoFinal.isProcessing = false;

          if (
            meuPlayerId === oldGameState.currentTurn ||
            estadoFinal.vencedor
          ) {
            Firebase.atualizarEstadoJogoFirebase(salaId, estadoFinal);
          }
        }, 1500);
      } else if (!gameState.vencedor) {
        // Nenhum palpite novo, apenas renderiza o estado atual
        UI.renderizarTabuleiro(gameState, meuPlayerId);
        UI.mudarTela("jogo");
      }

      if (vitoriaRecente) {
        playSound("win.mp3");
        const { vencedor, players, placar } = gameState;
        UI.elements.vencedorNome.textContent = `${vencedor.name} Venceu!`;
        UI.elements.finalP1Name.textContent = players[0].name;
        UI.elements.finalP1Score.textContent = `(${placar.jogador1})`;
        UI.elements.finalP2Name.textContent = players[1].name;
        UI.elements.finalP2Score.textContent = `(${placar.jogador2})`;
        UI.mudarTela("vitoria");
      }
      break;
  }
}

function vincularEventos() {
  UI.elements.btnJogarLocal.addEventListener("click", handleJogarLocal);
  UI.elements.btnJogarOnline.addEventListener("click", handleJogarOnline);
  UI.elements.listaSalas.addEventListener("click", handleCliqueSala);
  UI.elements.btnIrCriarSala.addEventListener("click", () =>
    UI.mudarTela("criarSala")
  );
  UI.elements.btnAtualizarSalas.addEventListener("click", handleJogarOnline);
  UI.elements.btnConfirmarCriarSala.addEventListener(
    "click",
    handleConfirmarCriarSala
  );
  UI.elements.btnIniciarSetup.addEventListener("click", iniciarJogo);
  UI.elements.btnConfirmarSenha.addEventListener("click", handleConfirmarSenha);
  UI.elements.btnPassarVez.addEventListener("click", passarVezSetup);
  UI.elements.submitGuessBtn.addEventListener("click", handleGuess);
  UI.elements.guessInput.addEventListener(
    "keyup",
    (e) => e.key === "Enter" && handleGuess()
  );
  document
    .getElementById("btn-revanche")
    .addEventListener("click", handleRevanche);
  UI.elements.btnNovoJogo.addEventListener("click", novoJogo);
  UI.elements.btnVoltar.addEventListener("click", novoJogo);

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

document.addEventListener("DOMContentLoaded", () => {
  vincularEventos();
  UI.mudarTela("inicial");
});
