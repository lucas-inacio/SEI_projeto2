const SerialPort = require('serialport');
const ReadLineParser = require('@serialport/parser-readline');
const platform = require('os').platform();

class Serial {
  constructor() {
    this.options = {
      autoOpen: false,
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    }
    this.port = null;
    this.parser = null;
    this.onDataCallback = null;
  }
  
  config(options) {
    // Sobrescreve this.options com options
    this.options = { ...this.options, ...options };
  }
  
  open(portName, options) {
    this.options = { ...this.options, ...options };
    let name = (platform === 'win32') ? '\\\\.\\' + portName : portName;
    this.port = new SerialPort.SerialPort({path: name, ...this.options});
    this.parser = this.port.pipe(new ReadLineParser.ReadlineParser({ includeDelimiter: false }));
    this.parser.on('data', amostra => {
      console.log(amostra);
      this.onDataCallback(amostra, new Date().getTime());
    });
    
    return new Promise((resolve, reject) => {
      try {
        this.port.open(err => {
          if (err) reject(false);
          else {
            this.port.flush();
            resolve(true);
          }
        });
      } catch (e) {
        reject(false);
      }
    });
  }
  
  close() {
    if (this.port.isOpen) this.port.close();
  }
  
  // Define o callback que será chamado quando receber dados
  onData(func) {
    this.onDataCallback = func;
  }
  
}

function ListPorts() {
  return SerialPort.SerialPort.list();
}