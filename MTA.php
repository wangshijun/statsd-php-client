<?php

$loader = require_once __DIR__ . "/vendor/autoload.php";
$loader->add('Liuggio\\', __DIR__);

use Liuggio\StatsdClient\StatsdClient,
    Liuggio\StatsdClient\Factory\StatsdDataFactory,
    Liuggio\StatsdClient\Sender\EchoSender,
    Liuggio\StatsdClient\Sender\SyslogSender,
    Liuggio\StatsdClient\Sender\SocketSender;

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
     * has header sent
     */
    private $_hasHeaderSent = false;

    /**
     * config
     */
    private $_configs = array(
        'sender' => 'browser',
        'server' => array('host' => '127.0.0.1', 'port' => 8125),
        'beacon' => 'http://frep.meituan.net/_.gif',
        'jspath' => 'mta.js',
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
    public static function getInstance($name, $configs = array()) {
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
            if (in_array($value, array('socket', 'syslog', 'echo', 'browser'))) {
            } else {
                trigger_error('unknown data sender (socket, syslog, echo, browser)', E_USER_ERROR);
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
     * get all tags
     */
    public function tags() {
        return $this->_tags;
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
        if ($this->_configs['sender'] === 'browser') {
            $this->_sendFromBrowser();
        } else {
            $this->_sendFromServer();
        }
    }

    /**
     * output header js
     * should be called before send
     */
    public function outputHeaderJS() {
        if ($this->_hasHeaderSent) {
            return;
        }
        echo "
        <script>
            (function (w, mta) {
                w['MeituanAnalyticsObject'] = mta;
                w[mta] = w[mta] || function () {
                    (w[mta].q = w[mta].q || []).push(arguments)
                };
            })(window, 'mta');
        </script>";
        $this->_hasHeaderSent = true;
    }

    /**
     * send data via beacon in browser
     */
    private function _sendFromBrowser() {
        $configs = $this->_configs;
        $tags = $this->_tags;

        // TODO trigger error here
        if (empty($configs['jspath']) || empty($configs['beacon'])) {
            return;
        }

        if (!$this->_hasHeaderSent) {
            $this->outputHeaderJS();
        }

        echo "
        <script>
            (function() {
                if (!mta) { return; }
                mta('create', '{$this->_prefix}');

                mta('config', 'beaconImage', '{$configs['beacon']}');
                mta('config', 'sampleRate', '{$configs['sampleRate']}');";

        foreach ($tags as $tagk => $tagv) {
            echo "
                mta('tag', '{$tagk}', '{$tagv}');";
        }

        foreach ($this->_buffers as $key => $metrics) {
            if (!empty($metrics)) {
                $metrics = json_encode($metrics);
                echo "
                mta('send', 'server', {$metrics}, '{$key}');";
            }
        }

        echo "
                mta('send', 'page');
                mta('send', 'network');
                mta('send', 'resource');

                if (document.readyState === 'complete') {
                    injectMtaJS();
                } else {
                    var oldonload = window.onload;
                    window.onload = function () {
                        injectMtaJS();
                        if (oldonload) {
                            oldonload();
                        }
                    };
                }
                function injectMtaJS() {
                    var script = document.createElement('script');
                    script.type = 'text/javascript';
                    script.async = true;
                    script.src = '{$configs['jspath']}';
                    var head = document.getElementsByTagName('script')[0];
                    head.parentNode.insertBefore(script, head);
                }
            })();
        </script>";
    }

    /**
     * send data via socket from server side
     */
    private function _sendFromServer() {
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
            $data[] = $this->_factory->timing($this->_getKey($key), $value);
        }
        foreach ($this->_buffers['counter'] as $key => $value) {
            while ($value--) {
                $data[] = $this->_factory->increment($this->_getKey($key));
            }
        }
        foreach ($this->_buffers['gauge'] as $key => $value) {
            $data[] = $this->_factory->gauge($this->_getKey($key), $value);
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
        case 'socket':    // udp socket
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
    private function _getKey($key) {
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
