var net = require('net');

var localPort = 10086;

function connection(config) {
    this.buffer = new Buffer(0);
    this.remoteAddr = config.remoteAddr;
    this.remotePort = config.remotePort;
}

var GCmdMap = {
    set: true,
    append: true,
    mset: true,
}


var GremoteConfig = {
    address: '127.0.0.1',
    port: 6601,
}

const LENCRLF = 2;

// append buffer to an new buffer
connection.prototype.bufferAppend = function (buf){
    var reBuf = null ;

    buf1 = this.buffer
    buf2 = buf

    switch(buf1.length + buf2.length){

        case 0:reBuf = new Buffer(0);
            break;

        case 1:rebuf = buf1 || buf2 ;
            break;

        default:
            reBuf = new Buffer(buf1.length + buf2.length);
            buf1.copy(reBuf);
            buf2.copy(reBuf, buf1.length);
            break;
    }
    this.buffer = reBuf;
}


connection.prototype.bufferPop = function (length) {
    this.buffer = this.buffer.slice(length)
}


connection.prototype.parseProtocol = function(buffer) {

    if (buffer.length < 4) {
        return false
    }

    var s = buffer.toString('utf8');

    var bufLength = 0;
    var _cmds     = s.split('\r\n').slice(0, -1);
    var _argNum   = parseInt(s.slice(1, 2))

    //console.log('Get cmds ', _cmds);
    //console.log('Get argnum ', _argNum);
    if (isNaN(_argNum)) {
        return false;
    }

    if (_cmds.length != _argNum * 2 + 1) {
        return false;
    }

    for( var i = 1; i < _cmds.length; i += 2) {
        _l = transLength(_cmds[i]);
        //console.log('commands length +=', _l);
        if (isNaN(_l)) {
            return false;
        }
        bufLength += (_l + LENCRLF + _cmds[i].length + LENCRLF)
    }
    bufLength += (_cmds[0].length + LENCRLF)

    return {
        cmd: _cmds[2],
        data: buffer.slice(0, bufLength),
    }
}


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
        var remoteWrite = net.createConnection(GremoteConfig.port, GremoteConfig.address);
        var remoteRead = net.createConnection(GremoteConfig.port, GremoteConfig.address);
        // TODO: Add proxy rules

        remoteWrite.write(protocol.data);
        // console.log("Write data to remote", protocol.data.toString('utf8'));

        client.on('data', function(data) {

            var _protocol = ClientCon.parseProtocol(data)
            if (_protocol === false) {
                return;
            }
            // TODO: if(_protocol.cmd in GCmdMap)
            remoteWrite.write(_protocol.data);
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

        remoteRead.on('data', function(data) {
            client.write(data);
        });

        remoteRead.on('end', function() {
            client.end();
        });

    };
}).listen(localPort);

function transLength(s) {
    // console.log("Trans string to Lenght", s, parseInt(s.slice(1)));
    return parseInt(s.slice(1));
};
