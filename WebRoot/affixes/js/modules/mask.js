/**
 * Created with JetBrains WebStorm.
 * Author: ZhangQuan
 * Date: 13-5-15
 * Time: 上午10:35
 */
;
define(['jquery'], function($) {
    /*
     *构造函数
     *@type {args:参数列表}
     *生成的浮动层将默认绑定到body节点
     */
    function Mask(args) {
        var maskClass = args.class || '';
        var instance;

        var html = '<div id="mask" style="position:absolute;width:100%;height:100%;z-index: 9999;"><div class="mask ' + maskClass + '"></div></div>';
        $('body').prepend(html);

        instance = $('.mask');

        if(UA) {
            instance.parent().addClass('dn');
        }

        instance.resetPosition = function() {
            instance.css({'margin-top': '-' + ((instance.height() / 2) + 90) + 'px',
                'margin-left' : '-' + (instance.width() / 2 + 20) + 'px'});
        }

        instance.changeText = function(text) {
            instance.find('span').html(text);
            instance.resetPosition();
            setTimeout(function() {
                instance.fadeOut(1000);
                setTimeout(function() {
                    instance.parent().remove();
                }, 1200);
            }, 3000);
        }

        instance.changeImage = function(data) {
            instance.find('div').css({
                'background-image' : 'url(' + data.src + ')',
                'background-repeat' : 'no-repeat',
                'width' : data.width + 'px',
                'height' : data.height + 'px',
                'background-size' : '100% 100%'
            });
            instance.resetPosition();
            setTimeout(function() {
                instance.fadeOut(1000);
                setTimeout(function() {
                    instance.parent().remove();
                }, 1200);
            }, 3000);
            clearInterval(instance.int);
        }

        return instance;
    }

    var reg = function(args) {
        var mask = new Mask(args);
        var html = '<span>' + args.text + '</span>';
        if(args.img) {
            html += '<div style="background:url(' + args.img + ') no-repeat;background-size:100% 200%;background-position:0px 0px;width:' + args.width + 'px;height:' + args.height + 'px"></div>';
        }
        mask.append(html);

        mask.resetPosition();

        /*
         *超时提示
         */
        if(args.imgLength > 1) {
            var i = 0;
            var count = 0;
            mask.int = setInterval(function() {
                mask.find('div').css('background-position',  '0px ' + args.height * i * -1 + 'px');
                if(args.imgLength == ++ i) {
                    i = 0;
                }

                count += args.time;
                if(count > 20000) {
                    mask.changeText('哎呦～～网络好像有问题哦');
                    mask.changeImage({
                        src : '/affixes/images/failure.png',
                        width : 55,
                        height : 41
                    });
                    clearInterval(mask.int);
                }
            }, args.time);
        }else {
            var i = 0;
            setTimeout(function() {
                mask.fadeOut(1000, function() {
                    mask.parent().remove();
                });
            }, 3000);
        }

        return mask;
    };

    return {
        reg : reg
    }
});