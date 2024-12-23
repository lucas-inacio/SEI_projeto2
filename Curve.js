class SerialPlotter {
  constructor(canvasContext, titulo, tipo) {
    this.maximoPontos = 10;
    this.chart = new Chart(canvasContext, {
      type: tipo || 'line',
      labels: [],
      data: {
        datasets: []
      },
      options: {
        animation: false,
        animations: {
          colors: false,
          x: false,
        },
        transitions: {
          active: {
            animation: {
              duration: 0
            }
          }
        },
        scales: {
          x: {
            type: 'category',
            ticks: {
              source: 'labels'
            }
          },
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
            position: 'left'
          },
          legend: {
            display: false,
          }
        }
      }
    });
  }
  
  // Adiciona amostras ao gráfico
  // dados deve ter o formato [{x: <timestamp>, y: <valor>}, ...]
  addPlot(rotulo, dados) {
    this.chart.data.datasets.push({label: rotulo, data: dados});
    this.chart.update();
  }
  
  removeAllPlots() {
    this.chart.data.datasets = [];
    this.chart.data.labels = [];
    this.chart.update();
  }

  // Adiciona uma amostra ao gráfico, removendo amostras antigas
  // caso o tamanho ultrapasse this.maximoPontos
  pushData(rotulo, x, y) {
    for(let i in this.chart.data.datasets) {
      if(this.chart.data.datasets[i].label === rotulo) {
        this.chart.data.datasets[i].data.push(y);
        this.chart.data.labels.push(x);
        const tamanho = this.chart.data.datasets[i].data.length;
        if(tamanho > this.maximoPontos) {
          this.chart.data.datasets[i].data.splice(0, tamanho - this.maximoPontos);
          this.chart.data.labels.splice(0, tamanho - this.maximoPontos);
        }
        this.chart.update();
      }
    }
  }
  
  // color deve ser uma string na forma 'rgb(r, g, b, a)'
  setLineColor(label, color) {
    for (let key in this.chart.data.datasets) {
      if (this.chart.data.datasets[key].label === label) {
        this.chart.data.datasets[key].borderColor = color;
        break;
      }
    }
  }
  
  setFillColor(label, color) {
    for (let key in this.chart.data.datasets) {
      if (this.chart.data.datasets[key].label === label) {
        this.chart.data.datasets[key].backgroundColor = color;
        break;
      }
    }
  }
  
  setXLim(min, max) {
    this.chart.options.scales.x.min = min;
    this.chart.options.scales.x.max = max;
    this.chart.update();
  }
  
  setYLim(min, max) {
    this.chart.options.scales.y.min = min;
    this.chart.options.scales.y.max = max;
    this.chart.update();
  }
  
  // Limpa os dados do gráfico
  clear() {
    for (let data of this.chart.data.datasets)
      data.data = [];
    this.chart.data.labels = [];
    this.chart.update();
  }
}