/**
 * Created with JetBrains WebStorm.
 * Author: ZhangQuan
 * Date: 13-5-15
 * Time: 下午3:38
 */
;
define([
    'jquery',
    '/affixes/js/basic/storage.js',
    '/affixes/js/basic/ajax.js',
    '/affixes/js/basic/math.js',
    '/affixes/js/basic/validate.js'
],
function($, storage, ajax, math, validate) {

    var create = function(args) {
        var html = '';
        html += '<' + args.tag;
        if(args.id) {
            html += ' id="' + args.id + '"';
        }
        if(args.class) {
            html += ' class="' + args.class + '"';
        }
        if(args.style) {
            html += ' style="' + args.style + '"';
        }
        if(args.attr) {
            for(var i in args.attr) {
                html += ' ' + i + '="' + args.attr[i] + '"';
            }
        }
        html += '>'

        if(args.text) {
            html += args.text;
        }

        if(args.children) {
            for(var c in args.children) {
                html += create(args.children[c]);
            }
        }

        html += '</' + args.tag + '>';

        if(args.textAfter) {
            html += args.textAfter;
        }

        if(args.event) {
            $('body').delegate(args.event.tar, args.event.handler, function(event){
                args.event.func(event, $(this));
            });
        }

        return html;
    };

    var createByType = function(args) {
        var config = {
            'vouch' : createVouch,
            'topBar' : createTopBar,
            'form' : createForm,
            'button' : createButton,
            'statusBar' : createStatusBar
        }

        return config[args.type](args.args, args.param);
    };

    var createVouch = function(args, param) {
        var giftName;
        if('50' == param.giftType) {
            giftName = '哗啦啦通用代金券';
        }else if('10' == param.giftType) {
            giftName = param.groupName;
        }

        var c = {
            tag : 'article',
            class : 'vouch-main ',

            children : [
                {
                    tag : 'div',
                    class : 'vouch-left',
                    children : [
                        {
                            tag : 'h1',
                            class : 'vouch-shopname',
                            text : giftName
                        },
                        {
                            tag : 'p',
                            class : 'vouch-info',
                            children : [
                                {
                                    tag : 'span',
                                    text : '￥'
                                },
                                {
                                    tag : 'strong',
                                    class : 'vouch-price',
                                    text : parseInt(param.giftValue)
                                }
                            ]
                        }
                    ]
                },
                args.right
            ]
        };

        var v = param.giftValue;
        if(0 < v && v <= 10) {
            c.style = 'background-image:url(' + constant.location.IMAGE + 'voucher/0-10';
        }else if(10 < v && v <= 20) {
            c.style = 'background-image:url(' + constant.location.IMAGE + 'voucher/11-20';
        }else if(20 < v && v <= 30) {
            c.style = 'background-image:url(' + constant.location.IMAGE + 'voucher/21-30';
        }else if(30 < v && v <= 40) {
            c.style = 'background-image:url(' + constant.location.IMAGE + 'voucher/31-40';
        }else if(40 < v && v <= 50) {
            c.style = 'background-image:url(' + constant.location.IMAGE + 'voucher/41-50';
        }else if(50 < v && v <= 100) {
            c.style = 'background-image:url(' + constant.location.IMAGE + 'voucher/51-100';
        }else if(100 < v) {
            c.style = 'background-image:url(' + constant.location.IMAGE + 'voucher/101-200';
        }
        if(args.data.s) {
            if(2 == args.data.s) {
                c.style += '_used';
            }else if(3 == args.data.s) {
                c.style = 'background-image:url(' + constant.location.IMAGE + 'voucher/overdue';
            }
        }
        c.style += '@2x.png);';
        c.style += 'background-size:300px 96px;'
        if(args.style) {
            c.style += args.style;
        }

        if(args.class) {
            c.class += args.class;
        }
        if(args.id) {
            c.id = args.id;
        }
        if(args.src) {
            c.src = args.src;
        }
        if(args.event) {
            c.event = args.event;
        }
        if(args.attr) {
            c.attr = args.attr;
        }

        if(args.data) {
            if(args.data.c) {
                c.children[0].children[1].children.push({
                    tag : 'span',
                    class : 'vouch-num',
                    text : args.data.c,
                    textAfter : '张'
                });
            }

            if(args.data.d) {

            }
        }

        text = ''
        if(0 == param.moneyLimitType) {
            text = ' ';
        }else {
            if(1 == param.moneyLimitType) {
                text += '每';
            }
            text += '满' + parseInt(param.moenyLimitValue) + '元可使用';
        }
        c.children[0].children.push({
            tag : 'p',
            class : 'vouch-intro',
            text : text
        });

        return create(c);
    };

    var createTopBar = function(args) {
        var c1 = {
            tag : 'div',
            id : 'topBar',
            class : args.class,
            children : []
        };
        if(args.left) {
            args.left.class += " left btn-inline";
            c1.children.push(args.left);
        }else {
            c1.children.push({
                tag : 'a',
                class : 'btn left font-verysmall color-module click btn-inline',
                id : 'btn-back',
                text : ' ',
                attr : {
                    //href : 'javascript:history.back()',
                    style : 'background:url(' + constant.location.IMAGE + 'back.png) no-repeat 10px 4px;background-size:17px 16px;'
                },
                event : {
                    tar : '#btn-back',
                    handler : constant.event.DEBUG,
                    func : function() {
                        history.back();
                    }
                }
            });
        }
        if(args.center) {
            c1.children.push(args.center);
        }
        if(args.right) {
            args.right.class += " right";
            c1.children.push(args.right);
        }

        if(UA) {
            c1.class = 'dn';
            return create(c1);
        }else {
            var c2 = {
                tag : 'div',
                style : 'height:45px;width:1px;margin:0;'
            };
            return create(c1) + create(c2);
        }
    };

    var createForm = function(args) {
        var c = {
            tag : 'article',
            class : 'section',
            children : [
                {
                    tag : args.tag,
                    class : 'form',
                    event : args.event,
                    children : [
                        {
                            tag : 'div',
                            class : 'text-center module-title',
                            text : args.title,
                            style : args.style + 'margin-bottom:10px;'
                        }
                    ]
                }
            ]
        };

        for(var i in args.children) {
            var l = c.children[0].children.push(args.children[i]);
        }

        return create(c);
    };

    var createButton = function(args) {
        var c = {
            tag : 'div',
            text : args.text ,
            class : 'click '
        };
        if(args.class) {
            c.class += args.class;
        }else {
            c.class += 'btn-block';
        }
        if(args.id) {
            c.id = args.id;
        }
        if(args.src) {
            c.src = args.src;
        }
        if(args.event) {
            c.event = args.event;
        };

        return create(c);
    };

    var createStatusBar = function() {
        var c = {
            tag : 'div',
            id : 'statusBar',
            children : []
        };

        if(storage.getStorage('user')) {
            c.children.push(
                {
                    tag : 'span',
                    text : storage.getStorage('user').userLoginName
                },
                {
                    tag : 'a',
                    id : 'btn-logout',
                    class : 'click',
                    event : {
                        tar : '#btn-logout',
                        handler : constant.event.DEBUG,
                        func : function(e, t) {
                            var sendData = {
                                id : 'system/logout'
                            };

                            var suc = function(data) {
                                if('000' != data.resultcode) {
                                }else {
                                    storage.remove('user');
                                    storage.refresh();
                                }
                            };
                            sendData.suc = suc;

                            ajax.request(sendData);
                        }
                    },
                    text : '退出'
                }
            );
        }else {
            c.children.push(
                {
                    tag : 'a',
                    class : 'btn-relink click',
                    event : {
                        tar : '.btn-relink',
                        handler : constant.event.DEBUG,
                        func : function(e, t) {
                            storage.setStorage({
                                type : 'session',
                                data : {
                                    linkFrom : window.location
                                }
                            });
                        }
                    },
                    attr : {
                        href : constant.location.REGISTER
                    },
                    text : '注册'
                },
                {
                    tag : 'a',
                    class : 'btn-relink click',
                    attr : {
                        href : constant.location.LOGIN
                    },
                    text : '登录'
                }
            );
        }
        c.children.push(
            {
                tag : 'a',
                class : 'fl-right',
                attr : {
                    href : constant.location.WWW
                },
                text : '电脑版'
            });

        if(UA) {
            c.class = 'dn';
        }

        var c2 = {
            tag : 'div',
            id : 'page-footer',
            text : constant.information.COPYRIGHT
        };
        if(UA) {
            c2.class = 'dn';
        }

        return create(c) + create(c2);
    };

    return {
        create : create,
        createByType : createByType
    }
});