<?php
error_reporting(E_ALL);

require('MTA.php');

$mta = MTA::getInstance();
$mta->start('anonymous.timer');
simulate_execution();
$mta->stop('anonymous.timer');

$mta = MTA::getInstance('www');

$mta->config('sender', 'browser');
$mta->config('beacon', 'http://127.0.0.1:8888/_.gif');
$mta->config('sampleRate', 100);

$mta->tag('server', php_uname('n'));
$mta->tag('page', 'example');

$mta->start('framework');

    $mta->start('framework.dispatch');
    simulate_execution();
    $mta->stop('framework.dispatch');

    $mta->start('framework.action');
    simulate_execution();
    $mta->stop('framework.action');

    $mta->start('framework.template');

        $mta->start('framework.template.header');
        simulate_execution();
        $mta->stop('framework.template.header');

        $mta->start('framework.template.content');
        simulate_execution();
        $mta->stop('framework.template.content');

        $mta->start('framework.template.footer');
        simulate_execution();
        $mta->stop('framework.template.footer');

    $mta->stop('framework.template');

$mta->stop('framework');

$mta->increment('framework.stats');
$mta->increment('framework.stats');
$mta->increment('framework.stats');
$mta->increment('framework.stats');

$mta->gauge('framework.total', 300);

function simulate_execution() {
    $count = rand(2000, 20000);
    while ($count--) {
        $obj =  new stdClass();
    }
}

echo $mta->outputHeaderJS();
echo $mta->send();

