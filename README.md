# Ministry Client

This is a simple nodejs ministry client.  It features connection, reconnect,
queuing during socket problems, and a simple object model.

## Usage

The node module returns an instance when require()'d.  This instance has just
two methods.

### setTarget( type, active, [ [ prefix, ] conf ] )

 * Type is one of: stats, adder, gauge
 * Active is a bool to enable/disable this type
 * Prefix defaults to ''
 * Conf defaults to an object containing some or all of (defaults in
   parentheses):
    - host: target host (127.0.0.1)
    - port: target (depends on the type)
    - intv: reconnect interval in msec (5000)
    - bsz:  maximum socket bytes outstanding (8M)
    - max:  maximum queued up lines (5000)

This method returns nothing.


### start( )

Initiate the connections and return an object containing the actual sending
methods.

 * plus( path, val )  - add <val> to the total this period for <path>
 * incr( path )       - add 1 to the total this period for <path>
 * stat( path, val )  - put <val> in the list of values this period for <path>
 * gauge( path, val ) - set <val> as the current value for <path>

Ministry documentation (man ministry on a host where it is installed) will
explain adders, stats and gauges more completely, but in essence:


## Metric Types

#### Adder

A statsd counter - the sum for each period is reported.  Negative numbers are
processes as expected, so if you report 2, -1, -2, 1, you will get 0.  It
recognises the difference between value 0 and no readings, and will report 0.

Ministry does not support the counter sampling rate from statsd.  Submit all
your numbers.

#### Stats

Traditional stats reporting.  Statistical mathematics is applied to the set
of values submitted.  The individual values are not reported, but rather the
highest, lowest, mean, median, and configured percentiles.

### Gauge

Each value submitted updates the gauge.  Normally, it starts at 0, and each
value is either a delta or replacement to that.  Ministry matches the statsd
format.

* Submitting +val adds to the current value.
* Submitting -val is subtracting from the current value.
* Submitting  val sets the current value.

So to explicity set a negative number, you must first set it to 0.  Don't
blame me, blame Etsy.


