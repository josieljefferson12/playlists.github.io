const fs = require('fs');
const path = require('path');

// Configurações do projeto
const config = {
  outputFile: 'files_metadata.json',
  excludedFiles: new Set([
    'index.html', 'style.css', 'script.js', '.gitlab-ci.yaml',
    'files_metadata.json', 'generate_metadata.js', 'package.json',
    'package-lock.json', '.gitlab-ci.yml', '.gitignore', 'Gemfile',
    '_config.yml', 'README.md', 'playlists.py', 'playlists.m3u.py',
    'playlists.py', 'requirements.txt', 'playlists.log', 'Gemfile.lock'
  ]),
  githubUser: 'josieljefferson12',
  githubRepo: 'playlists.github.io',
  branch: process.env.CI_COMMIT_REF_NAME || 'main'
};

// Cache para tamanhos formatados
const sizeCache = new Map();

/**
 * Formata tamanho de arquivo de forma legível
 * @param {number} bytes - Tamanho em bytes
 * @returns {string} Tamanho formatado (ex: "4.20 MB")
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  if (sizeCache.has(bytes)) {
    return sizeCache.get(bytes);
  }

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const formattedSize = parseFloat((bytes / Math.pow(1024, unitIndex)).toFixed(2)) + ' ' + units[unitIndex];

  sizeCache.set(bytes, formattedSize);
  return formattedSize;
}

/**
 * Formata data no formato brasileiro com milissegundos e fuso horário de Fortaleza
 * @param {Date} date - Objeto Date
 * @returns {string} Data formatada (ex: "21/07/2025 - 15:30:45.123 (UTC-3)")
 */
function formatDate(date) {
  const pad = (num, digits = 2) => num.toString().padStart(digits, '0');
  
  // Ajusta para o fuso horário de Fortaleza (UTC-3)
  const timezoneOffset = -3 * 60; // Fortaleza é UTC-3
  const adjustedDate = new Date(date.getTime() + (timezoneOffset * 60 * 1000));
  
  return [
    `${pad(adjustedDate.getDate())}/${pad(adjustedDate.getMonth() + 1)}/${adjustedDate.getFullYear()}`,
    `${pad(adjustedDate.getHours())}:${pad(adjustedDate.getMinutes())}:${pad(adjustedDate.getSeconds())}.${pad(adjustedDate.getMilliseconds(), 3)}`,
    '(UTC-3)'
  ].join(' - ');
}

/**
 * Obtém metadados dos arquivos locais
 * @returns {Array<Object>} Array de objetos com metadados dos arquivos
 */
function getLocalFilesMetadata() {
  try {
    return fs.readdirSync('.', { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name)
      .filter(file => !config.excludedFiles.has(file))
      .map(file => {
        const stats = fs.statSync(file);
        const extension = path.extname(file).toLowerCase().slice(1) || 'file';
        
        return {
          name: file,
          path: file,
          size: formatFileSize(stats.size),
          sizeInBytes: stats.size, // Mantém o valor original para ordenação
          lastModified: formatDate(stats.mtime),
          lastModifiedTimestamp: stats.mtime.getTime(), // Para ordenação
          downloadUrl: `https://raw.githubusercontent.com/${config.githubUser}/${config.githubRepo}/${config.branch}/${file}`,
          fileType: extension,
          mimeType: getMimeType(extension)
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)); // Ordena alfabeticamente
  } catch (error) {
    console.error('Error reading local files:', error);
    return [];
  }
}

// Mapeamento simples de extensões para MIME types
const MIME_TYPES = {
  txt: 'text/plain',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  // Adicione outros conforme necessário
};

/**
 * Obtém o MIME type baseado na extensão do arquivo
 * @param {string} extension - Extensão do arquivo (sem ponto)
 * @returns {string} MIME type correspondente
 */
function getMimeType(extension) {
  return MIME_TYPES[extension] || 'application/octet-stream';
}

/**
 * Gera e salva os metadados dos arquivos
 */
async function generateMetadata() {
  console.log('⏳ Iniciando geração de metadados...');
  const startTime = process.hrtime();

  try {
    const filesMetadata = getLocalFilesMetadata();
    const outputPath = path.join(__dirname, config.outputFile);

    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(filesMetadata, null, 2),
      'utf8'
    );

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const elapsedTime = (seconds + nanoseconds / 1e9).toFixed(2);

    console.log(`✅ Metadados gerados com sucesso em ${config.outputFile}`);
    console.log(`📊 Total de arquivos processados: ${filesMetadata.length}`);
    console.log(`⏱️ Tempo de execução: ${elapsedTime}s`);

    if (filesMetadata.length > 0) {
      console.log('📝 Arquivos incluídos:');
      filesMetadata.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} (${file.fileType}, ${file.size})`);
      });
    } else {
      console.log('ℹ️ Nenhum arquivo foi processado.');
    }

  } catch (error) {
    console.error('❌ Erro ao gerar metadados:', error);
    process.exitCode = 1;
  }
}

// Executa a geração de metadados
generateMetadata();
