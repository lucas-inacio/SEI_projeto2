const { ipcRenderer, webUtils } = require('electron');
const fs = require('fs').promises;
const { EOL } = require('os');

// Quantidade máxima de amostras a exibir
const AMOSTRAS_MAX = 10;

// Porta serial aberta atualmente
let sPort = null;

// Acumula os valores obtidos da porta serial 
// para salvar posteriormente
let acumulaTemp = [];
let acumulaBat = [];
let acumulaOxi = [];
let horaDaAmostra = [];

// Gráficos
let plotterTemp = null;
let plotterOxi = null;
let plotterBat = null;

// Informações de armazenamento de arquivos
let caminhoDoArquivo = null;
// false -> substitui arquivo; true -> salva periodicamente no mesmo arquivo
let incrementarArquivo = false;
// Há uma tarefa de escrita ainda não concluída
let escritaPendente = false;

const formatoHora = new Intl.DateTimeFormat(
  'pt-BR',
  {
    second: '2-digit', minute: '2-digit', hour: '2-digit'
  }
).format;
function serializaDados(quantidade) {
  const total = horaDaAmostra.length > quantidade ? quantidade : horaDaAmostra.length;
  let dados = '';
  for(let i = 0; i < total; i++) {
    const data = new Date(horaDaAmostra[i]);
    dados += 
      formatoHora(data.getTime()) + ' - ' +
      acumulaTemp[i] + '°C - ' +
      acumulaBat[i] + 'bpm - ' +
      acumulaOxi[i] + '%' + EOL;
  }
  return dados;
}

// Comunica ao processo main.js que o usuário deseja
// encerrar a aplicação
function solicitaSaida() {
  ipcRenderer.invoke('checaSaida');
}

async function tarefaSalvarArquivo() {
  if(caminhoDoArquivo) {
    if(horaDaAmostra.length >= AMOSTRAS_MAX+5 && !escritaPendente) {
      const dados = serializaDados(5);
      try {
        await salvarArquivo(caminhoDoArquivo, incrementarArquivo, dados);
        acumulaBat.splice(0, 5);
        acumulaTemp.splice(0, 5);
        acumulaOxi.splice(0, 5);
        horaDaAmostra.splice(0, 5);
      } catch(e) {
        console.log(e);
      }
    }

    if(incrementarArquivo)
      setTimeout(tarefaSalvarArquivo, 1000);
  }
}

async function salvarArquivo(caminho, incrementar, dados) {
  try {
    if(incrementar) {
      await fs.appendFile(caminho, dados, { flush: true });
    } else {
      await fs.writeFile(caminho, dados, { flush: true });
    }
  } catch(e) {
    console.log(e);
    throw e;
  }
}

function limpaDados() {
  if(plotterBat) plotterBat.clear();
  if(plotterOxi) plotterOxi.clear();
  if(plotterTemp) plotterTemp.clear();
  acumulaBat = [];
  acumulaOxi= [];
  acumulaTemp = [];
  horaDaAmostra = [];
  caminhoDoArquivo = null;
}

function constroiAmostras(amostras, timestamps) {
  const saida = [];
  for(let i in amostras) {
    saida.push({x: timestamps[i], y: amostras[i]});
  }
  return saida;
}

function atualizaDados(amostra, novoTimestamp) {
  const [ temperatura, oxigenacao, batimento ] = amostra.split(':');

  // Amostras devem ter no mínimo um segundo de distância entre si
  // Se o timestamp for igual (até +-999 milisegundos), substitui
  // pelo último valor fornecido
  if(horaDaAmostra.length === 0 || 
    novoTimestamp - horaDaAmostra[horaDaAmostra.length - 1] >= 1000) {

    acumulaBat.push(Number(batimento));
    acumulaOxi.push(Number(oxigenacao));
    acumulaTemp.push(Number(temperatura));
    horaDaAmostra.push(novoTimestamp);
  } else {
    acumulaBat[acumulaBat.length - 1] = batimento;
    acumulaOxi[acumulaOxi.length - 1] = oxigenacao;
    acumulaTemp[acumulaTemp.length - 1] = temperatura;
    horaDaAmostra[horaDaAmostra.length - 1] = novoTimestamp;
  }

  // Atualiza o gráfico
  plotterBat.setData(
    'batimento',
    constroiAmostras(
      acumulaBat.slice(-AMOSTRAS_MAX), horaDaAmostra.slice(-AMOSTRAS_MAX)));

  plotterOxi.setData(
    'oxigenacao',
    constroiAmostras(
      acumulaOxi.slice(-AMOSTRAS_MAX), horaDaAmostra.slice(-AMOSTRAS_MAX)));

  plotterTemp.setData(
    'temperatura',
    constroiAmostras(
      acumulaTemp.slice(-AMOSTRAS_MAX), horaDaAmostra.slice(-AMOSTRAS_MAX)));
}

// Atalho para mudar o texto do botão de Conectar/Desconectar
function configuraBotaoConectar(texto) {
  const botaoDrop = document.getElementById('dropButton');
  botaoDrop.innerText = texto;
}

// Constrói o menu de portas seriais
// retorna true se detectar portas
// retorna false se não houver portas presentes
function constroiMenu(itens) {
  const menuDrop = document.getElementById('dropMenu');
  const botaoDrop = document.getElementById('dropButton');
  menuDrop.innerHTML = ''; // Remove elementos anteriores
  
  if(!itens || itens.length === 0) {
    configuraBotaoConectar('Nenhuma porta detectada');
    return false;
  }

  // Preenche o menu com a lista de nomes das portas seriais
  for(item of itens) {
    const novoElemento = document.createElement('li');
    novoElemento.setAttribute('class', 'dropdown-item');
    novoElemento.setAttribute('href', '#');
    novoElemento.innerText = item;
    menuDrop.appendChild(novoElemento);
  }

  // Detecta a seleção da porta serial no menu e indica a escolha modificando o
  // texto no botão
  const listaBotaoDrop = document.querySelectorAll('#dropMenu .dropdown-item');
  listaBotaoDrop.forEach((item) => {
    item.addEventListener('click', (e) => {
      botaoDrop.innerText = e.target.innerText;
    });
  });
  botaoDrop.innerText = itens[0];

  return true;
}

window.onload = function () {
  // Especifica o formato de hora
  moment().locale('pt-br');
  moment().format('kk:mm:ss');
  // moment().utcOffset(-3*60); // UTC - 3:00
  // Modifica o comportamento da opção fechar no menu lateral
  const fecharTab = document.getElementById('fechar-tab');
  fecharTab.addEventListener('click', (e) => {
    e.preventDefault();
    // Comunica ao processo principal (main.js) que o usuário
    // deseja encerrar a aplicação. Realiza as ações necessárias antes.
    solicitaSaida();
  });
  
  // Adiciona os gráficos às telas
  plotterTemp = new SerialPlotter(document.getElementById('tempCanvas'), 'Temperatura');
  plotterTemp.addPlot('temperatura', []);
  
  plotterBat= new SerialPlotter(document.getElementById('batimentoCanvas'), 'Batimento', 'bar');
  plotterBat.addPlot('batimento', []);

  plotterOxi= new SerialPlotter(document.getElementById('oxiCanvas'), 'Oxigenação');
  plotterOxi.addPlot('oxigenacao', []);

  // Obtem a lista de portas seriais disponíveis
  // e atualiza o menu de portas a cada 3 segundos
  const obtemPortas = async () => {
    let nomes = [];
    const listaPorta = await ListPorts();
    for(const porta of listaPorta)
      nomes.push(porta.path);

    if(!constroiMenu(nomes)) {
      sPort = null;
      const conectar = document.getElementById('conectar');
      conectar.innerText = 'Conectar';
    }
    setTimeout(obtemPortas, 3000);
  };
  obtemPortas();

  // Habilita porta serial escolhida
  const conectar = document.getElementById('conectar');
  conectar.addEventListener('click', async (e) => {
    if(sPort) {
      conectar.innerText = 'Conectar';
      sPort.close();
      sPort = null;
    } else {
      try {
        const botaoDrop = document.getElementById('dropButton');
        sPort = new Serial();
        sPort.onData(atualizaDados);
        await sPort.open(botaoDrop.innerText, {baudRate: 115200});
        conectar.innerText = 'Desconectar';
        limpaDados();
      } catch(e) {
        console.log('Erro ao abrir porta');
        sPort = null;
      }
    }
  });

  // Armazenamento das amostras em arquivo
  const salvar = document.getElementById('salvarDados');
  salvar.addEventListener('click', async (e) => {
    e.preventDefault();

    if(escritaPendente) {
      return;
    }

    const campoNomeDoArquivo = document.getElementById('formFile');
    incrementarArquivo = document.getElementById('checkFile').checked;
    if(campoNomeDoArquivo.files && campoNomeDoArquivo.files.length > 0) {
      caminhoDoArquivo = webUtils.getPathForFile(campoNomeDoArquivo.files[0]);

      if(incrementarArquivo) {
        setTimeout(tarefaSalvarArquivo, 1000);
      } else {
        const dados = serializaDados(5);
        console.log(dados);
        try {
          await salvarArquivo(caminhoDoArquivo, incrementarArquivo, dados);
          acumulaBat.splice(0, 5);
          acumulaTemp.splice(0, 5);
          acumulaOxi.splice(0, 5);
          horaDaAmostra.splice(0, 5);
        } finally {
          escritaPendente = false;
        }
      }

      // console.log(caminhoDoArquivo);
      // console.log(checkFile.checked);
    }
  })
};