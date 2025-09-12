// Importa o 'fs' para manipular arquivos e o 'dotenv' para ler o .env local
const fs = require("fs");
require("dotenv").config({ path: ".env.local" });

// Define o conteúdo do arquivo de configuração que será gerado
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

// Escreve o conteúdo no arquivo js/config.js
// O 'fs.mkdirSync' garante que a pasta 'js' exista antes de criar o arquivo
fs.mkdirSync("js", { recursive: true });
fs.writeFileSync("js/config.js", configContent);
