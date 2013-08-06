/**
 * Created with JetBrains WebStorm.
 * Author: ZhangQuan
 * Date: 13-5-13
 * Time: 下午1:51
 */
;define(['jquery'], function($) {
    var port = {
        'user/gifts/gift' : {
            url : '/service',
            service : 'sysbase_querySysEventGiftDetailInfoById',
            param : ['giftItemID']
        },
        'user/orders/order' : {
            url : '/service',
            service : 'css_order_preparePay',
            param : ['records'],
            version : '1.1'
        },
        'user/orders/pay' : {
            url : '/service',
            service : 'pay_confirmPayMobileService',
            param : ['records'],
            version : '1.1'
        },
        'user/orders/paySuccess' : {
            url : '/service',
            service : 'pay_paySuccess',
            param : ['records'],
            version : '1.1'
        },
        'user/orders/updateOrder' : {
            url : '/service',
            service : 'order_new_submit_order',
            param : ['records'],
            version : '1.1'
        },
        'system/login' : {
            url : '/login'
        },
        'system/register' : {
            url : '/register'
        },
        'system/logout' : {
            url : '/logout'
        },
        'events/event' : {
            url : '/service',
            service : 'sysbase_querySysEventItemsDetailById',
            param : ['eventItemID']
        },
        'system/getMsg' : {
            url : '/service',
            service : 'user_sendMsgForRegister',
            param : ['regMobile']
        },
        'system/checkMobile' : {
            url : '/service',
            service : 'gozap_validateRegMobile',
            param : ['regMobile']
        },
        'system/checkUsername' : {
            url : '/service',
            service : 'gozap_validateUserLoginName',
            param : ['userLoginName']
        },
        'event/getVoucher' : {
            url : '/service',
            service : 'sysbase_eventItemsChangeGiftService',
            param : ['gameWay', 'eventItemID']
        },
        'shop/preferential' : {
            url : '/service',
            service : 'shop_queryPreferentialService',
            param : ['shopID']
        },
        'shop/getTime' : {
            url : '/service',
            service : 'shop_new_getAllTimeAndPromotion',
            param : ['records'],
            version : '1.1'
        },
        'shop/shop' : {
            url : '/service',
            service : 'shop_queryShopFood',
            param : ['shopID']
        },
        'shop/getOrder' : {
            url : '/service',
            service : 'css_order_bulkOrder',
            param : ['properties', 'records'],
            version : '1.1'
        },
        'system/security' : {
            url : '/rsakey'
        }
    }

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