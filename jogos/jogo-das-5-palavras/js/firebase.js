firebase.initializeApp(firebaseConfig);
const database = firebase.database();

export function escutarSalasDisponiveis(callback) {
  const refSalas = database.ref("salas");
  refSalas.on("value", (snapshot) => {
    callback(snapshot.val());
  });
  return refSalas; // Retorna a referência
}

export function buscarMetadadosSala(salaId, callback) {
  database
    .ref(`salas/${salaId}/metadata`)
    .once("value", (snapshot) => callback(snapshot.val()));
}

export function criarSalaFirebase(salaId, dadosSala, callback) {
  database.ref(`salas/${salaId}`).set(dadosSala).then(callback);
}

export function entrarNaSalaFirebase(salaId, nomeJogador2) {
  const updates = {
    [`/salas/${salaId}/gameState/jogadores/1/nome`]: nomeJogador2,
    [`/salas/${salaId}/gameState/etapa`]: "setup",
    [`/salas/${salaId}/metadata/status`]: "jogando",
  };
  return database.ref().update(updates);
}

export function confirmarPalavrasFirebase(salaId, meuPlayerId, palavras) {
  const updates = {
    [`/salas/${salaId}/gameState/jogadores/${meuPlayerId - 1}/palavras`]:
      palavras,
    [`/salas/${salaId}/gameState/jogadores/${meuPlayerId - 1}/pronto`]: true,
  };
  return database.ref().update(updates);
}

export function atualizarEstadoJogoFirebase(salaId, novoEstado) {
  return database.ref(`salas/${salaId}/gameState`).set(novoEstado);
}

export function iniciarEscutaSala(salaId, callback) {
  const refSala = database.ref(`salas/${salaId}`);
  refSala.on("value", (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val().gameState);
    } else {
      callback(null); // Sala removida
    }
  });
  return refSala;
}

export function removerSalaFirebase(salaId) {
  return database.ref(`salas/${salaId}`).remove();
}
