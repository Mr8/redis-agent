var net = require('net');
var configData = require('../config.json')
var connection = require('./con')

var localPort = configData.local.port;


var GCmdMap = configData.cmdMap;


var GremoteWriteConfig = {
    address: configData.remote.remoteWriteAdd,
    port: configData.remote.remoteWritePort,
}

var GremoteReadConfig = {
    address: configData.remote.remoteReadAdd,
    port: configData.remote.remoteReadPort,
}

// append buffer to an new buffer

net.createServer({allowHalfOpen: false}, function(client) {

    var ClientCon = null;
    client.on('data', function(data) {
        // create an connection record
        // console.log('Get Data from client: ' + data);
        var con = {
            remoteAddr: client.remoteAddress,
            remotePort: client.remotePort,
        }
        ClientCon = new connection(con);

        ClientCon.bufferAppend(data);
        // console.log('Data in connection buffer', ClientCon.buffer.toString('utf8'));
        var protocol = ClientCon.parseProtocol(ClientCon.buffer);
        // console.log('Parsed protocol', protocol);
        if(protocol === false){
            return;
        }

        client.removeAllListeners('data');

        proxyServer(protocol);
    })

    function proxyServer(protocol) {
        var remoteWrite = net.createConnection(GremoteWriteConfig.port, GremoteWriteConfig.address);
        var remoteRead = net.createConnection(GremoteReadConfig.port, GremoteReadConfig.address);
        // TODO: Add proxy rules

        remoteWrite.write(protocol.data);
        // console.log("Write data to remote", protocol.data.toString('utf8'));

        client.on('data', function(data) {

            var _protocol = ClientCon.parseProtocol(data)
            if (_protocol === false) {
                return;
            }
            if(GCmdMap[_protocol.cmd] === true){
                remoteWrite.write(_protocol.data);
            }else{
                remoteRead.write(_protocol.data);
            }
            ClientCon.bufferPop(_protocol.data.length);
        });

        client.on('end', function() {
            remoteWrite.end();
            remoteRead.end();
        });

        client.on('timeout', function() {
            remoteWrite.end();
            remoteRead.end();
        });

        client.on('error', function() {
            remoteWrite.end();
            remoteRead.end();
        });

        remoteWrite.on('data', function(data) {
            client.write(data);
        });

        remoteWrite.on('end', function() {
            client.end();
        });

        remoteWrite.on('error', function() {
            client.end();
        });

        remoteRead.on('data', function(data) {
            client.write(data);
        });

        remoteRead.on('end', function() {
            client.end();
        });

        remoteRead.on('error', function() {
            client.end();
        });
    };
}).listen(localPort);

