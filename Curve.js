class SerialPlotter {
  constructor(canvasContext, titulo, tipo, pointCount) {
    this.pointCount = pointCount || 5;
    this.data = {};
    this.chart = new Chart(canvasContext, {
      type: tipo || 'line',
      data: {
        datasets: []
      },
      options: {
        scales: {
          x: {
            type: 'linear'
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
  
  addPlot(label, data) {
    let points = [];
    for (let i = 0; i < data.length; ++i) {
      points.push({x: i, y: data[i]});
    }
    this.data[label] = points;
    this.chart.data.datasets.push({label, data: points});
    this.chart.update();
  }
  
  removeAllPlots() {
    this.data = {};
    this.chart.data.datasets = [];
    this.chart.update();
  }
  
  getSize() {
    return Object.keys(this.data).length;
  }
  
  pushData(label, data) {
    this.data[label].push(...data);
    let newPoints = [];
    let oldPoints = null;
    // Remove os dados anteriores
    if (this.data[label].length > this.pointCount) {
      let diff = this.data[label].length - this.pointCount;
      oldPoints = this.data[label].splice(0, diff);
    }
    
    // Remapeia os índices entre 0 e 199
    for (let i = 0; i < this.data[label].length - data.length; ++i) {
      newPoints.push({x: i, y: this.data[label][i].y});
    }
    for (let i = this.data[label].length - data.length; i < this.data[label].length; ++i) {
      newPoints.push({x: i, y: this.data[label][i]});
    }
    
    for (let key in this.chart.data.datasets) {
      if (this.chart.data.datasets[key].label === label) {
        this.chart.data.datasets[key].data = newPoints;
        break;
      }
    }
    this.data[label] = newPoints;
    this.chart.update();

    return oldPoints;
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
    for (let key in this.data)
      this.data[key] = [];
    this.chart.update();
  }
}