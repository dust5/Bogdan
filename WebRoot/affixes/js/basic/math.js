/**
 * Created with JetBrains WebStorm.
 * Author: ZhangQuan
 * Date: 13-5-14
 * Time: 下午6:59
 */
;define([
    'jquery'
],
function($) {
    /*
     p:需要判断的点坐标{x,y}
     r:范围。对象，由其他函数传入
     */
    var isInside = function(p, r) {
        if(r.recLT) {
            if(p.x < r.recLT.x || p.x > r.recRT.x) {
                return false;
            }
            if(p.y < r.recLT.y || p.y > r.recLB.y) {
                return false;
            }
            return true;
        }
        if(r.o) {
            if(Math.sqrt(Math.pow(p.x - r.o.x, 2) + Math.pow(p.y - r.o.y, 2)) > r.r) {
                return false;
            }
            return true;
        }
    };

    /*
     le:上一个事件
     ce:当前事件
     t:捕获当前事件的节点,jQuery对象
     type:点击区域类型
     */
    var isTap = function(le, ce, t, type) {
        var range = {
            rectangle : rec,
            circle : circle
        };
        var time = ce.timeStamp - le.timeStamp; //触摸开始和结束之间的时间间隔
        var sp, ep; //触摸开始点和触摸结束点的坐标

        var top = t.offset().top;
        var left = t.offset().left;

        function rec(t) {
            var p = {
                x : 10,
                y : 10
            }; //范围修正值，扩大触摸判定范围
            var range = {};

            range.recLT = {
                x : left - p.x,
                y : top - p.y
            };
            range.recLB = {
                x : left - p.x,
                y : top + t.height() + p.y
            };
            range.recRT = {
                x : left + t.width() + p.x,
                y : top - p.y
            };
            range.recRB = {
                x : left + t.width() + p.x,
                y : top + t.height() + p.y
            };

            return range;
        };

        function circle(t) {
            var p = 20;
            var range = {};
            range.o = {
                x : left + t.width() / 2,
                y : top + t.height() / 2
            };
            range.r = t.width() / 2 + p;
            return range;
        };

        if(0 == $('#mask').length && time <= 250 && time >=0 &&
            isInside({x : le.originalEvent.targetTouches[0].pageX, y : le.originalEvent.targetTouches[0].pageY}, range[type](t)) &&
            isInside({x : ce.originalEvent.changedTouches[0].pageX, y : ce.originalEvent.changedTouches[0].pageY}, range[type](t))) {
            t.trigger('tappy');
        }
    }

    var sort = function(type, arr) {
        var reg = {
            'bubble' : bubble,
            'selection' : selection,
            'insertion' : insertion,
            'shell' : shell,
            'quick' : quick,
            'stackQuick' : stackQuick,
            'merge' : merge,
            'heap' : heap,
            'min' : min
        };
        return reg[type](arr);

        Array.prototype.swap = function(i, j) {
            var temp = this[i];
            this[i] = this[j];
            this[j] = temp;

            return arr;
        }

        function bubble(arr) {
            for (var i = arr.length - 1; i > 0; --i) {
                for (var j = 0; j < i; ++j) {
                    if (arr[j] > arr[j + 1]) arr.swap(j, j + 1);
                }
            }

            return arr;
        }

        function selection(arr) {
            for (var i = 0; i < arr.length; ++i) {
                var index = i;
                for (var j = i + 1; j < arr.length; ++j) {
                    if (arr[j] < arr[index]) index = j;
                }
                arr.swap(i, index);

                return arr;
            }
        }

        function insertion(arr) {
            for (var i = 1; i < arr.length; ++i)  {
                var j = i, value = arr[i];
                while (j > 0 && arr[j - 1] > value) {
                    arr[j] = arr[j - 1];
                    --j;
                }
                arr[j] = value;

                return arr;
            }
        }

        function shell(arr) {
            for (var step = arr.length >> 1; step > 0; step >>= 1) {
                for (var i = 0; i < step; ++i) {
                    for (var j = i + step; j < arr.length; j += step) {
                        var k = j, value = arr[j];
                        while (k >= step && arr[k - step] > value) {
                            arr[k] = arr[k - step];
                            k -= step;
                        }
                        arr[k] = value;
                    }
                }
            }

            return arr;
        }

        function quick(s, e) {
            if (s == null) s = 0;
            if (e == null) e = arr.length - 1;
            if (s >= e) arr;
            arr.swap((s + e) >> 1, e);
            var index = s - 1;
            for (var i = s; i <= e; ++i) {
                if (arr[i] <= arr[e]) arr.swap(i, ++index);
            }
            quick(s, index - 1);
            quick(index + 1, e);

            return arr;
        }

        function stackQuick(arr) {
            var stack = [0, arr.length - 1];
            while (stack.length > 0) {
                var e = stack.pop(), s = stack.pop();
                if (s >= e) continue;
                arr.swap((s + e) >> 1, e);
                var index = s - 1;
                for (var i = s; i <= e; ++i) {
                    if (arr[i] <= arr[e]) arr.swap(i, ++index);
                }
                stack.push(s, index - 1, index + 1, e);
            }

            return arr;
        }

        function merge(s, e, b) {
            if (s == null) s = 0;
            if (e == null) e = arr.length - 1;
            if (b == null) b = new Array(arr.length);
            if (s >= e) return;
            var m = (s + e) >> 1;
            merge(s, m, b);
            merge(m + 1, e, b);
            for (var i = s, j = s, k = m + 1; i <= e; ++i) {
                b[i] = arr[(k > e || j <= m && arr[j] < arr[k]) ? j++ : k++];
            }
            for (var i = s; i <= e; ++i) arr[i] = b[i];

            return arr;
        }

        function heap(arr) {
            for (var i = 1; i < arr.length; ++i) {
                for (var j = i, k = (j - 1) >> 1; k >= 0; j = k, k = (k - 1) >> 1) {
                    if (arr[k] >= arr[j]) break;
                    arr.swap(j, k);
                }
            }
            for (var i = arr.length - 1; i > 0; --i) {
                arr.swap(0, i);
                for (var j = 0, k = (j + 1) << 1; k <= i; j = k, k = (k + 1) << 1) {
                    if (k == i || arr[k] < arr[k - 1]) --k;
                    if (arr[k] <= arr[j]) arr;
                    arr.swap(j, k);
                }
            }

            return arr;
        }

        function min(arr) {
            var m = arr[0], j = 0;
            for(var i = 1; i < arr.length; i ++) {
                if(arr[i] < m) {
                    m = arr[i];
                    j = i;
                }
            }

            return j;
        }
    }

    return {
        event : {
            isTap : isTap
        },
        sort : sort
    }
});