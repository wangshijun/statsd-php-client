<?php
error_reporting(E_ALL);

require('MTA.php');

$sender = isset($argv[1]) ? trim($argv[1]) : 'socket';
$sender = in_array($sender, array('echo', 'socket')) ? $sender : 'socket';

$mta = MTA::getInstance('www');

$mta->config('sender', $sender);
$mta->config('server', array('host' => '127.0.0.1', 'port' => 8125));
$mta->config('sampleRate', 100);

$mta->tag('server', 'localhost');
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

return $mta->send();

function simulate_execution() {
    $count = rand(2000, 20000);
    while ($count--) {
        $obj =  new stdClass();
    }
}

