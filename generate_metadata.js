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
    'playlists2.py',
    'Playlist.py',
    'requirements.txt',
    'Playlists.log',
    'Gemfile.lock'
  ],
  
  // Nome de usuário no GitHub (para construção das URLs de download)
  githubUser: 'josieljefferson12',
  
  // Nome do repositório no GitHub
  githubRepo: 'playlists.github.io',
  
  // Branch do repositório (usa a variável de ambiente CI_COMMIT_REF_NAME se existir, ou 'main' como padrão)
  branch: process.env.CI_COMMIT_REF_NAME || 'main'
};

// Função para formatar o tamanho do arquivo em unidades legíveis (KB, MB, GB, etc.)
function formatarTamanho(bytes) {
  // Caso o tamanho seja zero, retorna imediatamente
  if (bytes === 0) return '0 Byte';
  
  // Define a base para cálculo (1024 bytes = 1KB)
  const k = 1024;
  
  // Array com as unidades de medida
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  // Calcula o índice da unidade apropriada usando logaritmo
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // Calcula o valor formatado com 2 casas decimais e concatena com a unidade
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

// Função para formatar datas no formato DD/MM/YYYY - HH:MM:SS.SSS
function formatarData(date) {
  // Cria um objeto Date a partir do parâmetro recebido
  const d = new Date(date);
  
  // Obtém e formata o dia com 2 dígitos
  const dia = String(d.getDate()).padStart(2, '0');
  
  // Obtém e formata o mês (adiciona 1 pois janeiro é 0)
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  
  // Obtém o ano completo
  const ano = d.getFullYear();

  // Obtém e formata as horas com 2 dígitos
  const horas = String(d.getHours()).padStart(2, '0');
  
  // Obtém e formata os minutos com 2 dígitos
  const minutos = String(d.getMinutes()).padStart(2, '0');
  
  // Obtém e formata os segundos com 2 dígitos
  const segundos = String(d.getSeconds()).padStart(2, '0');
  
  // Obtém e formata os milissegundos com 3 dígitos
  const milissegundos = String(d.getMilliseconds()).padStart(3, '0');

  // Retorna a data formatada no padrão brasileiro com hora completa
  return `${dia}/${mes}/${ano} - ${horas}:${minutos}:${segundos}.${milissegundos}`;
}

// Função principal para obter os metadados dos arquivos locais
function getLocalFiles() {
  // Lê o conteúdo do diretório atual de forma síncrona
  // withFileTypes: true retorna objetos fs.Dirent em vez de strings
  const allFiles = fs.readdirSync('.', { withFileTypes: true });

  // Processa a lista de arquivos:
  return allFiles
    // Filtra apenas entradas que são arquivos (não diretórios)
    .filter(dirent => dirent.isFile())
    
    // Mapeia para obter apenas os nomes dos arquivos
    .map(dirent => dirent.name)
    
    // Filtra os arquivos excluídos na configuração
    .filter(file => !config.excludedFiles.includes(file))
    
    // Mapeia cada arquivo para um objeto de metadados
    .map(file => {
      // Obtém as estatísticas do arquivo (tamanho, datas, etc.)
      const stats = fs.statSync(file);
      
      // Retorna um objeto com todas as informações do arquivo
      return {
        nome: file, // Nome do arquivo
        caminho: file, // Caminho do arquivo (relativo)
        tamanho: formatarTamanho(stats.size), // Tamanho formatado
        ultima_modificacao: formatarData(stats.mtime), // Data de modificação formatada
        // URL para download no GitHub (usando as configurações)
        download_url: `https://raw.githubusercontent.com/${config.githubUser}/${config.githubRepo}/${config.branch}/${file}`,
        // Extensão do arquivo (sem o ponto), ou 'file' se não tiver extensão
        tipo_arquivo: path.extname(file).toLowerCase().replace('.', '') || 'file'
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