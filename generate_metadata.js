// Importação dos módulos necessários
const fs = require('fs'); // Módulo para manipulação de arquivos
const path = require('path'); // Módulo para manipulação de caminhos de arquivos

// Configurações do projeto
const config = {
  outputFile: 'files_metadata.json', // Nome do arquivo de saída JSON
  excludedFiles: [ // Lista de arquivos que devem ser ignorados
    'index.html',
    'style.css',
    'script.js',
    '.gitlab-ci.yaml',
    'files_metadata.json',
    'generate_metadata.js',
    'package.json',
    'package-lock.json',
    '.gitlab-ci.yml',
    '.gitignore',
    'Gemfile',
    '_config.yml',
    'README.md',
    'playlists.py',
    'playlists.m3u.py',
    'requirements.txt',
    'playlists.log',
    'Gemfile.lock'
  ],
  githubUser: 'josieljefferson12', // Nome de usuário do GitHub
  githubRepo: 'playlists.github.io', // Nome do repositório
  branch: process.env.CI_COMMIT_REF_NAME || 'main' // Branch atual (usa variável de ambiente ou 'main' como padrão)
};

// Cache para armazenar tamanhos de arquivo já formatados (melhora performance)
const sizeCache = new Map();

/**
 * Formata o tamanho do arquivo de forma legível para humanos
 * @param {number} bytes - Tamanho do arquivo em bytes
 * @returns {string} Tamanho formatado (ex: "4.20 MB")
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  // Verifica se o tamanho já está em cache
  if (sizeCache.has(bytes)) {
    return sizeCache.get(bytes);
  }

  // Unidades de medida
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  // Calcula a unidade apropriada
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  // Formata o tamanho com 2 casas decimais
  const formattedSize = parseFloat((bytes / Math.pow(1024, unitIndex)).toFixed(2)) + ' ' + units[unitIndex];

  // Armazena no cache para futuras consultas
  sizeCache.set(bytes, formattedSize);
  return formattedSize;
}

/**
 * Formata a data no padrão brasileiro com fuso horário de Fortaleza (UTC-3)
 * @param {Date} date - Objeto de data JavaScript
 * @returns {string} Data formatada (ex: "21/07/2023 - 15:30:45.123 (UTC-3)")
 */
function formatDate(date) {
  // Função auxiliar para preencher com zeros à esquerda
  const pad = (num, digits = 2) => num.toString().padStart(digits, '0');
  
  // Ajusta para o fuso horário de Fortaleza (UTC-3)
  const timezoneOffset = -3 * 60; // -3 horas em minutos
  const adjustedDate = new Date(date.getTime() + (timezoneOffset * 60 * 1000));
  
  // Retorna a data formatada no padrão brasileiro
  return [
    `${pad(adjustedDate.getDate())}/${pad(adjustedDate.getMonth() + 1)}/${adjustedDate.getFullYear()}`, // Data
    `${pad(adjustedDate.getHours())}:${pad(adjustedDate.getMinutes())}:${pad(adjustedDate.getSeconds())}.${pad(adjustedDate.getMilliseconds(), 3)}`, // Hora
    '(UTC-3)' // Fuso horário
  ].join(' - ');
}

// Mapeamento de extensões de arquivo para tipos MIME
const MIME_TYPES = {
  txt: 'text/plain',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  m3u: 'audio/x-mpegurl',
  m3u8: 'application/x-mpegURL'
  // Pode adicionar outros tipos conforme necessário
};

/**
 * Obtém o tipo MIME baseado na extensão do arquivo
 * @param {string} extension - Extensão do arquivo (sem o ponto)
 * @returns {string} Tipo MIME correspondente
 */
function getMimeType(extension) {
  // Retorna o tipo MIME correspondente ou um tipo genérico se não encontrado
  return MIME_TYPES[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Função para listar arquivos localmente (usada para todos os arquivos EXCETO o arquivo de saída)
 * @returns {Array} Array de objetos com metadados dos arquivos
 */
function getLocalFiles() {
  // Lê todos os arquivos e diretórios no diretório atual
  const allFiles = fs.readdirSync('.', { withFileTypes: true });

  // Filtra e mapeia os arquivos
  return allFiles
    // Filtra apenas arquivos (ignora diretórios)
    .filter(dirent => dirent.isFile())
    // Obtém apenas os nomes dos arquivos
    .map(dirent => dirent.name)
    // Remove arquivos que estão na lista de exclusão
    .filter(file => !config.excludedFiles.includes(file))
    // Mapeia cada arquivo para um objeto com suas informações
    .map(file => ({
      name: file, // Nome do arquivo
      path: file, // Caminho do arquivo (relativo)
      size: fs.statSync(file).size, // Tamanho em bytes
      lastModified: fs.statSync(file).mtime.toISOString(), // Data de modificação em ISO
      download_url: `https://raw.githubusercontent.com/ ${config.githubUser}/${config.githubRepo}/${config.branch}/${file}`, // URL para download
      file_type: path.extname(file).toLowerCase().replace('.', '') || 'file' // Tipo de arquivo (extensão)
    }));
}

/**
 * Obtém metadados detalhados dos arquivos locais (incluindo formatação para exibição)
 * @returns {Array} Array de objetos com metadados completos dos arquivos
 */
function getLocalFilesMetadata() {
  try {
    // Lê o diretório atual e processa os arquivos
    return fs.readdirSync('.', { withFileTypes: true })
      // Filtra apenas arquivos regulares
      .filter(dirent => dirent.isFile())
      // Obtém os nomes dos arquivos
      .map(dirent => dirent.name)
      // Filtra arquivos excluídos
      .filter(file => !config.excludedFiles.includes(file))
      // Mapeia cada arquivo para um objeto de metadados
      .map(file => {
        const stats = fs.statSync(file); // Obtém estatísticas do arquivo
        const extension = path.extname(file).toLowerCase().slice(1) || 'file'; // Obtém a extensão
        
        // Retorna objeto com todos os metadados
        return {
          name: file, // Nome do arquivo
          path: file, // Caminho relativo
          size: formatFileSize(stats.size), // Tamanho formatado
          sizeInBytes: stats.size, // Tamanho em bytes (para ordenação)
          lastModified: formatDate(stats.mtime), // Data formatada
          lastModifiedTimestamp: stats.mtime.getTime(), // Timestamp (para ordenação)
          downloadUrl: `https://raw.githubusercontent.com/ ${config.githubUser}/${config.githubRepo}/${config.branch}/${file}`, // URL de download
          fileType: extension, // Tipo de arquivo (extensão)
          mimeType: getMimeType(extension) // Tipo MIME
        };
      })
      // Ordena os arquivos alfabeticamente pelo nome
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    // Em caso de erro, loga e retorna array vazio
    console.error('Erro ao ler arquivos locais:', error);
    return [];
  }
}

/**
 * Função principal que gera o arquivo de metadados
 */
function generateMetadata() {
  try {
    console.log('⏳ Iniciando geração de metadados...');

    // Obtém os metadados dos arquivos
    const filesMetadata = getLocalFilesMetadata();

    // Escreve o arquivo JSON com os metadados
    fs.writeFileSync(
      path.join(__dirname, config.outputFile),
      JSON.stringify(filesMetadata, null, 2) // Formata com 2 espaços de indentação
    );

    // Mensagens de sucesso
    console.log(`✅ Metadados gerados com sucesso em ${config.outputFile}`);
    console.log(`📊 Total de arquivos processados: ${filesMetadata.length}`);

    // Lista os arquivos incluídos (para debug)
    console.log('📝 Arquivos incluídos:');
    filesMetadata.forEach(file => {
      console.log(`- ${file.name} (${file.fileType})`);
    });

  } catch (error) {
    // Em caso de erro, exibe mensagem e encerra com código de erro
    console.error('❌ Erro ao gerar metadados:', error);
    process.exit(1);
  }
}

// Executa a função principal
generateMetadata();
