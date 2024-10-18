const { ipcRenderer } = require('electron');

let sPort = null;
let acumulaTemp = [];
let acumulaBat = [];
let acumulaOxi = [];
let plotterTemp = null;
let plotterOxi = null;
let plotterBat = null;

function solicitaSaida() {
  ipcRenderer.invoke('checaSaida');
}

window.onload = function () {
  const fecharTab = document.getElementById('fechar-tab');
  fecharTab.addEventListener('click', (e) => {
    e.preventDefault();
    solicitaSaida();
  });
  
  plotterTemp = new SerialPlotter(document.getElementById('tempCanvas'), 'Temperatura');
  plotterTemp.addPlot('temperatura', []);
  
  plotterBat= new SerialPlotter(document.getElementById('batimentoCanvas'), 'Batimento', 'bar');
  plotterBat.addPlot('batimento', []);

  plotterOxi= new SerialPlotter(document.getElementById('oxiCanvas'), 'Oxigenação');
  plotterOxi.addPlot('oxi', []);

  sPort = new Serial();
  sPort.onData((dados) => {
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
  });
  sPort.open('COM5', { baudRate: 115200 });

  const salvar = document.getElementById('salvarDados');
  salvar.addEventListener('click', (e) => {
    e.preventDefault();
  })
};

function novoGrafico(telaId, titulo, estilo) {
  const tipo = estilo || 'line';
  const ctx = document.getElementById(telaId);
  new Chart(ctx, {
    type: tipo,
    data: {
      labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
      datasets: [{
        label: '# of Votes',
        data: [12, 19, 3, 5, 2, 3],
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      },
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: titulo,
        }
      }
    }
  });
}