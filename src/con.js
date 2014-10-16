
const LENCRLF = 2;

function connection(config) {
    this.buffer = new Buffer(0);
    this.remoteAddr = config.remoteAddr;
    this.remotePort = config.remotePort;
}

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

    // console.log('Get cmds ', _cmds);
    // console.log('Get argnum ', _argNum);
    if (isNaN(_argNum)) {
        return false;
    }

    if (_cmds.length != _argNum * 2 + 1) {
        return false;
    }

    for( var i = 1; i < _cmds.length; i += 2) {
        _l = transLength(_cmds[i]);
        // console.log('commands length +=', _l);
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

function transLength(s) {
    // console.log("Trans string to Lenght", s, parseInt(s.slice(1)));
    return parseInt(s.slice(1));
};

module.exports = connection
