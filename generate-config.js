// Importa o 'fs' para manipular arquivos e o 'dotenv' para ler o .env local
const fs = require("fs");
require("dotenv").config({ path: ".env.local" });

const configContent = `
const firebaseConfig = {
  apiKey: "${process.env.VITE_API_KEY}",
  authDomain: "${process.env.VITE_AUTH_DOMAIN}",
  databaseURL: "${process.env.VITE_DATABASE_URL}",
  projectId: "${process.env.VITE_PROJECT_ID}",
  storageBucket: "${process.env.VITE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.VITE_MESSAGING_SENDER_ID}",
  appId: "${process.env.VITE_APP_ID}",
};
`;

const targetFolders = [
  "./jogos/jogo-das-5-palavras/js",
  "./jogos/jogo-senha/js",
];

targetFolders.forEach((folder) => {
  fs.mkdirSync(folder, { recursive: true });

  fs.writeFileSync(`${folder}/config.js`, configContent);

  console.log(`✅ Arquivo de configuração gerado em ${folder}/config.js`);
});

console.log("\nProcesso de geração de configurações concluído com sucesso!");
