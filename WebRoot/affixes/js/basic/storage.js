/**
 * Created with JetBrains WebStorm.
 * Author: ZhangQuan
 * Date: 13-5-20
 * Time: 下午4:58
 */

/*
 * 浏览器缓存方法
 */
;define(
function() {

    /*
     * 存
     * args = {
     *  String type,    //保存类型
     *  JSON data,      //数据
     * }
     */
    var setStorage = function (args) {
        if('local' == args.type) {
            for(var i in args.data) {
                localStorage.setItem(i, JSON.stringify(args.data[i]));
            }
        }else {
            for(var i in args.data) {
                sessionStorage.setItem(i, JSON.stringify(args.data[i]));
            }
        }
    };

    /*
     * 取
     * String key,    //键名
     * String type,   //保存类型
     */
    var getStorage = function (key, type) {
        if('local' == type || !type) {
            if(localStorage.getItem(key)) {
                try {
                    return JSON.parse(localStorage.getItem(key));
                }catch(e) {
                    return localStorage.getItem(key);
                }
            }else
                return null;
        }else if('session' == type) {
            if(sessionStorage.getItem(key)) {
                try {
                    return JSON.parse(sessionStorage.getItem(key));
                }catch(e) {
                    return sessionStorage.getItem(key);
                }
            }else
                return null;
        }
    };

    /*
     * 清除
     * String key,    //键名
     * String type,   //保存类型
     */
    var remove = function(key, type) {
        type = type || 'local';
        if('local' == type) {
            localStorage.removeItem(key);
        }else {
            sessionStorage.removeItem(key);
        }
    };

    /*
     * 页面转向
     * String link,    //转向地址，可以是路径，也可以是页面代号
     */
    var relink = function(link) {
        return window.location = link;
    };

    /*
     * 页面刷新
     */
    var refresh = function() {
        return location.reload();
    };
    
    return {
        setStorage : setStorage,
        getStorage : getStorage,
        remove : remove,
        relink : relink,
        refresh : refresh
    }
});