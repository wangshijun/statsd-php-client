<?php

$loader = require_once __DIR__ . "/vendor/autoload.php";
$loader->add('Liuggio\\', __DIR__);

use Liuggio\StatsdClient\StatsdClient,
    Liuggio\StatsdClient\Factory\StatsdDataFactory,
    Liuggio\StatsdClient\Sender\EchoSender,
    Liuggio\StatsdClient\Sender\SyslogSender,
    Liuggio\StatsdClient\Sender\SocketSender;

register_shutdown_function('MTA::flush');

class MTA {

    /**
     * instances
     */
    private static $_instances = array();

    /**
     * Internal timers array
     *
     * @var array
     */
    private $_timers = array();
    private $_records = array();

    /**
     * account name, prefix for all metrics
     */
    private $_prefix = '';

    /**
     * config
     */
    private $_configs = array(
        'sender' => 'socket',
        'server' => array('host' => '127.0.0.1', 'port' => 8125),
        'tagPrefix' => '_t_',
        'sampleRate' => 100,
    );

    /**
     * buffer
     */
    private $_buffers = array(
        'timer' => array(),
        'counter' => array(),
        'gauge' => array(),
    );

    /**
     * tags
     */
    private $_tags = array();

    private $_factory = null;

    private function __construct($name, $configs = array()) {
        $this->_prefix = $name;
        $this->_factory = new StatsdDataFactory('\Liuggio\StatsdClient\Entity\StatsdData');

        foreach ($configs as $key => $value) {
            $this->config($key, $value);
        }
    }

    /**
     * create mta instance with specified account and config
     *
     * @param {string} $name
     * @param {array} $configs
     * @return instance
     */
    public static function create($name, $configs = array()) {
        if (!isset(self::$_instances[$name])) {
            $instance = new self($name, $configs);
            self::$_instances[$name] = $instance;
        }

        return self::$_instances[$name];
    }

    /**
     * update mta config
     *
     * @param {string} $key
     * @param {mixed} $value
     */
    public function config($key, $value) {

        if ($key === 'sender') {
            if (in_array($value, array('socket', 'syslog', 'echo'))) {
            } else {
                trigger_error('unknown data sender (socket, syslog, echo)', E_USER_ERROR);
            }
        }

        if ($key === 'server') {
            if (isset($this->_configs['server']['host']) && isset($this->_configs['server']['port'])) {
            } else {
                trigger_error('server misconfigured is required', E_USER_ERROR);
            }
        }

        $this->_configs[$key] = $value;

        return $this;
    }

    /**
     * add mta metric tags
     *
     * @param {string} $key
     * @param {mixed} $value
     */
    public function tag($key, $value) {
        $this->_tags[$key] = $value;
        return $this;
    }

    /**
     * Start an timer.
     *
     * @param string $name The name of the timer to start.
     */
    public function start($name = null) {
        if (empty($name)) {
            return;
        }
        if (!empty($this->_timers[$name])) {
            //avoid repeat start
            return;
        }
        $this->_timers[$name] = microtime(true);
        // echo 'start timer:', $name, ' => ', $this->_timers[$name], PHP_EOL;
    }

    /**
     * Stop a timer.
     *
     * @param string $name The name of the timer to end.
     */
    public function stop($name = null) {
        if (empty($name) || empty($this->_timers[$name])) {
            return;
        }
        $this->record($name, microtime(true) - $this->_timers[$name]);
        // echo 'stop timer:', $name, ' => ', $this->_timers[$name], PHP_EOL;

        unset($this->_timers[$name]);
    }

    /**
     * Get all timers that have been started and stopped.
     * Calculates elapsed time for each timer. If clear is true, will delete existing timers
     *
     * @param boolean $clear false
     * @return array
     */
    public function getTimers($clear = true) {
        $timers = array_map('ceil', $this->_records);
        return $timers;
    }

    /**
     * Get the record of timer $name
     *
     * @param  String $name
     * @return Int/NULL
     */
    public function getTimer($name) {
        if (isset($this->_records[$name])) {
            return ceil($this->_records[$name]);
        } else {
            return null;
        }
    }

    /**
     * directly add a period of time to timer's record
     *
     * @param  $timeElapsed  duration, endtime - starttime, both made by 'microtime(true)'
     * @return  int value, the elapsed time since the given start-time
     */
    public function record($timerName, $timeElapsed) {
        if (empty($timerName)) {
            return;
        }
        $e = $timeElapsed * 1000;
        $this->_records[$timerName] = empty($this->_records[$timerName]) ? $e : $this->_records[$timerName] + $e;
    }

    /**
     * Clear all existing timers
     *
     * @return boolean true
     */
    public function clear() {
        $this->_timers = array();
        $this->_records = array();
        $this->_buffers = array(
            'timer' => array(),
            'counter' => array(),
            'gauge' => array(),
        );
    }

    /**
     * add timer data
     *
     * @param {string} $key metric name
     * @param {mixed} $time arbitary time
     * @return instance
     */
    public function timing($name, $time) {
        if (is_array($time)) {  // one dimension
            $timings = array();
            foreach ($time as $k => $v) {
                $timings[$name . '.' . $k] = $v;
            }
        } else {
            $timings = array($name => $time);
        }

        foreach ($timings as $key => $value) {
            $this->_buffers['timer'][$key] = $value;
        }

        return $this;
    }

    /**
     * add counter data
     *
     * @param {string} $key metric name
     */
    public function increment($key) {
        $key = is_array($key) ? $key : array($key);
        foreach ($key as $k) {
            if (isset($this->_buffers['counter'][$k])) {
                $this->_buffers['counter'][$k]++;
            } else {
                $this->_buffers['counter'][$k] = 1;
            }
        }
        return $this;
    }

    /**
     * add gauge
     *
     * @param {string} $key metric name
     */
    public function gauge($key, $value) {
        $this->_buffers['gauge'][$key] = $value;
        return $this;
    }

    /**
     * send data to backend
     */
    public function send() {
        $data = array();

        // sample hit ?
        if (rand(1, 100) > $this->_configs['sampleRate']) {
            $this->clear();
            return $data;
        }

        // get timers
        $timers = $this->getTimers();
        foreach ($timers as $key => $value) {
            $this->timing($key, $value);
        }

        // print_r($this->_buffers);

        // construct data objects from buffer
        foreach ($this->_buffers['timer'] as $key => $value) {
            $data[] = $this->_factory->timing($this->getKey($key), $value);
        }
        foreach ($this->_buffers['counter'] as $key => $value) {
            while ($value--) {
                $data[] = $this->_factory->increment($this->getKey($key));
            }
        }
        foreach ($this->_buffers['gauge'] as $key => $value) {
            $data[] = $this->_factory->gauge($this->getKey($key), $value);
        }

        $this->clear();

        // flush data to specified sender
        switch ($this->_configs['sender']) {
        case 'echo':
            $sender = new EchoSender();
            break;
        case 'syslog':
            $sender = new SysLogSender();
            break;
        default:    // udp socket
            $server = $this->_configs['server'];
            $sender = new SocketSender($server['host'], $server['port'], 'udp');
            break;
        }
        $client = new StatsdClient($sender);
        $client->send($data);
    }

    /**
     * construct key
     *  - add prefix
     *  - add tags
     */
    private function getKey($key) {
        static $tagContent = '';
        if (empty($tagContent)) {
            $tagItems = array();
            $tagPrefix = $this->_configs['tagPrefix'];
            foreach ($this->_tags as $name => $value) {
                $tagItems[] = $tagPrefix . $name;
                $tagItems[] = $value;
            }
            $tagContent = implode('.', $tagItems);
        }
        return implode('.', array($this->_prefix, $key, $tagContent));
    }

    /**
     * flush data to server
     *
     * TODO add stats for mta collector
     */
    public static function flush() {
        foreach (self::$_instances as $name => $instance) {
            $instance->send();
        }
    }

}
