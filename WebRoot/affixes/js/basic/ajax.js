/**
 * Created with JetBrains WebStorm.
 * Author: ZhangQuan
 * Date: 13-5-13
 * Time: 下午1:51
 */

/*
 * ajax核心方法，将服务代号映射至对应服务，拼接发送数据并完成ajax请求，实现回调函数。
 */
;define(['jquery'], function($) {
    /*
     * 服务映射，
     * id -> {
     *  String url,        //服务路径
     *  String service,    //服务名称
     *  Array param        //服务接受的参数名称
     *  [optional] other   //其他自定义的参数
     * }
     *
     */
    var port = {
    }

    /*
     * 抓取get请求附带的参数
     * eg:
     * bogdan.com/article_11?d=20130807&i=132
     * ajax.getArgs().d; //d = '20130807'
     * ajax.getArgs().i  //i = '132'
     */
    function getArgs(){
        var args = {};
        var match = null;
        var search = decodeURIComponent(location.search.substring(1));
        var reg = /(?:([^&]+)=([^&]+))/g;
        while((match = reg.exec(search))!==null){
            args[match[1]] = match[2];
        }
        return args;
    }

    /*
     * 发起ajax请求
     * args = {
     *  String id,                //服务代号
     *  [optional] String type,   //服务类型
     *  JSON data,                //服务需要的数据
     *  function suc,             //请求成功时的回调函数
     * }
     */
    function request(args) {
        //todo:error handlers
        if(args.id) {
            var p = port[args.id];
            if('ajax' == args.type) {
                var pdata = {
                    'service' : p.service,
                    'data' : {}
                };
                for(var i in p.param) {
                    var j = p.param[i];
                    pdata.data[j] = args.data[j];
                }
                $.ajax({
                    url : p.url,
                    type : 'POST',
                    data : {
                        pdata : JSON.stringify(pdata),
                        version : p.version || '1.0'
                    }
                }).done(function(data) {
                        args.suc(data);
                    }).fail(args.fail);
            }else {
                $.ajax({
                url : p.url,
                type : 'POST',
                data : args.data || null
                }).done(function(data) {
                    args.suc(data);
                    }).fail(args.fail);
            }
        }
    }

    return {
        getArgs : getArgs,
        request : request
    }
});