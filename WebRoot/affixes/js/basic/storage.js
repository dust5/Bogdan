/**
 * Created with JetBrains WebStorm.
 * Author: ZhangQuan
 * Date: 13-5-20
 * Time: 下午4:58
 */
;define(
function() {
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

    var remove = function(key) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    };

    var relink = function(link) {
        if(UA) {
            link += '&client_type=' + ct;
        }

        return window.location = link;
    };

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