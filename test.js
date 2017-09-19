#!/usr/bin/env node


function Listener( port, key ) {

    var net = require( 'net' );
    var svr = new net.Server( );
    var fd  = null;

    svr.on( 'listening', function( ) {
        console.log( 'T - Listening on port ' + port + ' and emitting with ' + key );
    });

    svr.on( 'connection', function( sk ) {

        var buf = '';

        console.log( 'T - Connected to on port ' + port );

        sk.on( 'data', function( chunk ) {

            buf += chunk.toString( );

            if( buf.match( /\n$/ ) ) {
                process.emit( key, buf );
                buf = '';
            }
        });

        sk.on( 'error', function( ) {
            console.log( 'T - Error on socket connected to ' + port );
        });
    });

    svr.listen( port, '127.0.0.1' );
}








var client = require( './index.js' );

if( typeof( client.start ) !== 'function' ) {
    console.err( 'T - No start function in returned object.' );
    process.exit( 1 );
} else {
    console.log( 'T - Suitable object returned.' );
}

client.setTarget( 'stats', true );
client.setTarget( 'adder', true );
client.setTarget( 'gauge', true );

var harness = {
    stats:  {
        out:    '',
        port:   9125,
    },
    adder:  {
        out:    '',
        port:   9225,
    },
    gauge:  {
        out:    '',
        port:   9325,
    }
};

var countd = 4;
var recved = 0;
var passed = 0;
var mc;

var setHarness = function( type, obj ) {

    obj.key = type + '-data';
    obj.lst = new Listener( obj.port, obj.key );

    process.on( obj.key, function( str ) {
        if( str === obj.out ) {
            console.log( 'T - Correct data returned for ' + type );
            passed++;
        } else {
            console.log( 'T - For type ' + type + ', got "' + str + '" but expected "' + obj.out + '".' );
        }

        obj.out = '';

        recved++;
        if( recved === countd ) {
            console.log( 'T - All ' + countd + ' tests returned:  ' + passed + ' passed.' );
            process.exit( 0 );
        }
    });

    obj.test = function( path, val ) {
        obj.out = path + ' ' + val.toString( ) + '\n';
    };
};

var runTest = function( type, fn, path, val ) {
    console.log( 'T - Running test for ' + type + '/' + fn + '.' );
    harness[type].test( path, val );
    mc[fn]( path, val );
};


for( var t in harness ) {
    setHarness( t, harness[t] );
}

setTimeout( function( ) {
    mc = client.start( );
}, 500 );


setTimeout( function( ) {
    runTest( 'adder', 'incr', 'a.b.c.d', 1 );
}, 1500 );

setTimeout( function( ) {
    runTest( 'adder', 'plus', 'e.f.g.h', 10 );
}, 2000 );

setTimeout( function( ) {
    runTest( 'stats', 'stat', 'i.j.k.l', 10 );
}, 2500 );

setTimeout( function( ) {
    runTest( 'gauge', 'gauge', 'm.n.o.p', 4 );
}, 3000 );

setTimeout( function( ) {
    console.log( 'T - Not had all packets in.' );
    process.exit( 1 );
}, 5000 );
