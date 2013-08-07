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
 * namespace方法
 * eg：
 * namespace('Bogdan');
 * Bogdan.blogname = 'Bogdan';
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
 * url映射
 * @type {{parse: Function}}
 * 使用方法：页面代号->页面路径
 * eg：将名称为'login'的页面映射到'/system/login.js'
 *     'login' : 'system/'
 */
var $url = {
    rewrite : {
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
            module.src = "/affixes/js/pages/" + $url.rewrite[module.id] + module.id + ".js";
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
require([src], function(func) {
    /*
     * 页面预渲染入口
     * preRender中完成页面载入前的一些判断，如是否登录，是否具有页面许可等，再决定是否调用渲染方法render()
     */

    func.preRender();
});