<?php

use MTA\StatsdClient\StatsdClient,
    MTA\StatsdClient\Factory\StatsdDataFactory,
    MTA\StatsdClient\Sender\SocketSender;

class MTA {

    private static $intances = array();

    private $prefix = '';

    private $timers = array();

    private $counters = array();

    private $configs = array(
        'debug' => false,
        'server' => array('host' => '127.0.0.1', 'port' => 8125),
        'sampleRate' => 100,
    );

    private $tags = array();

    private $sender = null;

    private $factory = null;

    private $client = null;

    private function __construct($name, $configs = array()) {
        $this->prefix = $name;
        $this->configs = array_merge($this->configs, $configs);

        if (is_array($this->configs['server'])) {
            $server = $this->configs['server'];
            $this->sender = new SocketSender($server['host'], $server['port'], 'udp');
            $this->client = new StatsdClient($this->sender);
            $this->factory = new StatsdDataFactory('\MTA\StatsdClient\Entity\StatsdData');
        } else {
            trigger_error('MTA.config.server is required', E_USER_ERROR);
        }
    }

    public static function getInstance($name, $configs = array()) {
        if (!isset(self::$instances[$name])) {
            $instance = new self($name, $configs);
            self::$instances[$name] = $instance;
        }

        return self::$instances[$name];
    }

    public function config($key, $value) {
        $this->configs[$key] = $value;
        return $this;
    }

    public function tag($key, $value) {
        $this->tags[$key] = $value;
        return $this;
    }

    public function start($marker) {
        return $this;
    }

    public function stop($marker) {
        return $this;
    }

    public function timing($name, $time) {
        return $this;
    }

    public function increment($counter) {
        return $this;
    }

    public function gauge($gauge) {
        return $this;
    }

}
