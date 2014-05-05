<?php

require('MTA.php');

$mta = MTA::create('www');
$mta->start('framework.dispatch');
simulate_execution();
$mta->stop('framework.dispatch');
$mta->start('framework.action');
simulate_execution();
$mta->stop('framework.action');
$mta->start('framework.template');
simulate_execution();
$mta->stop('framework.template');

$mta->increment('framework.stats');
$mta->increment('framework.stats');
$mta->increment('framework.stats');
$mta->increment('framework.stats');

$mta->gauge('framework.total', 300);

function simulate_execution() {
    $count = rand(1000, 100000);
    while ($count--) {
        $obj =  new stdClass();
    }
}
