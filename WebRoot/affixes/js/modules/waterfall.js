/**
 * Created with JetBrains WebStorm.
 * Author: ZhangQuan
 * Date: 13-7-2
 * Time: 上午10:43
 */
;define([
    'jquery',
    '/affixes/js/modules/content.js',
    '/affixes/js/basic/storage.js',
    '/affixes/js/basic/validate.js',
    '/affixes/js/basic/math.js',
    '/affixes/js/modules/mask.js',
    '/affixes/js/basic/ajax.js'
    
],
function($, content, storage, validate, math, mask, ajax) {
    /*
     args: {
     data:{
     sum:菜品总数
     records:菜品数组
     }
     initHeight:第一次刷新时的高度
     eachHeight:每次刷新的高度
     }
     */
    var render = function (args) {
        var order;
        if(storage.getStorage('order', 'local') && storage.getStorage('order', 'local').properties.shopID == args.shopID) {
            order = storage.getStorage('order', 'local');
        }else {
            order = {
                properties : {
                    shopID : args.shopID
                },
                records : []
            };

            storage.setStorage({
                data : {
                    order : order
                },
                type : 'local'
            });
        }

        //转动屏幕时重写
        $(window).delegate(window, 'orientationchange', function(){
            /*$(window).undelegate(window, 'orientationchange');
             $('#container').html('');
             waterFall(args);*/
            location.reload();
        });

        //计算列数
        var ww = $(window).width(), pw, p;
        if(ww >= 320 && ww <= 480) {
            p = 2;
        }else if(ww > 480 && ww <= 800) {
            p = 3;
        }else if(ww > 800) {
            p = 5;
        }
        pw = Math.floor(($('body').width() - 10 - p * 10 ) / p);
        var style = 'width:' + pw + 'px;background-size:' + pw + 'px ' + Math.floor(pw / 305 * 383) + 'px;';
        var mar = ($('body').width() - 20 - (pw + 10) * p) / 2;

        //计算分类数目
        var series = [], _food = [];
        var food = args.data.records;
        for(var i = 0; i < food.length; i ++) {
            var ctg = {};
            if(i == 0 || food[i].foodCategoryID != food[i - 1].foodCategoryID) {
                ctg._id = food[i].foodCategoryID;
                ctg._name = food[i].foodCategoryName;
                ctg._index = food[i].foodCategorySortIndex;
                ctg._count = food[i].foodCategoryCount;
                series.push(ctg);
            }

            if(i > 0 && food[i].foodID == food[i - 1].foodID) {
                if(!food[i - 1].list) {
                    food[i - 1].list = [];
                    food[i - 1].list.push({
                        itemID : food[i - 1].itemID,
                        unit : food[i - 1].unit,
                        price : food[i - 1].price,
                        origin : food[i - 1]
                    });
                }
                food[i - 1].list.push({
                    itemID : food[i].itemID,
                    unit : food[i].unit,
                    price : food[i].price,
                    origin : food[i]
                });
                food.splice(i, 1);
                i --;
                series[series.length - 1]._count --;
            }
        }

        var initHeight = 2000 + series.length * 56;
        var comHeight = 1500;

        //把分类信息加载到#container中
        var c = {
            tag : 'div',
            id : 'menu',
            children : [],
            event : {
                tar : '.food, .food-list, .food-unfold',
                handler : constant.event.DEBUG,
                func : function(e, t) {
                    if($('#leftBar').css('left') == '0px') return;
                    if(t.hasClass('food-unfold')){
                        t.parents('.food').find('.food-slide').slideUp();
                        t.parents('.food').find('.food-info').addClass('food-pack-up');
                        t.parents('.food').css('margin-bottom', '10px');
                        setTimeout(function() {
                            t.addClass('dn');
                        }, 10);
                    }else {
                        Food.add(t);
                        if(!storage.getStorage('order', 'local').properties.timeID) {
                            $('.order-info').trigger(constant.event.DEBUG);
                        }
                    }
                }
            }
        };
        for(var i in series) {
            var chd = [];
            for(var j = 1; j <= p; j ++) {
                chd.push({
                    tag : 'div',
                    class : 'column',
                    id : 'column-' + j
                });
            }

            c.children.push({
                tag : 'div',
                id : 'series-' + series[i]._id,
                attr : {
                    'series-index' : i
                },
                //style : 'margin-left:' + mar + 'px;',
                children : [
                    {
                        tag : 'span',
                        text : series[i]._name
                    },
                    {
                        tag : 'div',
                        class : 'series',
                        children : chd
                    }
                ]
            });
        }

        c.children.push({
            tag : 'div',
            class : 'cb'
        });

        var html = content.create(c);
        $('#container').append(html);

        //同步加载分类的左滑动门
        var text = '<ul id="seriesList">';
        for(var i in series) {
            text += '<li class="click" series-id="' + series[i]._id + '" series-index="' + i + '">' + series[i]._name + '</li>';
        }
        text += '</ul>';

        var currentSeries;
        var left = $(window).width()- 60;
        html = content.create({
            tag : 'div',
            id : 'leftBar',
            style : 'left:-' + left + 'px;',
            event : {
                tar : '#container, .series-list',
                handler : constant.event.DEBUG,
                func : function(e, t) {
                    if('container' == t.attr('id')) {
                        if($('#leftBar').css('left') == '0px') {
                            $('#leftBar').animate({'left' : - left + 'px'}, 500);
                        }
                        e.preventDefault();
                    }else {
                        setTimeout(function() {
                            if($('#leftBar').css('left') != '0px') {
                                $('#leftBar').animate({'left' : 0}, 500);
                            }else {
                                $('#leftBar').animate({'left' : - left + 'px'}, 500);
                            }
                        }, 10);
                    }
                }
            },
            children : [
                {
                    tag : 'section',
                    style : 'width:' + left + 'px;height:' + $(window).height() + 'px;',
                    text : text,
                    event : {
                        tar : '#seriesList li',
                        handler : constant.event.DEBUG + ' touchstart touchmove',
                        func : function(e, t) {
                            if('touchstart' == e.type) {
                                t.addClass('active');
                            }
                            if('touchmove' == e.type) {
                                t.removeClass('active');
                            }
                            if(constant.event.DEBUG == e.type) {
                                t.removeClass('active');

                                $('#leftBar').animate({'left' : - left + 'px'}, 500);

                                if(!_flag) {
                                    _flag = 1;
                                    currentSeries = t.attr('series-index');
                                    if($('#series-' + t.attr('series-id')).offset().top - 56 + $(window).height() > $('body').height()) {
                                        $('body').scrollTop($('body').height() - $(window).height() - 1);
                                    }else {
                                        $('body').scrollTop($('#series-' + t.attr('series-id')).offset().top - 56);
                                    }
                                    ct = comWaterFall(ct, t.attr('series-id'));
                                    setTimeout(function() {
                                        _flag = 0;
                                    }, 1000);
                                }
                            }
                            /*var int = setInterval(function() {
                             if($('body').scrollTop() != $('#series-' + t.attr('series-id')).offset().top - 46) {
                             $('#leftBar-label').addClass('dn');
                             //$('body').animate({'scrollTop' : $('#series-' + t.attr('series-id')).offset().top - 46}, 500);
                             $('body').scrollTop($('#series-' + t.attr('series-id')).offset().top - 46);
                             if($('body').height() - $('body').scrollTop() <= $(window).height()) {
                             clearInterval(int);
                             $('#leftBar-label').removeClass('dn');
                             }
                             }else {
                             clearInterval(int);
                             $('#leftBar-label').removeClass('dn');
                             }
                             }, 50)*/
                        }
                    }
                }/*,
                {
                    tag : 'div',
                    id : 'leftBar-label',
                    class : 'click',
                    text : '类别',
                    event : {
                        tar : '#leftBar-label, #container',
                        handler : constant.event.DEBUG,
                        func : function(e, t) {
                            if('leftBar-label' == t.attr('id')) {
                                setTimeout(function() {
                                    if($('#leftBar').css('left') != '0px') {
                                        $('#leftBar').animate({'left' : 0}, 500);
                                    }else {
                                        $('#leftBar').animate({'left' : - left + 'px'}, 500);
                                    }
                                }, 10);
                            }else {
                                if($('#leftBar').css('left') == '0px') {
                                    $('#leftBar').animate({'left' : - left + 'px'}, 500);
                                }
                                e.preventDefault();
                            }
                        }
                    }
                }*/
            ]
        });

        //加载右滑动门，记录已点菜品
        text = '';
        for(var i in series) {
            text += '<ul class="dn" series-id="' + series[i]._id + '" series-index="' + i + '"><span>' + series[i]._name + '</span></ul>';
        }

        html += content.create({
            tag : 'div',
            id : 'rightBar',
            style : 'right:-' + (left + 60) + 'px;height:' + ($(window).height()) + 'px;',
            children : [
                {
                    tag : 'section',
                    class : 'top',
                    children : [
                        {
                            tag : 'div',
                            class : 'btn font-verysmall color-module left click',
                            text : '继续点菜',
                            event : {
                                tar : '#rightBar .left, .submitOrder',
                                handler : constant.event.DEBUG,
                                func : function(e, t) {
                                    if(t.hasClass('left')) {
                                        $('#menu').removeClass('dn');
                                        $('#rightBar').animate({
                                            right : '-'  + (left + 60) + 'px'
                                        }, 500);
                                    }
                                    if(t.hasClass('submitOrder')) {
                                        var order = storage.getStorage('order', 'local');
                                        date = new Date();
                                        var cTime = parseInt(date.getHours() + (date.getMinutes() >= 10 ? date.getMinutes() : '0' + date.getMinutes()));
                                        if((order.properties.dateValue.substr(5, 2) == date.getDate() && cTime > order.properties.timeID) || order.properties.dateValue.substr(5, 2) != date.getDate()) {
                                            mask.reg({
                                                text : constant.alert.LOADING,
                                                img : constant.location.IMAGE + 'loading_bg.png',
                                                imgLength : 2,
                                                width : 47,
                                                height : 39,
                                                time : 300
                                            });

                                            namespace('GLOBAL');
                                            GLOBAL.mask = $('#mask');

                                            var sendData = {
                                                id : 'shop/getOrder',
                                                type : 'ajax',
                                                data : order
                                            };

                                            var suc = function(data) {
                                                namespace('GLOBAL');
                                                GLOBAL.mask.remove();

                                                order.properties.orderKey = data.data.properties.orderKey;
                                                order.properties.orderID = data.data.properties.orderID;
                                                order.properties.foodAmount = data.data.properties.foodAmount;
                                                order.properties.foodCount = data.data.properties.foodCount;
                                                storage.setStorage({
                                                    data : {
                                                        order : order
                                                    },
                                                    type : 'local'
                                                });

                                                if('BO20002' == data.resultcode) {
                                                    alert(validate.reg('filtBold', data.data.records[0].errorMsg));
                                                }else if('000' == data.resultcode) {
                                                    if('0' == data.data.properties.userID) {
                                                        storage.setStorage({
                                                            data : {
                                                                linkFrom : {
                                                                    href : '/order.htm?i=' + order.properties.orderKey
                                                                }
                                                            },
                                                            type : 'session'
                                                        });

                                                        storage.relink(constant.location.LOGIN);
                                                    }else {
                                                        storage.relink('/order.htm?i=' + order.properties.orderKey);
                                                    }
                                                }
                                            };

                                            sendData.suc = suc;
                                            ajax.request(sendData);
                                        }else {
                                            alert('选择的时段已过，请重新选择！');
                                            Calendar.changeDuring();
                                            Calendar.changeTime();
                                            $('#topBar .left').trigger(constant.event.DEBUG);
                                        }
                                    }
                                }
                            }
                        },
                        {
                            tag : 'div',
                            class : 'btn btn-inline bar-title',
                            text : '总计:&nbsp;￥<span>0</span>'
                        },
                        {
                            tag : 'div',
                            class : 'btn font-verysmall color-module click right submitOrder',
                            text : '去结算'
                        }
                    ]
                },
                {
                    tag : 'section',
                    id : 'orderList',
                    style : 'width:' + (left + 40) + 'px;max-height:' + ($(window).height() - 128) + 'px;',
                    text : text
                },
                {
                    tag : 'div',
                    class : 'btn-block click submitOrder',
                    style : 'margin:10px;',
                    text : '去结算'
                }
            ],
            event : {
                tar : '#rightBar .minus, #rightBar .sum,#rightBar .plus',
                handler : constant.event.DEBUG,
                func : function(e, t) {
                    var sum = parseInt(t.parent().find('.sum').html());
                    if(t.hasClass('plus')) {
                        Order.add(t.prev());
                    }
                    if(t.hasClass('minus')) {
                        if(!Order.minus(t.next())) {
                            if(1 == t.parents('ul').find('li').length) {
                                t.parents('ul').addClass('dn');
                            }

                            t.parents('li').remove();

                            Purcar.minus();

                            if(0 == Order.that.find('ul[class!="dn"]').length) {
                                $('#rightBar .left').trigger(constant.event.DEBUG);
                            }
                        }
                    }
                }
            }
        });

        //加载时间面板
        var week = ['日', '一', '二', '三', '四', '五', '六'];
        var w = Math.floor($(window).width() / 7);
        var date = new Date();
        var month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if((date.getFullYear() % 100 == 0 && date.getFullYear() % 400 == 0) || (date.getFullYear() % 100 != 0 && date.getFullYear() % 4 == 0)) {
            month[1] = 29;
        }
        var calendarHead = '';
        for(var i in week) {
            calendarHead += content.create({
                tag : 'span',
                style : 'width:' + w + 'px;',
                class : 'disable',
                text : week[i]
            });
        }

        var Calendar = {
            that : $('#calendar'),
            tr : ['', '', ''],
            choose : null,
            defaltShopTime : [
                {
                    endTime : '1500',
                    isActive : '1',
                    startTime : '1100',
                    timeName : '午餐',
                    timeID : '1'
                },
                {
                    endTime : '2100',
                    isActive : '1',
                    startTime : '1700',
                    timeName : '晚餐',
                    timeID : '3'
                }
            ],
            defaltShopOrderParem : [
                {
                    revBeforTime : 0,
                    reserveTableInfo : null
                }
            ],
            defaltShopPromotion : [],
            add : function(sum, cls, text, month, year) {
                Calendar.tr[sum - 1] += content.create({
                    tag : 'div',
                    class : 'calendar-td click ' + cls,
                    style : 'width:' + (w - 1) + 'px;height:' + (w - 1) + 'px;line-height:' + (w - 1) + 'px;',
                    attr : {
                        year : year || date.getFullYear(),
                        month : month || date.getMonth() + 1,
                        day : text
                    },
                    text : text
                });
            },
            changeInfo : function() {
                $('#timeBar .order-info span').html('&nbsp;&nbsp;' + $('#calendar .choose').attr('year') + '.' + $('#calendar .choose').attr('month') + '.' + $('#calendar .choose').attr('day') + '&nbsp;&nbsp;&nbsp;&nbsp;' + $('#timeBar .order-time').find('option:selected').html() + '&nbsp;&nbsp;&nbsp;&nbsp;' + $('#timeBar .order-sum').val() + '人');
            },
            changeTime : function(d) {
                d = d || date.getDate();
                var text = '', flag = false;
                var arrST = args.time.shopTime ? args.time.shopTime.records : Calendar.defaltShopTime;
                if(5 == arrST.length && 1 == arrST[arrST.length - 1].isActive) {
                    var m = arrST.pop();
                    arrST.unshift({
                        endTime : m.endTime,
                        isActive : '1',
                        startTime : '0',
                        timeName : '夜宵',
                        timeID : '5.2'
                    });
                    arrST.push({
                        endTime : '2400',
                        isActive : '1',
                        startTime : m.startTime,
                        timeName : '夜宵',
                        timeID : '5.1'
                    });
                }
                var arrSOP = args.time.shopOrderParams ? args.time.shopOrderParams.records : Calendar.defaltShopOrderParem;
                for(var item in arrST) {
                    if(d == date.getDate()) {
                        var nTime;
                        nTime = Math.floor((cTime % 100 + parseInt(arrSOP[0].revBeforTime)) % 100 / 60) * 100 + cTime + parseInt(arrSOP[0].revBeforTime) % 100 % 60;
                        if(nTime <= arrST[item].endTime && 1 == arrST[item].isActive) {
                            for(var i = parseInt((nTime >= arrST[item].startTime ? nTime : arrST[item].startTime)); i < arrST[item].endTime;) {
                                var m;
                                if(i == nTime) {
                                    m = i - i % 10 + 10;
                                }else {
                                    m = i - i % 10;
                                }
                                i = m + 10;
                                if(m % 100 >= 60) {
                                    continue;
                                }else {
                                    var n = String(m);
                                    if(m < 1000 && m >= 100) {
                                        n = '0' + n;
                                    }else if(m < 100 && m > 0) {
                                        n = '00' + n;
                                    }else if(0 == m) {
                                        n = '000' + n;
                                    }
                                    n = n.substr(0, 2) + ':' + n.substr(2, 2);

                                    text += content.create({
                                        tag : 'option',
                                        attr : {
                                            value : m
                                        },
                                        text : n
                                    });
                                }
                            }
                            flag = true;
                        }
                    }else {
                        if(1 == arrST[item].isActive) {
                            for(var i = parseInt(arrST[item].startTime); i < arrST[item].endTime;) {
                                var m = i - i % 10;
                                i = m + 10;
                                if(m % 100 >= 60) continue;
                                else {
                                    var n = String(m);
                                    if(m < 1000 && m >= 100) {
                                        n = '0' + n;
                                    }else if(m < 100 && m > 0) {
                                        n = '00' + n;
                                    }else if(0 == m) {
                                        n = '000' + n;
                                    }
                                    n = n.substr(0, 2) + ':' + n.substr(2, 2);

                                    text += content.create({
                                        tag : 'option',
                                        attr : {
                                            value : m
                                        },
                                        text : n
                                    });
                                }
                            }
                            flag = true;
                        }
                    }
                }
                if(!flag) {
                    text = '<option>打烊了</option>';
                }

                return text;
            },
            changeDuring : function(d) {
                d = d || date.getDate();
                var text = '', flag = false;
                var arrST = args.time.shopTime ? args.time.shopTime.records : Calendar.defaltShopTime;
                var arrSOP = args.time.shopOrderParams ? args.time.shopOrderParams.records : Calendar.defaltShopOrderParem;
                if(5 == arrST.length && 1 == arrST[arrST.length - 1].isActive) {
                    var m = arrST.pop();
                    arrST.unshift({
                        endTime : m.endTime,
                        isActive : '1',
                        startTime : '0',
                        timeName : '夜宵（早）',
                        timeID : '5.2'
                    });
                    arrST.push({
                        endTime : '2400',
                        isActive : '1',
                        startTime : m.startTime,
                        timeName : '夜宵（晚）',
                        timeID : '5.1'
                    });
                }
                if(d == date.getDate()) {
                    for(var item in arrST) {
                        if(cTime <= arrST[item].endTime && '1' == arrST[item].isActive) {
                            var c = {
                                tag : 'option',
                                attr : {
                                    'start-time' : arrST[item].startTime,
                                    'end-time' : arrST[item].endTime,
                                    value : arrST[item].timeID
                                },
                                text : arrST[item].timeName
                            };

                            text += content.create(c);
                            flag = true;
                        }
                    }
                }else {
                    for(var item in arrST) {
                        if('1' == arrST[item].isActive) {
                            var c = {
                                tag : 'option',
                                attr : {
                                    'start-time' : arrST[item].startTime,
                                    'end-time' : arrST[item].endTime,
                                    value : arrST[item].timeID
                                },
                                text : arrST[item].timeName
                            };

                            text += content.create(c);
                            flag = true;
                        }
                    }
                }
                if(!flag) {
                    text = '<option>打烊了</option>';
                }

                return text;
            }
        };

        var lMonth = ((0 == date.getMonth()) ? 11 : date.getMonth() - 1);
        var nMonth = ((11 == date.getMonth()) ? 1 : date.getMonth() + 1);
        var lYear = (0 == lMonth) ? date.getFullYear() - 1 : date.getFullYear();
        var nYear = (11 == nMonth) ? date.getFullYear() + 1 : date.getFullYear();
        for(var i = 0; i < 7; i ++) {
            if(i < date.getDay()) {
                if(date.getDate() - (date.getDay() - i) > 0) {
                    Calendar.add(1, 'disable', date.getDate()- (date.getDay() - i))
                }else {
                    Calendar.add(1, 'disable', date.getDate() + month[lMonth] - (date.getDay() - i), lMonth + 1, lYear)
                }

                if(date.getDate() + 7 - (date.getDay() - i) <= month[date.getMonth()]) {
                    Calendar.add(2, 'able', date.getDate() + 7 - (date.getDay() - i))
                }else {
                    Calendar.add(2, 'able', date.getDate() + 7 - (date.getDay() - i) - month[date.getMonth()], nMonth + 1, nYear)
                }

                if(date.getDate() + 14 - (date.getDay() - i) <= month[date.getMonth()]) {
                    Calendar.add(3, 'able', date.getDate() + 14 - (date.getDay() - i))
                }else {
                    Calendar.add(3, 'able', date.getDate() + 14 - (date.getDay() - i) - month[date.getMonth()],  nMonth + 1, nYear)
                }
            }else if(i == date.getDay()) {
                Calendar.add(1, 'choose current able', date.getDate());

                if(date.getDate() + 7 - (date.getDay() - i) <= month[date.getMonth()]) {
                    Calendar.add(2, 'able', date.getDate() + 7 - (date.getDay() - i))
                }else {
                    Calendar.add(2, 'able', date.getDate() + 7 - (date.getDay() - i) - month[date.getMonth()],  nMonth + 1, nYear)
                }

                if(date.getDate() + 14 - (date.getDay() - i) <= month[date.getMonth()]) {
                    Calendar.add(3, 'disable', date.getDate() + 14 - (date.getDay() - i))
                }else {
                    Calendar.add(3, 'disable', date.getDate() + 14 - (date.getDay() - i) - month[date.getMonth()],  nMonth + 1, nYear)
                }
            }else {
                if(date.getDate() - (date.getDay() - i) <= month[date.getMonth()]) {
                    Calendar.add(1, 'able', date.getDate() - (date.getDay() - i))
                }else {
                    Calendar.add(1, 'able', date.getDate() - (date.getDay() - i) - month[date.getMonth()],  nMonth + 1, nYear)
                }

                if(date.getDate() + 7 - (date.getDay() - i) <= month[date.getMonth()]) {
                    Calendar.add(2, 'able', date.getDate() + 7 - (date.getDay() - i))
                }else {
                    Calendar.add(2, 'able', date.getDate() + 7 - (date.getDay() - i) - month[date.getMonth()],  nMonth + 1, nYear)
                }

                if(date.getDate() + 14 - (date.getDay() - i) <= month[date.getMonth()]) {
                    Calendar.add(3, 'disable', date.getDate() + 14 - (date.getDay() - i))
                }else {
                    Calendar.add(3, 'disable', date.getDate() + 14 - (date.getDay() - i) - month[date.getMonth()],  nMonth + 1, nYear)
                }
            }
        }

        var cTime = parseInt(date.getHours() + '' + (date.getMinutes() >= 10 ? date.getMinutes() : '0' + date.getMinutes()));
        var cDate = parseInt(date.getFullYear() + '' + (date.getMonth() >= 9 ? date.getMonth() + 1 : '0' + (date.getMonth() + 1)) + (date.getDate() >= 9 ? date.getDate() + 1 : '0' + (date.getDate() + 1)));

        var orderSum = '';
        for(var i = 1; i <= 99; i ++) {
            var c = {
                tag : 'option',
                attr : {
                    value : i
                },
                text : i + '人'
            };
            if(4 == i) {
                c.attr.selected = 'selected';
            }
            orderSum += content.create(c);
        }

        var calendarTitle = [{
            tag : 'div',
            class : 'calendar-title-left',
            style : 'width:100%;',
            text : '<span>' + (date.getMonth() + 1) + '</span>月'
        }];
        if('' != args.time.shopOrderParams.records[0].reserveTableInfo || 0 < args.time.shopOrderParams.records[0].revBeforTime) {
            calendarTitle[0].style = 'width:' + w + 'px;border-right: 1px dotted #c4c0bc;';
            calendarTitle.push({
                tag : 'div',
                class : 'calendar-title-right',
                style : 'width:' + ($(window).width() - w - 1) + 'px;',
                text : '<span>' + (args.time.shopOrderParams.records[0].revBeforTime == '0' ? '' : '请提前' + parseInt(args.time.shopOrderParams.records[0].revBeforTime) + '分钟下单。') + (args.time.shopOrderParams.records[0].reserveTableInfo || '') + '</span>'
            });
        }
        var timeBar = {
            tag : 'div',
            id : 'timeBar',
            style : 'width:' + (left + 60) + 'px;height:' + $(window).height() + 'px;left:-' + (left + 60) + 'px;',
            children : [
                {
                    tag : 'section',
                    class : 'top',
                    children : [
                        {
                            tag : 'div',
                            class : 'btn font-verysmall color-module left click',
                            text : '取消',
                            event : {
                                tar : '.submitTime',
                                handler : constant.event.DEBUG,
                                func : function(e, t) {
                                    if(t.hasClass('submitTime')) {
                                        order = storage.getStorage('order', 'local');
                                        var y, m, d, that = Calendar.choose;
                                        y = that.attr('year');
                                        parseInt(that.attr('month')) >= 10 ? m = that.attr('month') : m = '0' + that.attr('month');
                                        parseInt(that.attr('day')) >= 10 ? d = that.attr('day') : d = '0' + that.attr('day');
                                        order.properties.dateValue = y + m + d;
                                        order.properties.timeID = $('#timeBar .order-time').val();
                                        order.properties.person = $('#timeBar .order-sum').val();
                                        storage.setStorage({
                                            data : {
                                                order : order
                                            },
                                            type : 'local'
                                        })
                                        if('0px' != $('#rightBar').css('right')){
                                            $('#menu').removeClass('dn');
                                        }
                                        $('#timeBar').animate({
                                            left : '-' + (left + 60) + 'px'
                                        }, 500);
                                        $('#guide').removeClass('dn');
                                        $('#topBar').removeClass('dn');
                                    }
                                }
                            }
                        },
                        {
                            tag : 'div',
                            class : 'btn btn-inline bar-title',
                            text : '选择时间和人数'
                        },
                        {
                            tag : 'div',
                            class : 'btn font-verysmall color-module click right submitTime',
                            text : '确认'
                        }
                    ]
                },
                {
                    tag : 'section',
                    id : 'calendar',
                    children : [
                        {
                            tag : 'header',
                            class : 'calendar-title',
                            children : calendarTitle
                        },
                        {
                            tag : 'article',
                            class : 'calendar-body',
                            style : 'padding:0 ' + ($(window).width() - w * 7) / 2 + 'px',
                            children : [
                                {
                                    tag : 'div',
                                    class : 'calendar-head',
                                    text : calendarHead
                                },
                                {
                                    tag : 'div',
                                    class : 'calendar-tr',
                                    text : Calendar.tr[0]
                                },
                                {
                                    tag : 'div',
                                    class : 'calendar-tr',
                                    text : Calendar.tr[1]
                                },
                                {
                                    tag : 'div',
                                    class : 'calendar-tr',
                                    text : Calendar.tr[2]
                                }
                            ],
                            event : {
                                tar : '.calendar-td',
                                handler : constant.event.DEBUG,
                                func : function(e, t) {
                                    if(t.hasClass('able') && !t.hasClass('choose')) {
                                        Calendar.choose.removeClass('choose');
                                        t.addClass('choose');
                                        Calendar.choose = t;
                                        Calendar.changeInfo();
                                        $('#timeBar .order-time').html(Calendar.changeTime(t.attr('day'))).trigger('change');
                                        $('#timeBar .order-during').html(Calendar.changeDuring(t.attr('day'))).trigger('change');
                                    }
                                }
                            }
                        }
                    ]
                },
                {
                    tag : 'section',
                    class : 'order-info',
                    text : '您已选择： <span></span>'
                },
                {
                    tag : 'section',
                    children : [
                        {
                            tag : 'label',
                            children : [
                                {
                                    tag : 'select',
                                    class : 'order-during',
                                    style : 'width:' + ($(window).width() - 40) / 3 + 'px',
                                    attr : {
                                        label : 'order-during'
                                    },
                                    text : Calendar.changeDuring()
                                }
                            ]
                        },
                        {
                            tag : 'label',
                            children : [
                                {
                                    tag : 'select',
                                    class : 'order-time',
                                    style : 'width:' + ($(window).width() - 40) / 3 + 'px',
                                    attr : {
                                        label : 'order-time'
                                    },
                                    text : Calendar.changeTime()
                                }
                            ]
                        },
                        {
                            tag : 'label',
                            children : [
                                {
                                    tag : 'select',
                                    class : 'order-sum',
                                    style : 'width:' + ($(window).width() - 40) / 3 + 'px',
                                    attr : {
                                        label : 'order-sum'
                                    },
                                    text : orderSum
                                }
                            ]
                        }
                    ],
                    event : {
                        tar : '#timeBar select',
                        handler : 'change',
                        func : function(e, t) {
                            Calendar.changeInfo();

                            if(t.hasClass('order-during')) {
                                var flag = false;
                                var arrSP = args.time.shopPromotion ? args.time.shopPromotion.records : Calendar.defaltShopPromotion;
                                for(var i in arrSP) {
                                    if((arrSP[i].timeID == parseInt(t.val()) || '0' == arrSP[i].timeID) && arrSP[i].startDate <= cDate && arrSP[i].endDate >= cDate) {
                                        t.addClass(function() {
                                            if('1' == arrSP[i].tag) {
                                                return 'ico-quan';
                                            }
                                            if('2' == arrSP[i].tag) {
                                                return 'ico-jian';
                                            }
                                            if('3' == arrSP[i].tag) {
                                                return 'ico-song';
                                            }
                                            if('4' == arrSP[i].tag) {
                                                return 'ico-zhe';
                                            }
                                        });
                                        $('#timeBar .order-promotion .info').html(arrSP[i].promotionDesc);
                                        $('#timeBar .order-promotion').removeClass('dn');
                                        flag = true;
                                    }
                                }
                                if(!flag) {
                                    $('#timeBar .order-promotion').addClass('dn');
                                    t.removeClass(function() {
                                        return t.attr('class').substr(12);
                                    });
                                }

                                var o = $('#timeBar .order-time').find('option');
                                if(parseInt($('#timeBar .order-time').val()) < parseInt(t.find('option:selected').attr('start-time')) || parseInt($('#timeBar .order-time').val()) >= parseInt(t.find('option:selected').attr('end-time'))) {
                                    for(var i = 0; i < o.length; i ++) {
                                        if(parseInt(o.eq(i).attr('value')) >= parseInt(t.find('option:selected').attr('start-time'))) {
                                            $('#timeBar .order-time').val(o.eq(i).attr('value')).trigger('change');
                                            break;
                                        }
                                    }
                                }
                            }
                            if(t.hasClass('order-time')) {
                                var o = $('#timeBar .order-during').find('option');
                                if(parseInt(t.val()) < parseInt($('#timeBar .order-during').find('option:selected').attr('start-time')) || parseInt(t.val()) >= parseInt($('#timeBar .order-during').find('option:selected').attr('end-time'))) {
                                    for(var i = 0; i < o.length; i ++) {
                                        if(parseInt(o.eq(i).attr('start-time')) <= parseInt(t.val()) && parseInt(t.val()) < parseInt(o.eq(i).attr('end-time'))) {
                                            $('#timeBar .order-during').val(o.eq(i).attr('value')).trigger('change');
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    tag : 'section',
                    class : 'order-promotion dn',
                    children : [
                        {
                            tag : 'div',
                            class : 'arrow'
                        },
                        {
                            tag : 'div',
                            class : 'info'
                        }
                    ]
                },
                {
                    tag : 'div',
                    class : 'btn-block click submitTime',
                    style : 'margin:10px;',
                    text : '确认'
                }
            ]
        };
        html += content.create(timeBar);
        $('body').append(html);
        Calendar.choose = $('#calendar').find('.choose');

        //订单和菜品的内联逻辑
        var Order = {
            that : $('#orderList'),
            addTo : function(food) {
                if(0 == Order.that.find('li[item-id="' + food.itemID + '"]').length) {
                    if(Order.that.find('ul[series-id="' + food.foodCategoryID +'"]').hasClass('dn')) {
                        Order.that.find('ul[series-id="' + food.foodCategoryID +'"]').removeClass('dn');
                    }

                    var c = {
                        tag : 'li',
                        attr : {
                            'food-id' : food.foodID,
                            'item-id' : food.itemID,
                            'food-index' : food.index
                        },
                        children : [
                            {
                                tag : 'div',
                                class : 'pic'
                            },
                            {
                                tag : 'div',
                                class : 'info',
                                children : [
                                    {
                                        tag : 'div',
                                        class : 'name',
                                        text : food.foodName
                                    },
                                    {
                                        tag : 'div',
                                        class : 'price'
                                    }
                                ]
                            },
                            {
                                tag : 'div',
                                class : 'count',
                                children : [
                                    {
                                        tag : 'div',
                                        class : 'minus click'
                                    },
                                    {
                                        tag : 'div',
                                        class : 'sum click',
                                        text : 1
                                    },
                                    {
                                        tag : 'div',
                                        class : 'plus click'
                                    }
                                ]
                            }
                        ]
                    };

                    if(-1 != food.prePrice) {
                        c.children[1].children[1].text = '<span>￥&nbsp;</span>' + food.prePrice + '<span>&nbsp;/' + food.unit + '</span>';
                    }else {
                        c.children[1].children[1].text = '<span>￥&nbsp;</span>' + food.price + '<span>&nbsp;/' + food.unit + '</span>';
                    }
                    if(1 == food.isHasImage) {
                        var src = $('#menu').find('div[food-id="' + food.foodID + '"]').find('img').attr('osrc');
                        c.children[0].style = 'background:url(' + src + ') no-repeat center center;background-size: cover;';
                    }else {
                        c.children[0].class += ' dn';
                    }
                    if(1 == food.isSpecialty) {
                        c.children[1].children[0].class += ' ico-zhao';
                    }else if(1 == food.isRecommend) {
                        c.children[1].children[0].class += ' ico-jian';
                    }

                    Order.that.find('ul[series-id="' + food.foodCategoryID +'"]').append(content.create(c));
                }else {
                    var sum = parseInt(Order.that.find('li[item-id="' + food.itemID + '"]').find('.sum').html()) + 1;
                    Order.that.find('li[item-id="' + food.itemID + '"]').find('.sum').html(sum);
                }
                Order.addStorage(food);
            },
            add : function(t) {
                if(0 == Food.that.find('div[food-id="' + t.parents('li').attr('food-id') +'"]').find('.food-list').length){
                    Food.add(Food.that.find('div[food-id="' + t.parents('li').attr('food-id') +'"]'));
                }else {
                    Food.add(Food.that.find('div[food-id="' + t.parents('li').attr('food-id') +'"]').find('div[item-id="' + t.parents('li').attr('item-id') +'"]'));
                }
            },
            minus : function(t) {
                if(!_food[t.parents('li').attr('food-index')].list){
                    Food.minus(Food.that.find('div[food-id="' + t.parents('li').attr('food-id') +'"]'));
                    Total.minus(_food[t.parents('li').attr('food-index')]);
                    Order.minusStorage(_food[t.parents('li').attr('food-index')]);
                }else {
                    Food.minus(Food.that.find('div[food-id="' + t.parents('li').attr('food-id') +'"]').find('div[item-id="' + t.parents('li').attr('item-id') +'"]'));

                    for(var item in _food[t.parents('li').attr('food-index')].list) {
                        if(_food[t.parents('li').attr('food-index')].list[item].itemID == t.parents('li').attr('item-id')) {
                            Total.minus(_food[t.parents('li').attr('food-index')].list[item].origin);
                            Order.minusStorage(_food[t.parents('li').attr('food-index')].list[item].origin);
                        }
                    }
                }
                if(1 == t.html()) {
                    return false;
                }else {
                    t.html(t.html() - 1);
                    if(t && _food[t.parents('li').attr('food-index')].minOrderCount > 1 && t.html() < _food[t.parents('li').attr('food-index')].minOrderCount) {
                        t.prev().trigger(constant.event.DEBUG);
                    }
                    return true;
                }
            },
            addStorage : function(food) {
                var id = Order.inStorage(food.itemID);
                if(id) {
                    order.records[id].foodAmount ++;
                }else {
                    order.records.push({
                        foodAmount : 1,
                        foodUnitID : food.itemID,
                        foodID : food.foodID
                    });
                }

                storage.setStorage({
                    data : {
                        order : order
                    },
                    type : 'local'
                })
            },
            minusStorage : function(food) {
                var id = Order.inStorage(food.itemID);
                if(id) {
                    if(1 < order.records[id].foodAmount) {
                        order.records[id].foodAmount --;
                    }else {
                        order.records.splice(id, 1);
                    }
                    return  storage.setStorage({
                        data : {
                            order : order
                        },
                        type : 'local'
                    });
                }
            },
            inStorage : function(id) {
                for(var item in order.records) {
                    if(order.records[item].foodUnitID == id) {
                        return item;
                    }
                }
                return false;
            }
        };

        var Purcar = {
            that : $('.pur-car'),
            add : function() {
                if(Purcar.that.parent().hasClass('dn')) {
                    Purcar.that.parent().removeClass('dn');
                }else {
                    Purcar.that.html(parseInt(Purcar.that.html()) + 1);
                }
            },
            minus : function() {
                var sum = parseInt(Purcar.that.html());
                if(1 == sum) {
                    Purcar.that.parent().addClass('dn');
                }else {
                    Purcar.that.html(sum - 1);
                }
            }
        }

        var Food = {
            that : $('#menu'),
            add : function(t, sum) {
                sum = sum || 1;
                for(var i = 1; i <= sum; i ++) {
                    if(t.hasClass('food') && (0 == t.find('.food-unfold').length || t.find('.food-unfold').hasClass('dn'))) {
                        if(0 == t.find('.food-slide').length) {
                            t.addClass('choose');
                        }else {
                            t.find('.food-slide').slideDown();
                            t.css('margin-bottom', '42px');
                            t.find('.food-info').removeClass('food-pack-up');
                            t.find('.food-unfold').removeClass('dn');
                        }
                        if(t.find('.food-list').length == 0) {
                            if(t.find('.food-count').hasClass('dn')) {
                                t.find('.food-count').removeClass('dn');
                                Purcar.add();
                            }
                            var val = parseInt(t.find('.food-count').html()) + 1;
                            if(val <= 99) {
                                t.find('.food-count').html(val);
                                Order.addTo(_food[t.attr('id').substr(5)]);
                                Total.add(_food[t.attr('id').substr(5)]);
                            }
                        }
                        if(_food[t.attr('id').substr(5)].minOrderCount > 1 && t.find('.food-count').html() < _food[t.attr('id').substr(5)].minOrderCount) {
                            Food.add(t);
                        }
                    }
                    if(t.hasClass('food-list')) {
                        t.addClass('choose');
                        t.parents('.food').find('.food-unfold').addClass('choose');
                        if(t.find('.food-list-count').hasClass('dn')) {
                            t.find('.food-list-count').removeClass('dn');
                            Purcar.add();
                        }
                        var val = parseInt(t.find('.food-list-count').html()) + 1;
                        t.find('.food-list-count').html(val);
                        t.parents('.food').addClass('choose');
                        if(t.parents('.food').find('.food-count').hasClass('dn')) {
                            t.parents('.food').find('.food-count').removeClass('dn');
                        }
                        val = parseInt(t.parents('.food').find('.food-count').html()) + 1;
                        if(val <= 99) {
                            t.parents('.food').find('.food-count').html(val);
                            for(var item in _food[t.parents('div[id^="food-"]').attr('id').substr(5)].list) {
                                if(_food[t.parents('div[id^="food-"]').attr('id').substr(5)].list[item].itemID == t.attr('item-id')) {
                                    Order.addTo(_food[t.parents('div[id^="food-"]').attr('id').substr(5)].list[item].origin);
                                    Total.add(_food[t.parents('div[id^="food-"]').attr('id').substr(5)].list[item].origin);
                                }
                            }
                        }
                    }
                }
            },
            minus : function(t) {
                if(t.hasClass('food')) {
                    var sum = parseInt(t.find('.food-count').html());
                    if(1 == sum) {
                        t.removeClass('choose');
                        t.find('.food-count').addClass('dn');

                        if(0 != t.find('.food-unfold').length) {
                            t.find('.food-unfold').trigger(constant.event.DEBUG);
                        }
                    }
                    t.find('.food-count').html(sum - 1);
                }
                if(t.hasClass('food-list')) {
                    var sum = parseInt(t.find('.food-list-count').html());

                    if(1 == sum) {
                        t.removeClass('choose');
                        t.find('.food-list-count').addClass('dn');
                    }
                    t.find('.food-list-count').html(sum - 1);
                    Food.minus(t.parents('.food'));
                }
            }
        };

        var Total = {
            that : $('#rightBar .top, #topBar').find('.bar-title span'),
            add : function(food) {
                var sum = parseInt(Total.that.html());
                if(food.prePrice >= 0) {
                    Total.that.html(sum + parseInt(food.prePrice));
                }else {
                    Total.that.html(sum + parseInt(food.price));
                }
            },
            minus : function(food) {
                var sum = parseInt(Total.that.html());
                if(food.prePrice >= 0) {
                    Total.that.html(sum - parseInt(food.prePrice));
                }else {
                    Total.that.html(sum - parseInt(food.price));
                }
            }
        }

        //第一次加载瀑布流
        var ct;
        var initWaterFall = function() {
            var iH;
            0 != order.records.length ? iH = Infinity : iH = initHeight;

            var ct = 0, flag = 0;

            for(var i = 0; i < series.length; i ++) {
                if(1 == flag) break;
                else {
                    var ph = [], min;
                    var h = $('#menu').height();
                    for(var n = 0; n < p; n ++) {
                        ph.push(h);
                    }
                    var node = $('#series-' + series[i]._id);
                    for(var j = 0; j < series[i]._count; j ++, ct ++) {
                        min = math.sort('min', ph);
                        var after = null;
                        var c = {
                            tag : 'div',
                            class : 'food-info',
                            children : [
                                {
                                    tag : 'div',
                                    class : 'food-name',
                                    text : food[0].foodName
                                },
                                {
                                    tag : 'div',
                                    class : 'food-price'
                                }
                            ]
                        }
                        if(1 == food[0].isSpecialty) {
                            c.children[0].class += ' ico-zhao';
                        }else if(1 == food[0].isRecommend) {
                            c.children[0].class += ' ico-jian';
                        }
                        if(!food[0].list) {
                            if(food[0].prePrice >= 0) {
                                c.children[1].text = '<p>￥</p>&nbsp;' + food[0].prePrice + '&nbsp;<p>/' + food[0].unit + '</p>';
                                c.children.push({
                                    tag : 'div',
                                    class : 'food-pre-price',
                                    text : '￥&nbsp;' + food[0].price
                                });
                            }else {
                                c.children[1].text = '<p>￥</p>&nbsp;' + food[0].price + '&nbsp;<p>/' + food[0].unit + '</p>';
                            }
                            if('1' == food[0].isSetFood) {
                                c.children.push({
                                    tag : 'hr'
                                });
                                c.children.push({
                                    tag : 'div',
                                    class : 'food-detail',
                                    text : validate.reg('filtN', food[0].setFoodDetailLst)
                                });
                            }
                            if(food[0].clickAlertMess) {
                                c.children.push({
                                    tag : 'hr'
                                });
                                c.children.push({
                                    tag : 'div',
                                    class : 'food-tips',
                                    text : food[0].clickAlertMess
                                });
                            }
                        }else {
                            c.class += ' food-pack-up';
                            c.children[1].text = '<p>￥</p>&nbsp;' + food[0].list[0].price + '～' + food[0].list[food[0].list.length - 1].price + '&nbsp;<p>/' + food[0].unit + '</p>';

                            var cld = [];
                            for(var item in food[0].list) {
                                cld.push(
                                    {
                                        tag : 'div',
                                        class : 'food-list click',
                                        attr : {
                                            'item-id' : food[0].list[item].itemID
                                        },
                                        text : '<p>￥</p>&nbsp;' + food[0].list[item].price + '&nbsp;<p>/' + food[0].list[item].unit + '</p>',
                                        children : [
                                            {
                                                tag : 'div',
                                                class : 'food-list-count dn',
                                                text : '0'
                                            }
                                        ]
                                    });
                            }

                            c.children.push({
                                tag : 'div',
                                class : 'food-slide',
                                children : cld
                            });

                            if('' != food[0].clickAlertMess) {
                                c.children.push({
                                    tag : 'hr'
                                });
                                c.children.push({
                                    tag : 'div',
                                    class : 'food-tips',
                                    text : food[0].clickAlertMess
                                });
                            }
                            after = '<div class="food-unfold dn click"></div>';
                        }

                        $('#cache').append(content.create(c));
                        var divH =  $('#cache').height();
                        $('#cache').html('');

                        if(1 == food[0].isHasImage) {
                            var ah = pw * food[0].imageHWP + 10 + divH;
                            if(ah + ph[min] > iH) {
                                flag = 1;
                                break;
                            }else {
                                ph[min] += pw * food[0].imageHWP + 10 + divH;

                                var reg = /([^&]+)\.([^&]+)/g;
                                var src = food[0].imgePath;
                                var match = reg.exec(src);
                                try{
                                    src = constant.location.IMAGEHOST + match[1] + '=' + pw * 2 + 'x999.' + match[2] + '?quality=70';
                                    loadImage(src, ct);
                                }catch(e) {
                                }

                                var html = content.create({
                                    tag : 'div',
                                    class : 'food click',
                                    id : 'food-' + ct,
                                    style : style,
                                    attr : {
                                        'food-id' : food[0].foodID,
                                        'item-id' : food[0].itemID
                                    },
                                    children : [
                                        {
                                            tag : 'img',
                                            attr : {
                                                src : constant.location.IMAGE + 'blank.png',
                                                width : pw + 'px',
                                                height : Math.round(pw * food[0].imageHWP) + 'px',
                                                osrc : src
                                            }
                                        },
                                        {
                                            tag : 'div',
                                            class : 'food-count dn',
                                            text : '0'
                                        }
                                    ]
                                });
                            }
                        }else {
                            if(ph[min] + 10 + divH > iH) {
                                flag = 1;
                                break;
                            }else {
                                ph[min] += 10 + divH;

                                var html = content.create({
                                    tag : 'div',
                                    class : 'food click',
                                    id : 'food-' + ct,
                                    attr : {
                                        'food-id' : food[0].foodID
                                    },
                                    style : style,
                                    children : [
                                        {
                                            tag : 'div',
                                            class : 'food-count dn',
                                            text : '0'
                                        }
                                    ]
                                });
                            }
                        }
                        node.find('#column-' + (min + 1)).append(html);
                        $('#food-' + ct).append(content.create(c)).append(after);
                        _food.push(food.shift());

                        _food[ct].index = ct;

                        var id;
                        if(_food[ct].list) {
                            for(var item in _food[ct].list) {
                                _food[ct].list[item].origin.index = ct;
                                id = Order.inStorage(_food[ct].list[item].origin.itemID);
                                if(id) {
                                    Food.add($('.food-list[item-id="' + _food[ct].list[item].origin.itemID + '"]'), order.records[id].foodAmount);
                                    order.records[id].foodAmount /= 2;
                                    storage.setStorage({
                                        data : {
                                            order : order
                                        },
                                        type : 'local'
                                    })
                                }
                            }
                        }else {
                            id = Order.inStorage(_food[ct].itemID);
                            if(id) {
                                Food.add($('.food[food-id="' + _food[ct].foodID + '"]'), order.records[id].foodAmount - (_food[ct].minOrderCount > 1 ? _food[ct].minOrderCount - 1 : 0));
                                order.records[id].foodAmount /= 2;
                                storage.setStorage({
                                    data : {
                                        order : order
                                    },
                                    type : 'local'
                                })
                            }
                        }
                    }
                }
            }
            /*var id = 0;
             var int = setInterval(function() {
             if(id > ct) {
             clearInterval(int);
             }else {
             $('#food-' + id).animate({
             'opacity' : 1,
             'top' : 0
             }, 500);
             id ++;
             }
             }, 50);*/

            return ct;
        };

        ct = initWaterFall();

        //之后加载的瀑布流
        var _flag = 0;
        var topFood = food[0], bottomFood = food[0];
        var comWaterFall = function(ct, si) {
            var _ph = [];
            var sum = 0, flag = 0;
            if(currentST < lastST) {
                sum = food.length - 1;
            }

            for(var i = 1; i <= p; i ++) {
                _ph.push(0);
            }

            while(food[sum] && !flag) {
                var sid = parseInt($('#series-' + food[sum].foodCategoryID).attr('series-index'));
                if(si && food[sum].foodCategoryID != si) {
                    sum ++;
                    continue;
                }else {
                    si = null;
                }
                if(currentST >= lastST && sid < currentSeries) {
                    sum ++;
                }else if(currentST < lastST && sid > currentSeries) {
                    sum --;
                }else {
                    var after = null;
                    var c = {
                        tag : 'div',
                        class : 'food-info',
                        children : [
                            {
                                tag : 'div',
                                class : 'food-name',
                                text : food[sum].foodName
                            },
                            {
                                tag : 'div',
                                class : 'food-price'
                            }
                        ]
                    }
                    if(1 == food[sum].isSpecialty) {
                        c.children[0].class += ' ico-zhao';
                    }else if(1 == food[sum].isRecommend) {
                        c.children[0].class += ' ico-jian';
                    }
                    if(!food[sum].list) {
                        if(food[sum].prePrice >= 0) {
                            c.children[1].text = '<p>￥</p>&nbsp;' + food[sum].prePrice + '&nbsp;<p>/' + food[sum].unit + '</p>';
                            c.children.push({
                                tag : 'div',
                                class : 'food-pre-price',
                                text : '￥&nbsp;' + food[sum].price
                            });
                        }else {
                            c.children[1].text = '<p>￥</p>&nbsp;' + food[sum].price + '&nbsp;<p>/' + food[sum].unit + '</p>';
                        }
                        if('1' == food[sum].isSetFood) {
                            c.children.push({
                                tag : 'hr'
                            });
                            c.children.push({
                                tag : 'div',
                                class : 'food-detail',
                                text : validate.reg('filtN', food[sum].setFoodDetailLst)
                            });
                        }
                        if('' != food[sum].clickAlertMess) {
                            c.children.push({
                                tag : 'hr'
                            });
                            c.children.push({
                                tag : 'div',
                                class : 'food-tips',
                                text : food[sum].clickAlertMess
                            });
                        }
                    }else {
                        c.class += ' food-pack-up';
                        c.children[1].text = '<p>￥</p>&nbsp;' + food[sum].list[0].price + '～' + food[sum].list[food[sum].list.length - 1].price + '&nbsp;<p>/' + food[sum].unit + '</p>';

                        var cld = [];
                        for(var item in food[sum].list) {
                            cld.push(
                                {
                                    tag : 'div',
                                    class : 'food-list click',
                                    attr : {
                                        'item-id' : food[sum].list[item].itemID
                                    },
                                    text : '<p>￥</p>&nbsp;' + food[sum].list[item].price + '&nbsp;<p>/' + food[sum].list[item].unit + '</p>',
                                    children : [
                                        {
                                            tag : 'div',
                                            class : 'food-list-count dn',
                                            text : '0'
                                        }
                                    ]
                                });
                        }

                        c.children.push({
                            tag : 'div',
                            class : 'food-slide',
                            children : cld
                        });

                        if('' != food[sum].clickAlertMess) {
                            c.children.push({
                                tag : 'hr'
                            });
                            c.children.push({
                                tag : 'div',
                                class : 'food-tips',
                                text : food[sum].clickAlertMess
                            });
                        }
                        after = '<div class="food-unfold dn click"></div>';
                    }

                    $('#cache').append(content.create(c));
                    var divH =  $('#cache').height();
                    $('#cache').html('');

                    var ph = [];
                    for(var i = 1; i <= p; i ++) {
                        ph.push($('#series-' + food[sum].foodCategoryID).find('#column-' + i).height());
                    }
                    var min = math.sort('min', ph);
                    var node = $('#series-' + food[sum].foodCategoryID).find('#column-' + (min + 1));
                    if(1 == food[sum].isHasImage) {
                        var ah = pw * food[sum].imageHWP + 10 + divH;
                        if(ah + _ph[min] > comHeight) {
                            break;
                        }else {
                            ph[min] += pw * food[sum].imageHWP + 10 + divH;
                            _ph[min] += pw * food[sum].imageHWP + 10 + divH;

                            var reg = /([^&]+)\.([^&]+)/g;
                            var src = food[sum].imgePath;
                            var match = reg.exec(src);
                            try{
                                src = constant.location.IMAGEHOST + match[1] + '=' + pw * 2 + 'x999.' + match[2] + '?quality=70';
                                loadImage(src, ct);
                            }catch(e) {
                            }

                            var html = content.create({
                                tag : 'div',
                                class : 'food click',
                                id : 'food-' + ct,
                                attr : {
                                    'food-id' : food[sum].foodID,
                                    'item-id' : food[sum].itemID
                                },
                                style : style,
                                children : [
                                    {
                                        tag : 'img',
                                        attr : {
                                            src : constant.location.IMAGE + 'blank.png',
                                            width : pw + 'px',
                                            height : Math.round(pw * food[sum].imageHWP) + 'px',
                                            osrc : src
                                        }
                                    },
                                    {
                                        tag : 'div',
                                        class : 'food-count dn',
                                        text : '0'
                                    }
                                ]
                            });
                        }
                    }else {
                        if(_ph[min] + 10 + divH > comHeight) {
                            break;
                        }else {
                            ph[min] += 10 + divH;
                            _ph[min] += 10 + divH;

                            var html = content.create({
                                tag : 'div',
                                class : 'food click',
                                id : 'food-' + ct,
                                attr : {
                                    'food-id' : food[sum].foodID
                                },
                                style : style,
                                children : [
                                    {
                                        tag : 'div',
                                        class : 'food-count dn',
                                        text : '0'
                                    }
                                ]
                            });
                        }
                    }

                    node.append(html);
                    $('#food-' + ct).append(content.create(c)).append(after);
                    currentSeries = sid;
                    _food.push(food.splice(sum, 1)[0]);
                    _food[ct].index = ct;

                    var id;
                    if(_food[ct].list) {
                        for(var item in _food[ct].list) {
                            _food[ct].list[item].origin.index = ct;
                            id = Order.inStorage(_food[ct].list[item].origin.itemID);
                            if(id) {
                                Food.add($('.food-list[item-id="' + _food[ct].list[item].origin.itemID + '"]'), order.records[id].foodAmount);
                                order.records[id].foodAmount /= 2;
                                storage.setStorage({
                                    data : {
                                        order : order
                                    },
                                    type : 'local'
                                })
                            }
                        }
                    }else {
                        id = Order.inStorage(_food[ct].itemID);
                        if(id) {
                            Food.add($('.food[food-id="' + _food[ct].foodID + '"]'), order.records[id].foodAmount - (_food[ct].minOrderCount > 1 ? _food[ct].minOrderCount - 1 : 0));
                            order.records[id].foodAmount /= 2;
                            storage.setStorage({
                                data : {
                                    order : order
                                },
                                type : 'local'
                            })
                        }
                    }

                    if(currentST < lastST) {
                        sum --;
                        /*if(food[sum].foodCategoryID != _food[_food.length - 1].foodCategoryID) {
                         flag = 1;
                         }*/
                        topFood = food[sum] || null;
                        bottomFood = food[sum + 1] || null;
                    }else {
                        topFood = food[sum- 1] || null;
                        bottomFood = food[sum] || null;
                    }

                    ct ++;
                }
            }

            /*var int = setInterval(function() {
             if(id > ct) {
             clearInterval(int);
             }else {
             $('#food-' + id).animate({
             'opacity' : 1,
             'top' : 0
             }, 500);
             id ++;
             }
             }, 50);*/

            return ct;
        }

        //图片延迟加载
        function loadImage(src, ct) {
            var img = new Image();
            img.src = src;

            img.onload = function(){ //图片下载完毕时异步调用callback函数。
                $('#food-' + ct).find('img').attr('src', src).css('opacity', 1);
            };
        }

        if(storage.getStorage('order', 'local').properties.timeID) {
            var y, m, d, timeID, person;

            order = storage.getStorage('order', 'local');
            y = parseInt(order.properties.dateValue.substr(0, 4));
            m = parseInt(order.properties.dateValue.substr(4, 2));
            d = parseInt(order.properties.dateValue.substr(6, 2));
            $('#calendar').find('div[year="' + y + '"][month="' + m + '"][day="' + d + '"]').trigger(constant.event.DEBUG);
            if(order.properties.timeID >= parseInt(new Date().getHours() + '' + new Date().getMinutes())) {
                $('#timeBar .order-time').val(order.properties.timeID).trigger('change');
            }
            $('#timeBar .order-sum').val(order.properties.person).trigger('change');
        }
        Calendar.changeInfo();
        $('#timeBar .order-during').trigger('change');

        var lastST = 0, currentST = 0;
        $(document).delegate(window, 'scroll', function(event) {
            if(0 != $('#leftBar').css('left') + $('#rightBar').css('right') && $('#timeBar').hasClass('dn')) {
                currentST = parseInt($(window).scrollTop());
                if(food[0] && !_flag) {
                    if(currentST >= lastST && bottomFood) {
                        var node = $('#series-' + bottomFood.foodCategoryID);

                        if($(window).scrollTop() + $(window).height() >= node.offset().top + node.height()) {
                            _flag = 1;
                            ct = comWaterFall(ct);
                            _flag = 0;
                        }
                    }else if(currentST < lastST && topFood) {
                        node = $('#series-' + topFood.foodCategoryID);

                        if($(window).scrollTop() <= node.offset().top - 46) {
                            _flag = 1;
                            ct = comWaterFall(ct);
                            _flag = 0;
                        }
                    }
                }
                lastST = parseInt($(window).scrollTop());
            }else {
                event.preventDefault();
            }
        });
    }
    
    return {
        render : render
    }
});