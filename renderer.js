const { ipcRenderer } = require('electron');

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

function atualizaDados(dados) {
  const [ dadosTemp, dadosOxi, dadosBat ] = dados.split(':');
  console.log(dadosTemp);
  console.log(dadosBat);
  console.log(dadosOxi);
  acumulaTemp.push(dadosTemp);
  acumulaBat.push(dadosBat);
  acumulaOxi.push(dadosOxi);
  plotterTemp.pushData('temperatura', [dadosTemp]);
  plotterBat.pushData('batimento', [dadosBat]);
  plotterOxi.pushData('oxi', [dadosOxi]);
}

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
  plotterOxi.addPlot('oxi', []);

  // Obtem a lista de portas seriais disponíveis
  // e atualiza o menu de portas    
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