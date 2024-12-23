const { ipcRenderer } = require('electron');
const fs = require('fs').promises;
const { EOL } = require('os');

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

const formatoHora = new Intl.DateTimeFormat(
  'pt-BR',
  {
    second: '2-digit', minute: '2-digit', hour: '2-digit'
  }
).format;

// Caixa de mensagem usada para dar feedback ao usuário
// (erros, avisos, etc.)
const aviso = new bootstrap.Modal(document.getElementById('aviso'));
const avisoTexto = document.getElementById('avisoTexto');
function exibeMensagem(mensagem) {
  avisoTexto.innerText = mensagem;
  aviso.show();
}

// Transforma as amostras em formato de texto apropriado
// para armazenar em arquivo
function serializaDados() {
  let dados = '';
  for(let i = 0; i < horaDaAmostra.length; i++) {
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

// Salva os dados das amostras no arquivo especificado
// em 'caminho'. O arquivo é sobrescrito.
async function salvarArquivo(caminho, dados) {
  try {
    await fs.writeFile(caminho, dados, { flush: true });
  } catch(e) {
    console.log(e);
    throw e;
  }
}

// Coloca a aplicação no estado inicial, removendo dados
// e onfiguração anterior
function limpaDados() {
  if(plotterBat) plotterBat.clear();
  if(plotterOxi) plotterOxi.clear();
  if(plotterTemp) plotterTemp.clear();
  acumulaBat = [];
  acumulaOxi= [];
  acumulaTemp = [];
  horaDaAmostra = [];
  caminhoDoArquivo = null;
  contagemRejeitadas = 0;
  contagem.innerText = 'Amostras: 0';
  rejeitadas.innerText = 'Amostras rejeitadas: 0';
}

// Verifica se as amostras estão dentro de valores aceitáveis
// Retorna true se for o caso
function validaAmostra(temperatura, oxigenacao, batimento) {
  if(temperatura > 50 || temperatura < 0 ||
     oxigenacao > 100 || oxigenacao < 0 ||
     batimento > 200 || batimento < 0)
    return false;

  return true;
}

// Contadores de amostras exibidos no canto inferior esquerdo
const contagem = document.getElementById('contagem');
let contagemRejeitadas = 0;
const rejeitadas = document.getElementById('rejeitadas');
const filtro = document.getElementById('filtro');
// Recebe uma nova amostra e exibe nos gráficos
function atualizaDados(amostra, novoTimestamp) {
  const [ temperatura, oxigenacao, batimento ] = amostra.split(':');

  // Amostras devem ter no mínimo um segundo de distância entre si
  // caso contrário, a amostra é descartada
  if(horaDaAmostra.length === 0 || 
    novoTimestamp - horaDaAmostra[horaDaAmostra.length - 1] >= 1000) {

    if(filtro.checked && !validaAmostra(temperatura, oxigenacao, batimento)) {
      contagemRejeitadas += 1;
      rejeitadas.innerText = 'Amostras rejeitadas: ' + contagemRejeitadas;
      return;
    }

    acumulaBat.push(Number(batimento));
    acumulaOxi.push(Number(oxigenacao));
    acumulaTemp.push(Number(temperatura));
    horaDaAmostra.push(novoTimestamp);

    // Atualiza o gráfico
    plotterBat.pushData('batimento', formatoHora(novoTimestamp), batimento);
    plotterOxi.pushData('oxigenacao', formatoHora(novoTimestamp), oxigenacao);
    plotterTemp.pushData('temperatura', formatoHora(novoTimestamp), temperatura);

    // Atualiza a contagem de amostras
    contagem.innerText = 'Amostras: ' + horaDaAmostra.length;
  }
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
  // Modifica o comportamento da opção fechar no menu lateral
  const fecharTab = document.getElementById('fechar-tab');
  fecharTab.addEventListener('click', (e) => {
    e.preventDefault();
    // Comunica ao processo principal (main.js) que o usuário
    // deseja encerrar a aplicação. Realiza as ações necessárias antes.
    solicitaSaida();
  });

  // Armazenamento das amostras em arquivo
  const salvarTab = document.getElementById('salv-tab');
  salvarTab.addEventListener('click', async (e) => {
    e.preventDefault();

    const caminhoDoArquivo = await ipcRenderer.invoke('salvaDados');
    if(!caminhoDoArquivo) {
      exibeMensagem('Escolha um caminho válido');
      return;
    }

    const dados = serializaDados(); // Transforma os dados em texto
    try {
      await salvarArquivo(caminhoDoArquivo, dados);
      exibeMensagem('Concluído');
    } catch(e) {
      exibeMensagem('Erro ao salvar arquivo');
    }
  });
  
  // Adiciona os gráficos às telas
  plotterTemp = new SerialPlotter(document.getElementById('tempCanvas'), 'Temperatura');
  plotterTemp.setYLim(0, 50);
  plotterTemp.addPlot('temperatura', []);
  plotterTemp.setLineColor('temperatura', '#f7e665');
  plotterTemp.setFillColor('temperatura', '#ffae4a');
  
  plotterBat= new SerialPlotter(document.getElementById('batimentoCanvas'), 'Batimento', 'bar');
  plotterBat.setYLim(0, 200);
  plotterBat.addPlot('batimento', []);
  plotterBat.setLineColor('batimento', '#9BD0F5');
  plotterBat.setFillColor('batimento', '#FFA2EB');
  
  plotterOxi= new SerialPlotter(document.getElementById('oxiCanvas'), 'Oxigenação');
  plotterOxi.setYLim(0, 100);
  plotterOxi.addPlot('oxigenacao', []);
  plotterOxi.setLineColor('oxigenacao', '#7df76f');
  plotterOxi.setFillColor('oxigenacao', '#12b000');

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

  // Habilita porta serial escolhida quando o botão
  // Conectar é pressionado
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
        sPort = null;
        exibeMensagem('Não foi possível conectar');
      }
    }
  });

  // Controla a visibilidade dos gráficos
  const graficos = [];
  graficos.push({
    check: document.getElementById('tempCheck'),
    canvas: document.getElementById('tempCanvas')
  });
  graficos.push({
    check: document.getElementById('batCheck'),
    canvas: document.getElementById('batimentoCanvas')
  });
  graficos.push({
    check: document.getElementById('oxiCheck'),
    canvas: document.getElementById('oxiCanvas')
  });
  for(let grafico of graficos) {
    grafico.check.addEventListener('click', (e) => {
      if(grafico.canvas.style.visibility === 'hidden')
        grafico.canvas.style.visibility = 'visible';
      else
        grafico.canvas.style.visibility = 'hidden';
    });
  }
};