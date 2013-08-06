/**
 * Created with JetBrains WebStorm.
 * Author: ZhangQuan
 * Date: 13-5-10
 * Time: 下午1:02
 */

/**
 *全局JS入口，流程如下：
 * 1.UA嗅探，设置全局变量
 * 2.解析URL，抓取页面JS
 **/

/*
 * 常量
 */
var constant = {
    location : {
    },
    information : {
        COPYRIGHT : 'Copyright © 2013 bogdan.com'
    },
    encryption : {
    },
    event : {
    }
}

/**
 * require.config
 */
require.config({
    baseUrl : '/affixes/js/libs',
    paths : {
        //配置lib路径
        jquery: 'jQuery/jquery-1.10.1'
    }
});

/**
 * namespace
 */
var namespace = function() {
        var a = arguments, o = null, i, j, d, rt;
        for (i = 0; i < a.length; ++i) {
            d = a[i].split(".");
            rt = d[0];
            eval('if (typeof ' + rt + ' == "undefined"){' + rt + ' = {};} o = ' + rt + ';');
            for (j = 1; j < d.length; ++j) {
                o[d[j]] = o[d[j]] || {};
                o = o[d[j]];
            }
        }
}

/**
 * url解析
 * @type {{parse: Function}}
 */
var $url = {
    rewrite : {
        'gift' : 'pages/user/gifts/',
        'order' : 'pages/user/orders/',
        'paySuccess' : 'pages/user/orders/',
        'information' : 'pages/user/orders/',
        'preferential' : 'pages/shop/',
        'shop' : 'pages/shop/',
        'login' : 'pages/system/',
        'register' : 'pages/system/',
        'msgcode' : 'pages/system/',
        'error' : 'pages/system/',
        'event' : 'pages/events/',
        'download' : 'pages/system/',
        'event_getOK' : 'pages/events/'
    },

    prt: window.location,
    parse: function() {
        var module = {};
        var path = $url.prt.pathname.substr(1);
        var m,n;
        if(path) {
            for(var i = path.length; i >= 0; i --) {
                if("." == path[i]) {
                    n = i;
                }
                if("/" == path[i]) {
                    m = i;
                    n = n || path.length;
                    break;
                }
            };
            module.id = path.substring(m + 1, n);
            module.src = "/affixes/js/" + $url.rewrite[module.id] + module.id + ".js";
        }else {
            //连主页时调用
            module.src = "/affixes/js/pages/index.js";
            module.id = "index";
        }
        return module;
    }
};

var module = $url.parse();
var func = module.id;
var src = module.src;
require([src, 'jquery', '/affixes/js/basic/math.js'], function(func, $, math) {

    if(func.preRender) {
        func.preRender();
    }

    //页面渲染入口
    func.render();
});