/**
 * Created with JetBrains WebStorm.
 * Author: ZhangQuan
 * Date: 13-5-14
 * Time: 下午6:59
 */

/*
 * 数学方法核心，包括浮点数的运算，数组的排序和一些动画需要的公式
 */
;define([
    'jquery'
],
function($) {

    /*
     * 对JS浮点数运算进行的优化
     * Number s,    //需要运算的数字，可以是浮点型，整型，和可转换为数字的字符型
     * Int dot,     //保留的浮点位数，默认2位
     */
    var parseNum = function(s, dot) {
        dot = dot || 2;
        var m = 1;
        for(var i = 1; i <= dot; i ++) {
            m *= 10;
        }
        var k = Math.round(parseFloat(s)*m);
        return k / m;
    };

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
        parseNum : parseNum,
        sort : sort
    }
});