/**
 * Created with JetBrains WebStorm.
 * Author: ZhangQuan
 * Date: 13-5-20
 * Time: 上午10:39
 */

/*
 * 数据提交前的类型和条件检查
 */
;define([
    'jquery'
],
function($) {
    var speed = 300;

    var pop = function(node, poptext) {
        if($('#validate-pop')[0]) {
            var instance = $('#validate-pop');
            instance.find('span').html(poptext)
        }else {
            var html = '';
            html += '<div id="validate-pop" class="dn" dir="' + node.find('input').attr('name') +'"><img src="' + constant.location.IMAGE +'tips_arrow.png"width="6px"height="5px" /><span>' + poptext + '</span></div>'

            $('body').prepend(html);
            instance = $('#validate-pop');
        }

        instance.resetPosition = function(node) {
            instance.attr('dir', node.find('input').attr('name'));
            if(instance.hasClass('dn')) {
                instance.css({'top': node.offset().top + node.height() / 2 + 'px'});
                instance.fadeIn(speed);
                instance.removeClass('dn');
            }else {
                instance.animate({
                    top : node.offset().top + node.height() / 2 + 'px'
                }, speed);
            }
        };

        instance.resetPosition(node);

        return instance;
    }

    var disappear = function(node) {
        var instance = $('#validate-pop');
        if(node) {
            if(node.attr('name') == instance.attr('dir') && !node.hasClass('validate-illegal')) {
                instance.fadeOut(speed);
                instance.addClass('dn');
            }
        }else {
            instance.fadeOut(speed);
            instance.addClass('dn');
        }
    };

    var reg = function(type, data) {
        var t = {
            isNotNull : isNotNull,
            isNumber : isNumber,
            isMobile : isMobile,
            isSame : isSame,
            isLegal : isLegal,
            filtBracket : filtBracket,
            filtN : filtN,
            filtBold : filtBold
        };

        return t[type](data);
    };

    var isNotNull = function(data) {
        var flag = 1;
        for(var i in data) {
            if(!data[i].val()) {
                flag = 0;
                pop(data[i].parent(), '此项不能为空哦');
                break;
            }
        }

        return flag?true:false;
    };

    var isNumber = function(data) {
        var flag = 1;
        for(var i in data) {
            var exp = /\D+/;
            if(exp.exec(data[i].val())) {
                flag = 0;
                pop(data[i].parent(), '不是有效数字！');
                break;
            }
        }

        return flag?true:false;
    };

    var isMobile = function(data) {
        var flag = 1;
        for(var i in data) {
            var exp = /^1[3458]\d{9}$/;
            if(!exp.exec(data[i].val())) {
                flag = 0;
                pop(data[i].parent(), '手机号码不正确');
                break;
            }
        }

        return flag?true:false;
    };

    var isSame = function(data) {
        var flag = 1;
        var m = data[0].val();
        for(var i in data) {
            if(m != data[i].val() && i > 0) {
                flag = 0;
                pop(data[i].parent(), '两次密码输入不一致');
                break;
            }
        }

        return flag?true:false;
    };

    var isLegal = function(data) {
        var flag = 1;

        var text = data.node.val();
        var rule = {
            length : checkLength,
            type : checkType
        };
        /*
            reg('isLegal', {rule: ['length[2,6]','type[username]'], node : $('input')})
         */
        function checkLength(len) {
            var length = len.split(',');
            var textLength = text.match(/[\u4E00-\u9FA5]/g) == null ? text.length : text.length + text.match(/[\u4E00-\u9FA5]/g).length;
            if(0 != length[0]) {
                if(length[0] > textLength) {
                    pop(data.node.parent(), length[0] + '到' + length[1] + '位字母、数字、下划线或其组合');
                    return false;
                }
            }
            if(0 != length[1]) {
                if(length[1] < textLength) {
                    pop(data.node.parent(), length[0] + '到' + length[1] + '位字母、数字、下划线或其组合');
                    return false;
                }
            }
            return true;
        };

        function checkType(type) {
            var flag = 1;
            var exp = {
                normal : /^[\u4E00-\u9FA5A-Za-z0-9_]+$/
            };
            if(!exp[type].exec(text)) {
                flag = 0;
                pop(data.node.parent(), '用户名或密码存在非法字符');
            }

            return flag?true:false;
        };

        for(var i in data.rule) {
            var exp = /(?:([\S]+)\[([\S]+)\])/g;
            while((match = exp.exec(data.rule[i]))!== null) {
                flag = flag && rule[match[1]](match[2]);
            }
        }

        return flag?true:false;
    };

    var filtBracket = function(data) {
        var text = '';
        var flag = 0;

        var reg = /(?:\(([\S]+)\))/g;
        while((match = reg.exec(data))!== null){
            text += match[1] + '&emsp;';
            flag = 1;
        }

        if(1 == flag) {
            return text;
        }else {
            return data;
        }
    };

    var filtN = function(data) {
        var reg = /(\n)/g;

        return data.replace(reg, '<br />');
    };

    var filtBold = function(data) {
        var text = '';

        text = data.replace(/(\$\[)/g, '【');
        return text.replace(/(\]\$)/g, '】');
    }
    
    return {
        reg : reg,
        pop : pop,
        disappear : disappear
    }
});