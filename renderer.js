const { ipcRenderer } = require('electron');

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

// Graáficos
let plotterTemp = null;
let plotterOxi = null;
let plotterBat = null;

// Comunica ao processo main.js que o usuário deseja
// encerrar a aplicação
function solicitaSaida() {
  ipcRenderer.invoke('checaSaida');
}

function limpaDados() {
  if(plotterBat) plotterBat.clear();
  if(plotterOxi) plotterOxi.clear();
  if(plotterTemp) plotterTemp.clear();
  acumulaBat = [];
  acumulaOxi= [];
  acumulaTemp = [];
  horaDaAmostra = [];
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

    acumulaBat.push(batimento);
    acumulaOxi.push(oxigenacao);
    acumulaTemp.push(temperatura);
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

  const salvar = document.getElementById('salvarDados');
  salvar.addEventListener('click', (e) => {
    e.preventDefault();
  })
};