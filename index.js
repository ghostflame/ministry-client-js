// a simple connection object, does reconnect
function Connector( conf ) {

    var mods  = {
        net:        require( 'net' ),
    };
    var sock  = null;
    var key   = '';
    var queue = [ ];

    var writeDummy = function( str ) { };

    var connect = function( ) {

        if( !conf.connect ) {
            sock = {
                write:  writeDummy,
                end:    function( ) { },
            };
            console.log( 'Created dummy socket.' );
            return;
        }


        sock = mods.net.createConnection( conf.port, conf.host, function( ) {
            console.log( 'Connected to ' + key );
        });

        sock.on( 'error', function( e ) {
            console.log( 'Connection error on ' + key + ': ' + e );
            try {
                sock.end( );
            } catch( e ) { };
            sock = null;
        });

        sock.on( 'end', function( ) {
            console.log( 'Connection to ' + key + ' closed.' );
            sock = null;
        });
    };

    var reconnect = function( ) {
        if( !sock ) {
            connect( );
        }
    };

    var flush = function( ) {

        if( !sock || !queue.length ) {
            return;
        }

        while( queue.length ) {
            sock.write( queue.splice( 0, 10 ).join( '' ) );
        }
    };

    var sendKeepalive = function( ) {
        if( sock ) {
            sock.write( 'keepalive\n' );
        }
    };

    // make sure about our config
    conf.host = conf.host || '127.0.0.1';
    conf.intv = conf.intv || 5000;
    conf.bsz  = conf.bsz  || 8388608;
    conf.max  = conf.max  || 5000;
    key       = conf.type + '@' + conf.host + ':' + conf.port;

    // clear down waiting stuff regularly
    setInterval( flush, 100 );

    // and reconnects
    setInterval( reconnect, conf.intv );

    // and go
    connect( );

    // and set keepalives if we were told
    if( conf.kaIntv ) {
        setInterval( sendKeepalive, conf.kaIntv );
    }


    // METHODS

    this.write = function( prefix, path, val ) {

        var line = prefix + path + ' ' + val.toString( ) + '\n';

        // only buffers if we can't write
        if( !sock || sock.bufferSize > conf.bsz ) {
            while( queue.length >= conf.max ) {
                queue.splice( 0, 10 );
            }

            queue.push( line );
            return;
        }

        // we prefer to write at once
        sock.write( line );
    };


    this.writeIf = function( prefix, path, val ) {

        if( sock ) {
            this.write( path, val );
            return true;
        }

        return false;
    };
}

function Client( ) {

    var targets = {
        stats:  null,
        adder:  null,
        gauge:  null,
    };

    var ports = {
        stats:  9125,
        adder:  9225,
        gauge:  9325,
    };

    var getPort = function( type ) {
        if( type in ports ) {
            return ports[type];
        }

        return 0;
    };


    var incr = function( path, val ) {
        targets.adder.conn.write( targets.adder.prefix, path, 1 );
    };

    var plus = function( path, val ) {
        targets.adder.conn.write( targets.adder.prefix, path, val );
    };

    var stat = function( path, val ) {
        targets.stats.conn.write( targets.stats.prefix, path, val );
    };

    var gauge = function( path, val ) {
        targets.gauge.conn.write( targets.gauge.prefix, path, val );
    };


    this.setTarget = function( type, active, prefix, conf ) {

        if( !( type in targets ) ) {
            console.log( 'Target type ' + type + ' not recognised.' );
            return false;
        }

        // we expect type and active.  If prefix is skipped, we
        // make it empty and use the third arg as conf
        if( prefix && typeof( prefix ) === 'object' ) {
            conf = prefix;
            prefix = '';
        }

        prefix    = prefix    || '';
        conf      = conf      || { };
        conf.host = conf.host || '127.0.0.1';
        conf.port = conf.port || getPort( type );
        conf.type = type;

        conf.connect = true;

        var obj = {
            conf:       conf,
            prefix:     '',
            active:     !!active,
            conn:       { write: function( ) { }, },
        };

        targets[type] = obj;
        return true;
    };


    this.start = function( ) {

        for( var k in targets ) {
            if( targets[k] && targets[k].active ) {
                targets[k].conn = new Connector( targets[k].conf );
            }
        }

        var ret = {
            incr:   ( targets.adder.active ) ? incr  : function( ) { },
            plus:   ( targets.adder.active ) ? plus  : function( ) { },
            stat:   ( targets.stats.active ) ? stat  : function( ) { },
            gauge:  ( targets.gauge.active ) ? gauge : function( ) { },
        };

        return ret;
    };
}

var exp = new Client( );
module.exports = exp;


