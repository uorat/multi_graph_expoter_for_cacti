/**
 * Multi Graph Expoter for Cacti
 *
 * [Usage]
 *   casperjs cacti_graph_expoter.js --hostname=TARGET --stime=START_TIME --period=PERIOD_SECOND');
 *
 * [Caution]
 *   stime and period cannot be used bacause of the bug of cacti export function.
 *
 */

////////////////////////////////////////////////////////////
// variables and function
////////////////////////////////////////////////////////////

var config = require('./config.json');
var cactiServer = config.server.replace(/\/$/, '');;
var cactiUser = config.user;
var cactiPassword = config.password;

var casper = require('casper').create();

var cactiUrl = function(path) {
    path = path || '/';
    if (! path.match(/^\//) ) {
        path = '/' + path;
    }
    return cactiServer + path;
}

var getOptionValueByHostname = function(hostname){
    var nodeList = document.querySelectorAll('select[name=host_id] option');
    for (var i = 0; i < nodeList.length; i++) {
        (nodeList[i].text);
        if (nodeList[i].text.indexOf(hostname) == 0) {
            return nodeList[i].value;
        }
    }
    return null;
}
var getGraphIds = function(){
    var nodeList = document.querySelectorAll('table tbody tr td table tbody tr');
    var graphs = Array();
    for (var i = 0; i< nodeList.length; i++) {
        if (nodeList[i].id) {
            var title = nodeList[i]
            var graph = {
                id: nodeList[i].id.replace(/^line/, ''),
                title: nodeList[i].querySelector('a').title.replace(/ /g, '').replace('/', '')
            }
            graphs.push(graph);
        }
    }
    return graphs;
}


////////////////////////////////////////////////////////////
// Casper Steps
////////////////////////////////////////////////////////////

var login = function() {
    casper.start(cactiUrl(), function() {
        this.echo('Load => ' + this.getTitle() + ': ' + this.getCurrentUrl());
        this.fill(
            'form[action="index.php"]',
            { login_username: cactiUser, login_password: cactiPassword },
            true);
    });
}

var getGraphs = function(hostname, start_time, end_time) {
    var graphIds;
    casper.thenOpen(cactiUrl('/graphs.php'), function() {
        this.echo('Load => ' + this.getTitle() + ': ' + this.getCurrentUrl());
    });
    casper.then(function() {
        var select = this.evaluate(getOptionValueByHostname, hostname);
        if (select) {
            this.fill(
                'form[action="graphs.php"]',
                { host_id: select },
                true);
        } else {
            this.echo('Not found hostname => ' + hostname);
            this.exit();
        }

    });
    casper.then(function() {
        graphIds = this.evaluate(getGraphIds);
    });

    casper.then(function(){
        for (var i = 0; i < graphIds.length; i++) {
            url = cactiUrl('/graph_xport.php' +
                           '?local_graph_id=' + graphIds[i].id +
                           '&rra_id=0' +
                           '&view_type=tree' +
                           '&graph_start=' + start_time +
                           '&graph_end=' + end_time);
            var filename = './output/' + graphIds[i].title + '.csv';
            this.echo('  export csv => ' + filename);
            this.download(url, filename);
        }
    });
};

////////////////////////////////////////////////////////////
// Main
////////////////////////////////////////////////////////////

var main = function() {

    var hostname = casper.cli.get('hostname');
    var stime = casper.cli.get('stime');
    var period = casper.cli.get('period');

    // if (hostname && stime && period) {
    if (hostname) {
        console.log('hostname => ' + hostname);
        // console.log('stime => ' + stime);
        // console.log('period => ' + period + ' sec');
        // var start_time = new Date(stime.replace(/-/g, '/')).getTime() / 1000;
        // var end_time = start_time + period;
        var start_time = 0;
        var end_time = 0;

        login();
        var graphIds = getGraphs(hostname, start_time, end_time);
        casper.run();
    } else {
        console.log('Usage: casperjs cacti_graph_exporter.js --hostname=TARGET');
        casper.exit();
    }
};

main();
