class SerialPlotter {
  constructor(canvasContext, titulo, tipo) {
    this.chart = new Chart(canvasContext, {
      type: tipo || 'line',
      data: {
        datasets: []
      },
      options: {
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormat: {
                second: 'HH:mm:ss'
              },
              unit: 'second'
            },
            ticks: {
              source: 'data'
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
          }
        }
      }
      // options: {
      //     scales: {
      //         x: {
      //             display: false,
      //             type: 'linear',
      //             min: 0,
      //             max: this.pointCount,
      //         },
      // xAxes: [{
      //     display: false,
      //     type: 'linear',
      //     ticks: {
      //        max: this.pointCount,
      //        min: 0,
      //        stepSize: 1,
      //     }
      // }],
      // yAxes: [{
      //     ticks: {
      //         min: 0,
      //         max: 1
      //     }
      // }]
      // }
      // }
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
    this.chart.update();
  }

  setData(rotulo, dados) {
    for(let i in this.chart.data.datasets) {
      if(this.chart.data.datasets[i].label === rotulo) {
        this.chart.data.datasets[i].data = dados;
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
    this.chart.options.scales.xAxes[0].ticks.min = min;
    this.chart.options.scales.xAxes[0].ticks.max = max;
    this.chart.update();
  }
  
  setYLim(min, max) {
    this.chart.options.scales.yAxes[0].ticks.min = min;
    this.chart.options.scales.yAxes[0].ticks.max = max;
    this.chart.update();
  }
  
  // Limpa os dados do gráfico
  clear() {
    for (let data of this.chart.data.datasets)
      data.data = [];
    this.chart.update();
  }
}