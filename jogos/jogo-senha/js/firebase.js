// O caminho no banco de dados para as salas deste jogo
const SALAS_PATH = "salas-senha";

// Inicializa o Firebase (ele pega o 'firebaseConfig' do config.js)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

export function escutarSalasDisponiveis(callback) {
  const refSalas = database.ref(SALAS_PATH);
  refSalas.on("value", (snapshot) => {
    callback(snapshot.val());
  });
  return refSalas;
}

export function buscarMetadadosSala(salaId, callback) {
  database
    .ref(`${SALAS_PATH}/${salaId}/metadata`)
    .once("value", (snapshot) => callback(snapshot.val()));
}

export function criarSalaFirebase(salaId, dadosSala, callback) {
  database.ref(`${SALAS_PATH}/${salaId}`).set(dadosSala).then(callback);
}

export function entrarNaSalaFirebase(salaId, nomeJogador2) {
  const updates = {
    [`/${SALAS_PATH}/${salaId}/gameState/players/1/name`]: nomeJogador2,
    [`/${SALAS_PATH}/${salaId}/gameState/etapa`]: "setup",
    [`/${SALAS_PATH}/${salaId}/metadata/status`]: "jogando",
  };
  return database.ref().update(updates);
}

// Função adaptada para confirmar a senha
export function confirmarSenhaFirebase(salaId, meuPlayerId, senha) {
  const updates = {
    [`/${SALAS_PATH}/${salaId}/gameState/players/${
      meuPlayerId - 1
    }/secretCode`]: senha,
    [`/${SALAS_PATH}/${salaId}/gameState/players/${
      meuPlayerId - 1
    }/pronto`]: true,
  };
  return database.ref().update(updates);
}

export function atualizarEstadoJogoFirebase(salaId, novoEstado) {
  return database.ref(`${SALAS_PATH}/${salaId}/gameState`).set(novoEstado);
}

export function iniciarEscutaSala(salaId, callback) {
  const refSala = database.ref(`${SALAS_PATH}/${salaId}`);
  refSala.on("value", (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val().gameState);
    } else {
      callback(null); // Sala foi removida
    }
  });
  return refSala;
}

export function removerSalaFirebase(salaId) {
  return database.ref(`${SALAS_PATH}/${salaId}`).remove();
}
