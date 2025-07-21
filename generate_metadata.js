// Importa o módulo 'fs' (File System) para manipulação de arquivos
const fs = require('fs');
// Importa o módulo 'path' para trabalhar com caminhos de arquivos e diretórios
const path = require('path');

// Configurações do projeto - objeto que armazena todas as configurações necessárias
const config = {
  // Nome do arquivo de saída que conterá os metadados
  outputFile: 'files_metadata.json',
  
  // Lista de arquivos que devem ser excluídos do processamento
  excludedFiles: [
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
  
  // Nome de usuário no GitHub (para construção das URLs de download)
  githubUser: 'josieljefferson12',
  
  // Nome do repositório no GitHub
  githubRepo: 'playlists.github.io',
  
  // Branch do repositório (usa a variável de ambiente CI_COMMIT_REF_NAME se existir, ou 'main' como padrão)
  branch: process.env.CI_COMMIT_REF_NAME || 'main'
};

// Função para formatar o tamanho do arquivo
function formatarTamanho(bytes) {
  if (bytes === 0) return '0 Byte';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Função para formatar datas
function formatarData(date) {
  const d = new Date(date);
  const pad = (num, size) => String(num).padStart(size, '0');
  return `${pad(d.getDate(), 2)}/${pad(d.getMonth() + 1, 2)}/${d.getFullYear()} - ` +
         `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}.` +
         pad(d.getMilliseconds(), 3);
}

// Função principal simplificada (estilo Código 2) com formatação do Código 1
function getLocalFiles() {
  return fs.readdirSync('.', { withFileTypes: true })
    .filter(dirent => dirent.isFile())
    .map(dirent => dirent.name)
    .filter(file => !config.excludedFiles.includes(file))
    .map(file => {
      const stats = fs.statSync(file);
      return {
        name: file,
        path: file,
        size: formatarTamanho(stats.size),
        lastModified: formatarData(stats.mtime),
        download_url: `https://raw.githubusercontent.com/${config.githubUser}/${config.githubRepo}/${config.branch}/${file}`,
        file_type: path.extname(file).toLowerCase().replace('.', '') || 'file'
      };
    });
}

// Função principal que orquestra a geração dos metadados
function generateMetadata() {
  try {
    // Mensagem inicial indicando o início do processo
    console.log('⏳ Iniciando geração de metadados...');

    // Obtém os metadados de todos os arquivos
    const filesMetadata = getLocalFiles();

    // Escreve o arquivo de saída com os metadados em formato JSON
    // path.join(__dirname, config.outputFile) cria o caminho absoluto
    // JSON.stringify com null e 2 formata o JSON com indentação de 2 espaços
    fs.writeFileSync(
      path.join(__dirname, config.outputFile),
      JSON.stringify(filesMetadata, null, 2)
    );

    // Mensagem de sucesso com o nome do arquivo gerado
    console.log(`✅ Metadados gerados com sucesso em ${config.outputFile}`);
    
    // Informa quantos arquivos foram processados
    console.log(`📊 Total de arquivos processados: ${filesMetadata.length}`);

    // Lista detalhada dos arquivos incluídos (para debug)
    console.log('📝 Arquivos incluídos:');
    filesMetadata.forEach(file => {
      console.log(`- ${file.name} (${file.file_type})`);
    });

  } catch (error) {
    // Em caso de erro, exibe mensagem detalhada e encerra o processo com código 1 (erro)
    console.error('❌ Erro ao gerar metadados:', error);
    process.exit(1);
  }
}

// Chama a função principal para iniciar o processo
generateMetadata();
