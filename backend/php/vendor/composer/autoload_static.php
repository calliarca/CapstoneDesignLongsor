<?php

// autoload_static.php @generated by Composer

namespace Composer\Autoload;

class ComposerStaticInit6c2eae1d78e056fc53d74ebbe05e3c60
{
    public static $prefixLengthsPsr4 = array (
        'P' => 
        array (
            'Psr\\Log\\' => 8,
            'PhpMqtt\\Client\\' => 15,
        ),
        'M' => 
        array (
            'MyCLabs\\Enum\\' => 13,
        ),
        'B' => 
        array (
            'Bluerhinos\\' => 11,
        ),
    );

    public static $prefixDirsPsr4 = array (
        'Psr\\Log\\' => 
        array (
            0 => __DIR__ . '/..' . '/psr/log/src',
        ),
        'PhpMqtt\\Client\\' => 
        array (
            0 => __DIR__ . '/..' . '/php-mqtt/client/src',
        ),
        'MyCLabs\\Enum\\' => 
        array (
            0 => __DIR__ . '/..' . '/myclabs/php-enum/src',
        ),
        'Bluerhinos\\' => 
        array (
            0 => __DIR__ . '/..' . '/bluerhinos/phpmqtt',
        ),
    );

    public static $classMap = array (
        'Composer\\InstalledVersions' => __DIR__ . '/..' . '/composer/InstalledVersions.php',
        'Stringable' => __DIR__ . '/..' . '/myclabs/php-enum/stubs/Stringable.php',
    );

    public static function getInitializer(ClassLoader $loader)
    {
        return \Closure::bind(function () use ($loader) {
            $loader->prefixLengthsPsr4 = ComposerStaticInit6c2eae1d78e056fc53d74ebbe05e3c60::$prefixLengthsPsr4;
            $loader->prefixDirsPsr4 = ComposerStaticInit6c2eae1d78e056fc53d74ebbe05e3c60::$prefixDirsPsr4;
            $loader->classMap = ComposerStaticInit6c2eae1d78e056fc53d74ebbe05e3c60::$classMap;

        }, null, ClassLoader::class);
    }
}
