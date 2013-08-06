/* Zepto v1.0-1-ga3cab6c - polyfill zepto detect event ajax form fx - zeptojs.com/license */


;(function(undefined){
  if (String.prototype.trim === undefined) // fix for iOS 3.2
    String.prototype.trim = function(){ return this.replace(/^\s+|\s+$/g, '') }

  // For iOS 3.x
  // from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
  if (Array.prototype.reduce === undefined)
    Array.prototype.reduce = function(fun){
      if(this === void 0 || this === null) throw new TypeError()
      var t = Object(this), len = t.length >>> 0, k = 0, accumulator
      if(typeof fun != 'function') throw new TypeError()
      if(len == 0 && arguments.length == 1) throw new TypeError()

      if(arguments.length >= 2)
       accumulator = arguments[1]
      else
        do{
          if(k in t){
            accumulator = t[k++]
            break
          }
          if(++k >= len) throw new TypeError()
        } while (true)

      while (k < len){
        if(k in t) accumulator = fun.call(undefined, accumulator, t[k], k, t)
        k++
      }
      return accumulator
    }

})()

var Zepto = (function() {
  var undefined, key, $, classList, emptyArray = [], slice = emptyArray.slice, filter = emptyArray.filter,
    document = window.document,
    elementDisplay = {}, classCache = {},
    getComputedStyle = document.defaultView.getComputedStyle,
    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,
    tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    rootNodeRE = /^(?:body|html)$/i,

    // special attributes that should be get/set via method calls
    methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

    adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 'thead': table, 'tfoot': table,
      'td': tableRow, 'th': tableRow,
      '*': document.createElement('div')
    },
    readyRE = /complete|loaded|interactive/,
    classSelectorRE = /^\.([\w-]+)$/,
    idSelectorRE = /^#([\w-]*)$/,
    tagSelectorRE = /^[\w-]+$/,
    class2type = {},
    toString = class2type.toString,
    zepto = {},
    camelize, uniq,
    tempParent = document.createElement('div')

  zepto.matches = function(element, selector) {
    if (!element || element.nodeType !== 1) return false
    var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
                          element.oMatchesSelector || element.matchesSelector
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:
    var match, parent = element.parentNode, temp = !parent
    if (temp) (parent = tempParent).appendChild(element)
    match = ~zepto.qsa(parent, selector).indexOf(element)
    temp && tempParent.removeChild(element)
    return match
  }

  function type(obj) {
    return obj == null ? String(obj) :
      class2type[toString.call(obj)] || "object"
  }

  function isFunction(value) { return type(value) == "function" }
  function isWindow(obj)     { return obj != null && obj == obj.window }
  function isDocument(obj)   { return obj != null && obj.nodeType == obj.DOCUMENT_NODE }
  function isObject(obj)     { return type(obj) == "object" }
  function isPlainObject(obj) {
    return isObject(obj) && !isWindow(obj) && obj.__proto__ == Object.prototype
  }
  function isArray(value) { return value instanceof Array }
  function likeArray(obj) { return typeof obj.length == 'number' }

  function compact(array) { return filter.call(array, function(item){ return item != null }) }
  function flatten(array) { return array.length > 0 ? $.fn.concat.apply([], array) : array }
  camelize = function(str){ return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) }
  function dasherize(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  }
  uniq = function(array){ return filter.call(array, function(item, idx){ return array.indexOf(item) == idx }) }

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      element = document.createElement(nodeName)
      document.body.appendChild(element)
      display = getComputedStyle(element, '').getPropertyValue("display")
      element.parentNode.removeChild(element)
      display == "none" && (display = "block")
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  function children(element) {
    return 'children' in element ?
      slice.call(element.children) :
      $.map(element.childNodes, function(node){ if (node.nodeType == 1) return node })
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overriden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  zepto.fragment = function(html, name, properties) {
    if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
    if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
    if (!(name in containers)) name = '*'

    var nodes, dom, container = containers[name]
    container.innerHTML = '' + html
    dom = $.each(slice.call(container.childNodes), function(){
      container.removeChild(this)
    })
    if (isPlainObject(properties)) {
      nodes = $(dom)
      $.each(properties, function(key, value) {
        if (methodAttributes.indexOf(key) > -1) nodes[key](value)
        else nodes.attr(key, value)
      })
    }
    return dom
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. Note that `__proto__` is not supported on Internet
  // Explorer. This method can be overriden in plugins.
  zepto.Z = function(dom, selector) {
    dom = dom || []
    dom.__proto__ = $.fn
    dom.selector = selector || ''
    return dom
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overriden in plugins.
  zepto.isZ = function(object) {
    return object instanceof zepto.Z
  }

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overriden in plugins.
  zepto.init = function(selector, context) {
    // If nothing given, return an empty Zepto collection
    if (!selector) return zepto.Z()
    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)
    // If a Zepto collection is given, juts return it
    else if (zepto.isZ(selector)) return selector
    else {
      var dom
      // normalize array if an array of nodes is given
      if (isArray(selector)) dom = compact(selector)
      // Wrap DOM nodes. If a plain object is given, duplicate it.
      else if (isObject(selector))
        dom = [isPlainObject(selector) ? $.extend({}, selector) : selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
      // create a new Zepto collection from the nodes found
      return zepto.Z(dom, selector)
    }
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, which makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.
  $ = function(selector, context){
    return zepto.init(selector, context)
  }

  function extend(target, source, deep) {
    for (key in source)
      if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
        if (isPlainObject(source[key]) && !isPlainObject(target[key]))
          target[key] = {}
        if (isArray(source[key]) && !isArray(target[key]))
          target[key] = []
        extend(target[key], source[key], deep)
      }
      else if (source[key] !== undefined) target[key] = source[key]
  }

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function(target){
    var deep, args = slice.call(arguments, 1)
    if (typeof target == 'boolean') {
      deep = target
      target = args.shift()
    }
    args.forEach(function(arg){ extend(target, arg, deep) })
    return target
  }

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overriden in plugins.
  zepto.qsa = function(element, selector){
    var found
    return (isDocument(element) && idSelectorRE.test(selector)) ?
      ( (found = element.getElementById(RegExp.$1)) ? [found] : [] ) :
      (element.nodeType !== 1 && element.nodeType !== 9) ? [] :
      slice.call(
        classSelectorRE.test(selector) ? element.getElementsByClassName(RegExp.$1) :
        tagSelectorRE.test(selector) ? element.getElementsByTagName(selector) :
        element.querySelectorAll(selector)
      )
  }

  function filtered(nodes, selector) {
    return selector === undefined ? $(nodes) : $(nodes).filter(selector)
  }

  $.contains = function(parent, node) {
    return parent !== node && parent.contains(node)
  }

  function funcArg(context, arg, idx, payload) {
    return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  function setAttribute(node, name, value) {
    value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
  }

  // access className property while respecting SVGAnimatedString
  function className(node, value){
    var klass = node.className,
        svg   = klass && klass.baseVal !== undefined

    if (value === undefined) return svg ? klass.baseVal : klass
    svg ? (klass.baseVal = value) : (node.className = value)
  }

  // "true"  => true
  // "false" => false
  // "null"  => null
  // "42"    => 42
  // "42.5"  => 42.5
  // JSON    => parse if valid
  // String  => self
  function deserializeValue(value) {
    var num
    try {
      return value ?
        value == "true" ||
        ( value == "false" ? false :
          value == "null" ? null :
          !isNaN(num = Number(value)) ? num :
          /^[\[\{]/.test(value) ? $.parseJSON(value) :
          value )
        : value
    } catch(e) {
      return value
    }
  }

  $.type = type
  $.isFunction = isFunction
  $.isWindow = isWindow
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.isEmptyObject = function(obj) {
    var name
    for (name in obj) return false
    return true
  }

  $.inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i)
  }

  $.camelCase = camelize
  $.trim = function(str) { return str.trim() }

  // plugin compatibility
  $.uuid = 0
  $.support = { }
  $.expr = { }

  $.map = function(elements, callback){
    var value, values = [], i, key
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        if (value != null) values.push(value)
      }
    else
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    return flatten(values)
  }

  $.each = function(elements, callback){
    var i, key
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  $.grep = function(elements, callback){
    return filter.call(elements, callback)
  }

  if (window.JSON) $.parseJSON = JSON.parse

  // Populate the class2type map
  $.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
    class2type[ "[object " + name + "]" ] = name.toLowerCase()
  })

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    sort: emptyArray.sort,
    indexOf: emptyArray.indexOf,
    concat: emptyArray.concat,

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function(fn){
      return $($.map(this, function(el, i){ return fn.call(el, i, el) }))
    },
    slice: function(){
      return $(slice.apply(this, arguments))
    },

    ready: function(callback){
      if (readyRE.test(document.readyState)) callback($)
      else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
      return this
    },
    get: function(idx){
      return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
    },
    toArray: function(){ return this.get() },
    size: function(){
      return this.length
    },
    remove: function(){
      return this.each(function(){
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },
    each: function(callback){
      emptyArray.every.call(this, function(el, idx){
        return callback.call(el, idx, el) !== false
      })
      return this
    },
    filter: function(selector){
      if (isFunction(selector)) return this.not(this.not(selector))
      return $(filter.call(this, function(element){
        return zepto.matches(element, selector)
      }))
    },
    add: function(selector,context){
      return $(uniq(this.concat($(selector,context))))
    },
    is: function(selector){
      return this.length > 0 && zepto.matches(this[0], selector)
    },
    not: function(selector){
      var nodes=[]
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function(idx){
          if (!selector.call(this,idx)) nodes.push(this)
        })
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) :
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el){
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    has: function(selector){
      return this.filter(function(){
        return isObject(selector) ?
          $.contains(this, selector) :
          $(this).find(selector).size()
      })
    },
    eq: function(idx){
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function(){
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function(){
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function(selector){
      var result, $this = this
      if (typeof selector == 'object')
        result = $(selector).filter(function(){
          var node = this
          return emptyArray.some.call($this, function(parent){
            return $.contains(parent, node)
          })
        })
      else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
      else result = this.map(function(){ return zepto.qsa(this, selector) })
      return result
    },
    closest: function(selector, context){
      var node = this[0], collection = false
      if (typeof selector == 'object') collection = $(selector)
      while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
        node = node !== context && !isDocument(node) && node.parentNode
      return $(node)
    },
    parents: function(selector){
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function(node){
          if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function(selector){
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function(selector){
      return filtered(this.map(function(){ return children(this) }), selector)
    },
    contents: function() {
      return this.map(function() { return slice.call(this.childNodes) })
    },
    siblings: function(selector){
      return filtered(this.map(function(i, el){
        return filter.call(children(el.parentNode), function(child){ return child!==el })
      }), selector)
    },
    empty: function(){
      return this.each(function(){ this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property){
      return $.map(this, function(el){ return el[property] })
    },
    show: function(){
      return this.each(function(){
        this.style.display == "none" && (this.style.display = null)
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function(newContent){
      return this.before(newContent).remove()
    },
    wrap: function(structure){
      var func = isFunction(structure)
      if (this[0] && !func)
        var dom   = $(structure).get(0),
            clone = dom.parentNode || this.length > 1

      return this.each(function(index){
        $(this).wrapAll(
          func ? structure.call(this, index) :
            clone ? dom.cloneNode(true) : dom
        )
      })
    },
    wrapAll: function(structure){
      if (this[0]) {
        $(this[0]).before(structure = $(structure))
        var children
        // drill down to the inmost element
        while ((children = structure.children()).length) structure = children.first()
        $(structure).append(this)
      }
      return this
    },
    wrapInner: function(structure){
      var func = isFunction(structure)
      return this.each(function(index){
        var self = $(this), contents = self.contents(),
            dom  = func ? structure.call(this, index) : structure
        contents.length ? contents.wrapAll(dom) : self.append(dom)
      })
    },
    unwrap: function(){
      this.parent().each(function(){
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function(){
      return this.map(function(){ return this.cloneNode(true) })
    },
    hide: function(){
      return this.css("display", "none")
    },
    toggle: function(setting){
      return this.each(function(){
        var el = $(this)
        ;(setting === undefined ? el.css("display") == "none" : setting) ? el.show() : el.hide()
      })
    },
    prev: function(selector){ return $(this.pluck('previousElementSibling')).filter(selector || '*') },
    next: function(selector){ return $(this.pluck('nextElementSibling')).filter(selector || '*') },
    html: function(html){
      return html === undefined ?
        (this.length > 0 ? this[0].innerHTML : null) :
        this.each(function(idx){
          var originHtml = this.innerHTML
          $(this).empty().append( funcArg(this, html, idx, originHtml) )
        })
    },
    text: function(text){
      return text === undefined ?
        (this.length > 0 ? this[0].textContent : null) :
        this.each(function(){ this.textContent = text })
    },
    attr: function(name, value){
      var result
      return (typeof name == 'string' && value === undefined) ?
        (this.length == 0 || this[0].nodeType !== 1 ? undefined :
          (name == 'value' && this[0].nodeName == 'INPUT') ? this.val() :
          (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
        ) :
        this.each(function(idx){
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) setAttribute(this, key, name[key])
          else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function(name){
      return this.each(function(){ this.nodeType === 1 && setAttribute(this, name) })
    },
    prop: function(name, value){
      return (value === undefined) ?
        (this[0] && this[0][name]) :
        this.each(function(idx){
          this[name] = funcArg(this, value, idx, this[name])
        })
    },
    data: function(name, value){
      var data = this.attr('data-' + dasherize(name), value)
      return data !== null ? deserializeValue(data) : undefined
    },
    val: function(value){
      return (value === undefined) ?
        (this[0] && (this[0].multiple ?
           $(this[0]).find('option').filter(function(o){ return this.selected }).pluck('value') :
           this[0].value)
        ) :
        this.each(function(idx){
          this.value = funcArg(this, value, idx, this.value)
        })
    },
    offset: function(coordinates){
      if (coordinates) return this.each(function(index){
        var $this = $(this),
            coords = funcArg(this, coordinates, index, $this.offset()),
            parentOffset = $this.offsetParent().offset(),
            props = {
              top:  coords.top  - parentOffset.top,
              left: coords.left - parentOffset.left
            }

        if ($this.css('position') == 'static') props['position'] = 'relative'
        $this.css(props)
      })
      if (this.length==0) return null
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: Math.round(obj.width),
        height: Math.round(obj.height)
      }
    },
    css: function(property, value){
      if (arguments.length < 2 && typeof property == 'string')
        return this[0] && (this[0].style[camelize(property)] || getComputedStyle(this[0], '').getPropertyValue(property))

      var css = ''
      if (type(property) == 'string') {
        if (!value && value !== 0)
          this.each(function(){ this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)
      } else {
        for (key in property)
          if (!property[key] && property[key] !== 0)
            this.each(function(){ this.style.removeProperty(dasherize(key)) })
          else
            css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
      }

      return this.each(function(){ this.style.cssText += ';' + css })
    },
    index: function(element){
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function(name){
      return emptyArray.some.call(this, function(el){
        return this.test(className(el))
      }, classRE(name))
    },
    addClass: function(name){
      return this.each(function(idx){
        classList = []
        var cls = className(this), newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function(klass){
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && className(this, cls + (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function(name){
      return this.each(function(idx){
        if (name === undefined) return className(this, '')
        classList = className(this)
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
          classList = classList.replace(classRE(klass), " ")
        })
        className(this, classList.trim())
      })
    },
    toggleClass: function(name, when){
      return this.each(function(idx){
        var $this = $(this), names = funcArg(this, name, idx, className(this))
        names.split(/\s+/g).forEach(function(klass){
          (when === undefined ? !$this.hasClass(klass) : when) ?
            $this.addClass(klass) : $this.removeClass(klass)
        })
      })
    },
    scrollTop: function(){
      if (!this.length) return
      return ('scrollTop' in this[0]) ? this[0].scrollTop : this[0].scrollY
    },
    position: function() {
      if (!this.length) return

      var elem = this[0],
        // Get *real* offsetParent
        offsetParent = this.offsetParent(),
        // Get correct offsets
        offset       = this.offset(),
        parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset()

      // Subtract element margins
      // note: when an element has margin: auto the offsetLeft and marginLeft
      // are the same in Safari causing offset.left to incorrectly be 0
      offset.top  -= parseFloat( $(elem).css('margin-top') ) || 0
      offset.left -= parseFloat( $(elem).css('margin-left') ) || 0

      // Add offsetParent borders
      parentOffset.top  += parseFloat( $(offsetParent[0]).css('border-top-width') ) || 0
      parentOffset.left += parseFloat( $(offsetParent[0]).css('border-left-width') ) || 0

      // Subtract the two offsets
      return {
        top:  offset.top  - parentOffset.top,
        left: offset.left - parentOffset.left
      }
    },
    offsetParent: function() {
      return this.map(function(){
        var parent = this.offsetParent || document.body
        while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
          parent = parent.offsetParent
        return parent
      })
    }
  }

  // for now
  $.fn.detach = $.fn.remove

  // Generate the `width` and `height` functions
  ;['width', 'height'].forEach(function(dimension){
    $.fn[dimension] = function(value){
      var offset, el = this[0],
        Dimension = dimension.replace(/./, function(m){ return m[0].toUpperCase() })
      if (value === undefined) return isWindow(el) ? el['inner' + Dimension] :
        isDocument(el) ? el.documentElement['offset' + Dimension] :
        (offset = this.offset()) && offset[dimension]
      else return this.each(function(idx){
        el = $(this)
        el.css(dimension, funcArg(this, value, idx, el[dimension]()))
      })
    }
  })

  function traverseNode(node, fun) {
    fun(node)
    for (var key in node.childNodes) traverseNode(node.childNodes[key], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function(operator, operatorIndex) {
    var inside = operatorIndex % 2 //=> prepend, append

    $.fn[operator] = function(){
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var argType, nodes = $.map(arguments, function(arg) {
            argType = type(arg)
            return argType == "object" || argType == "array" || arg == null ?
              arg : zepto.fragment(arg)
          }),
          parent, copyByClone = this.length > 1
      if (nodes.length < 1) return this

      return this.each(function(_, target){
        parent = inside ? target : target.parentNode

        // convert all methods to a "before" operation
        target = operatorIndex == 0 ? target.nextSibling :
                 operatorIndex == 1 ? target.firstChild :
                 operatorIndex == 2 ? target :
                 null

        nodes.forEach(function(node){
          if (copyByClone) node = node.cloneNode(true)
          else if (!parent) return $(node).remove()

          traverseNode(parent.insertBefore(node, target), function(el){
            if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
               (!el.type || el.type === 'text/javascript') && !el.src)
              window['eval'].call(window, el.innerHTML)
          })
        })
      })
    }

    // after    => insertAfter
    // prepend  => prependTo
    // before   => insertBefore
    // append   => appendTo
    $.fn[inside ? operator+'To' : 'insert'+(operatorIndex ? 'Before' : 'After')] = function(html){
      $(html)[operator](this)
      return this
    }
  })

  zepto.Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.uniq = uniq
  zepto.deserializeValue = deserializeValue
  $.zepto = zepto

  return $
})()

window.Zepto = Zepto
'$' in window || (window.$ = Zepto)

;(function($){
  function detect(ua){
    var os = this.os = {}, browser = this.browser = {},
      webkit = ua.match(/WebKit\/([\d.]+)/),
      android = ua.match(/(Android)\s+([\d.]+)/),
      ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
      iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
      webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
      touchpad = webos && ua.match(/TouchPad/),
      kindle = ua.match(/Kindle\/([\d.]+)/),
      silk = ua.match(/Silk\/([\d._]+)/),
      blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/),
      bb10 = ua.match(/(BB10).*Version\/([\d.]+)/),
      rimtabletos = ua.match(/(RIM\sTablet\sOS)\s([\d.]+)/),
      playbook = ua.match(/PlayBook/),
      chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/),
      firefox = ua.match(/Firefox\/([\d.]+)/)

    // Todo: clean this up with a better OS/browser seperation:
    // - discern (more) between multiple browsers on android
    // - decide if kindle fire in silk mode is android or not
    // - Firefox on Android doesn't specify the Android version
    // - possibly devide in os, device and browser hashes

    if (browser.webkit = !!webkit) browser.version = webkit[1]

    if (android) os.android = true, os.version = android[2]
    if (iphone) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
    if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
    if (webos) os.webos = true, os.version = webos[2]
    if (touchpad) os.touchpad = true
    if (blackberry) os.blackberry = true, os.version = blackberry[2]
    if (bb10) os.bb10 = true, os.version = bb10[2]
    if (rimtabletos) os.rimtabletos = true, os.version = rimtabletos[2]
    if (playbook) browser.playbook = true
    if (kindle) os.kindle = true, os.version = kindle[1]
    if (silk) browser.silk = true, browser.version = silk[1]
    if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true
    if (chrome) browser.chrome = true, browser.version = chrome[1]
    if (firefox) browser.firefox = true, browser.version = firefox[1]

    os.tablet = !!(ipad || playbook || (android && !ua.match(/Mobile/)) || (firefox && ua.match(/Tablet/)))
    os.phone  = !!(!os.tablet && (android || iphone || webos || blackberry || bb10 ||
      (chrome && ua.match(/Android/)) || (chrome && ua.match(/CriOS\/([\d.]+)/)) || (firefox && ua.match(/Mobile/))))
  }

  detect.call($, navigator.userAgent)
  // make available to unit tests
  $.__detect = detect

})(Zepto)

;(function($){
  var $$ = $.zepto.qsa, handlers = {}, _zid = 1, specialEvents={},
      hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' }

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

  function zid(element) {
    return element._zid || (element._zid = _zid++)
  }
  function findHandlers(element, event, fn, selector) {
    event = parse(event)
    if (event.ns) var matcher = matcherFor(event.ns)
    return (handlers[zid(element)] || []).filter(function(handler) {
      return handler
        && (!event.e  || handler.e == event.e)
        && (!event.ns || matcher.test(handler.ns))
        && (!fn       || zid(handler.fn) === zid(fn))
        && (!selector || handler.sel == selector)
    })
  }
  function parse(event) {
    var parts = ('' + event).split('.')
    return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
  }
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
  }

  function eachEvent(events, fn, iterator){
    if ($.type(events) != "string") $.each(events, iterator)
    else events.split(/\s/).forEach(function(type){ iterator(type, fn) })
  }

  function eventCapture(handler, captureSetting) {
    return handler.del &&
      (handler.e == 'focus' || handler.e == 'blur') ||
      !!captureSetting
  }

  function realEvent(type) {
    return hover[type] || type
  }

  function add(element, events, fn, selector, getDelegate, capture){
    var id = zid(element), set = (handlers[id] || (handlers[id] = []))
    eachEvent(events, fn, function(event, fn){
      var handler   = parse(event)
      handler.fn    = fn
      handler.sel   = selector
      // emulate mouseenter, mouseleave
      if (handler.e in hover) fn = function(e){
        var related = e.relatedTarget
        if (!related || (related !== this && !$.contains(this, related)))
          return handler.fn.apply(this, arguments)
      }
      handler.del   = getDelegate && getDelegate(fn, event)
      var callback  = handler.del || fn
      handler.proxy = function (e) {
        var result = callback.apply(element, [e].concat(e.data))
        if (result === false) e.preventDefault(), e.stopPropagation()
        return result
      }
      handler.i = set.length
      set.push(handler)
      element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
    })
  }
  function remove(element, events, fn, selector, capture){
    var id = zid(element)
    eachEvent(events || '', fn, function(event, fn){
      findHandlers(element, event, fn, selector).forEach(function(handler){
        delete handlers[id][handler.i]
        element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
      })
    })
  }

  $.event = { add: add, remove: remove }

  $.proxy = function(fn, context) {
    if ($.isFunction(fn)) {
      var proxyFn = function(){ return fn.apply(context, arguments) }
      proxyFn._zid = zid(fn)
      return proxyFn
    } else if (typeof context == 'string') {
      return $.proxy(fn[context], fn)
    } else {
      throw new TypeError("expected function")
    }
  }

  $.fn.bind = function(event, callback){
    return this.each(function(){
      add(this, event, callback)
    })
  }
  $.fn.unbind = function(event, callback){
    return this.each(function(){
      remove(this, event, callback)
    })
  }
  $.fn.one = function(event, callback){
    return this.each(function(i, element){
      add(this, event, callback, null, function(fn, type){
        return function(){
          var result = fn.apply(element, arguments)
          remove(element, type, fn)
          return result
        }
      })
    })
  }

  var returnTrue = function(){return true},
      returnFalse = function(){return false},
      ignoreProperties = /^([A-Z]|layer[XY]$)/,
      eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
      }
  function createProxy(event) {
    var key, proxy = { originalEvent: event }
    for (key in event)
      if (!ignoreProperties.test(key) && event[key] !== undefined) proxy[key] = event[key]

    $.each(eventMethods, function(name, predicate) {
      proxy[name] = function(){
        this[predicate] = returnTrue
        return event[name].apply(event, arguments)
      }
      proxy[predicate] = returnFalse
    })
    return proxy
  }

  // emulates the 'defaultPrevented' property for browsers that have none
  function fix(event) {
    if (!('defaultPrevented' in event)) {
      event.defaultPrevented = false
      var prevent = event.preventDefault
      event.preventDefault = function() {
        this.defaultPrevented = true
        prevent.call(this)
      }
    }
  }

  $.fn.delegate = function(selector, event, callback){
    return this.each(function(i, element){
      add(element, event, callback, selector, function(fn){
        return function(e){
          var evt, match = $(e.target).closest(selector, element).get(0)
          if (match) {
            evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
            return fn.apply(match, [evt].concat([].slice.call(arguments, 1)))
          }
        }
      })
    })
  }
  $.fn.undelegate = function(selector, event, callback){
    return this.each(function(){
      remove(this, event, callback, selector)
    })
  }

  $.fn.live = function(event, callback){
    $(document.body).delegate(this.selector, event, callback)
    return this
  }
  $.fn.die = function(event, callback){
    $(document.body).undelegate(this.selector, event, callback)
    return this
  }

  $.fn.on = function(event, selector, callback){
    return !selector || $.isFunction(selector) ?
      this.bind(event, selector || callback) : this.delegate(selector, event, callback)
  }
  $.fn.off = function(event, selector, callback){
    return !selector || $.isFunction(selector) ?
      this.unbind(event, selector || callback) : this.undelegate(selector, event, callback)
  }

  $.fn.trigger = function(event, data){
    if (typeof event == 'string' || $.isPlainObject(event)) event = $.Event(event)
    fix(event)
    event.data = data
    return this.each(function(){
      // items in the collection might not be DOM elements
      // (todo: possibly support events on plain old objects)
      if('dispatchEvent' in this) this.dispatchEvent(event)
    })
  }

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  $.fn.triggerHandler = function(event, data){
    var e, result
    this.each(function(i, element){
      e = createProxy(typeof event == 'string' ? $.Event(event) : event)
      e.data = data
      e.target = element
      $.each(findHandlers(element, event.type || event), function(i, handler){
        result = handler.proxy(e)
        if (e.isImmediatePropagationStopped()) return false
      })
    })
    return result
  }

  // shortcut methods for `.bind(event, fn)` for each event type
  ;('focusin focusout load resize scroll unload click dblclick '+
  'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave '+
  'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    $.fn[event] = function(callback) {
      return callback ?
        this.bind(event, callback) :
        this.trigger(event)
    }
  })

  ;['focus', 'blur'].forEach(function(name) {
    $.fn[name] = function(callback) {
      if (callback) this.bind(name, callback)
      else this.each(function(){
        try { this[name]() }
        catch(e) {}
      })
      return this
    }
  })

  $.Event = function(type, props) {
    if (typeof type != 'string') props = type, type = props.type
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
    event.initEvent(type, bubbles, true, null, null, null, null, null, null, null, null, null, null, null, null)
    event.isDefaultPrevented = function(){ return this.defaultPrevented }
    return event
  }

})(Zepto)

;(function($){
  var jsonpID = 0,
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.defaultPrevented
  }

  // trigger an Ajax "global" event
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // Number of active Ajax requests
  $.active = 0

  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }
  function ajaxSuccess(data, xhr, settings) {
    var context = settings.context, status = 'success'
    settings.success.call(context, data, status, xhr)
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    ajaxComplete(status, xhr, settings)
  }
  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings) {
    var context = settings.context
    settings.error.call(context, xhr, type, error)
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error])
    ajaxComplete(type, xhr, settings)
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  // Empty function, used as default callback
  function empty() {}

  $.ajaxJSONP = function(options){
    if (!('type' in options)) return $.ajax(options)

    var callbackName = 'jsonp' + (++jsonpID),
      script = document.createElement('script'),
      cleanup = function() {
        clearTimeout(abortTimeout)
        $(script).remove()
        delete window[callbackName]
      },
      abort = function(type){
        cleanup()
        // In case of manual abort or timeout, keep an empty function as callback
        // so that the SCRIPT tag that eventually loads won't result in an error.
        if (!type || type == 'timeout') window[callbackName] = empty
        ajaxError(null, type || 'abort', xhr, options)
      },
      xhr = { abort: abort }, abortTimeout

    if (ajaxBeforeSend(xhr, options) === false) {
      abort('abort')
      return false
    }

    window[callbackName] = function(data){
      cleanup()
      ajaxSuccess(data, xhr, options)
    }

    script.onerror = function() { abort('error') }

    script.src = options.url.replace(/=\?/, '=' + callbackName)
    $('head').append(script)

    if (options.timeout > 0) abortTimeout = setTimeout(function(){
      abort('timeout')
    }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest()
    },
    // MIME types mapping
    accepts: {
      script: 'text/javascript, application/javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0,
    // Whether data should be serialized to string
    processData: true,
    // Whether the browser should be allowed to cache GET responses
    cache: true,
  }

  function mimeToDataType(mime) {
    if (mime) mime = mime.split(';', 2)[0]
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text'
  }

  function appendQuery(url, query) {
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  // serialize payload and append it to the URL for GET requests
  function serializeData(options) {
    if (options.processData && options.data && $.type(options.data) != "string")
      options.data = $.param(options.data, options.traditional)
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
      options.url = appendQuery(options.url, options.data)
  }

  $.ajax = function(options){
    var settings = $.extend({}, options || {})
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

    ajaxStart(settings)

    if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
      RegExp.$2 != window.location.host

    if (!settings.url) settings.url = window.location.toString()
    serializeData(settings)
    if (settings.cache === false) settings.url = appendQuery(settings.url, '_=' + Date.now())

    var dataType = settings.dataType, hasPlaceholder = /=\?/.test(settings.url)
    if (dataType == 'jsonp' || hasPlaceholder) {
      if (!hasPlaceholder) settings.url = appendQuery(settings.url, 'callback=?')
      return $.ajaxJSONP(settings)
    }

    var mime = settings.accepts[dataType],
        baseHeaders = { },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        xhr = settings.xhr(), abortTimeout

    if (!settings.crossDomain) baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
    if (mime) {
      baseHeaders['Accept'] = mime
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    if (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() != 'GET'))
      baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded')
    settings.headers = $.extend(baseHeaders, settings.headers || {})

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        xhr.onreadystatechange = empty;
        clearTimeout(abortTimeout)
        var result, error = false
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'))
          result = xhr.responseText

          try {
            // http://perfectionkills.com/global-eval-what-are-the-options/
            if (dataType == 'script')    (1,eval)(result)
            else if (dataType == 'xml')  result = xhr.responseXML
            else if (dataType == 'json') result = blankRE.test(result) ? null : $.parseJSON(result)
          } catch (e) { error = e }

          if (error) ajaxError(error, 'parsererror', xhr, settings)
          else ajaxSuccess(result, xhr, settings)
        } else {
          ajaxError(null, xhr.status ? 'error' : 'abort', xhr, settings)
        }
      }
    }

    var async = 'async' in settings ? settings.async : true
    xhr.open(settings.type, settings.url, async)

    for (name in settings.headers) xhr.setRequestHeader(name, settings.headers[name])

    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      return false
    }

    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty
        xhr.abort()
        ajaxError(null, 'timeout', xhr, settings)
      }, settings.timeout)

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  // handle optional data/success arguments
  function parseArguments(url, data, success, dataType) {
    var hasData = !$.isFunction(data)
    return {
      url:      url,
      data:     hasData  ? data : undefined,
      success:  !hasData ? data : $.isFunction(success) ? success : undefined,
      dataType: hasData  ? dataType || success : success
    }
  }

  $.get = function(url, data, success, dataType){
    return $.ajax(parseArguments.apply(null, arguments))
  }

  $.post = function(url, data, success, dataType){
    var options = parseArguments.apply(null, arguments)
    options.type = 'POST'
    return $.ajax(options)
  }

  $.getJSON = function(url, data, success){
    var options = parseArguments.apply(null, arguments)
    options.dataType = 'json'
    return $.ajax(options)
  }

  $.fn.load = function(url, data, success){
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector,
        options = parseArguments(url, data, success),
        callback = options.success
    if (parts.length > 1) options.url = parts[0], selector = parts[1]
    options.success = function(response){
      self.html(selector ?
        $('<div>').html(response.replace(rscript, "")).find(selector)
        : response)
      callback && callback.apply(self, arguments)
    }
    $.ajax(options)
    return this
  }

  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope){
    var type, array = $.isArray(obj)
    $.each(obj, function(key, value) {
      type = $.type(value)
      if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (type == "array" || (!traditional && type == "object"))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function(obj, traditional){
    var params = []
    params.add = function(k, v){ this.push(escape(k) + '=' + escape(v)) }
    serialize(params, obj, traditional)
    return params.join('&').replace(/%20/g, '+')
  }
})(Zepto)

;(function ($) {
  $.fn.serializeArray = function () {
    var result = [], el
    $( Array.prototype.slice.call(this.get(0).elements) ).each(function () {
      el = $(this)
      var type = el.attr('type')
      if (this.nodeName.toLowerCase() != 'fieldset' &&
        !this.disabled && type != 'submit' && type != 'reset' && type != 'button' &&
        ((type != 'radio' && type != 'checkbox') || this.checked))
        result.push({
          name: el.attr('name'),
          value: el.val()
        })
    })
    return result
  }

  $.fn.serialize = function () {
    var result = []
    this.serializeArray().forEach(function (elm) {
      result.push( encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value) )
    })
    return result.join('&')
  }

  $.fn.submit = function (callback) {
    if (callback) this.bind('submit', callback)
    else if (this.length) {
      var event = $.Event('submit')
      this.eq(0).trigger(event)
      if (!event.defaultPrevented) this.get(0).submit()
    }
    return this
  }

})(Zepto)

;(function($, undefined){
  var prefix = '', eventPrefix, endEventName, endAnimationName,
    vendors = { Webkit: 'webkit', Moz: '', O: 'o', ms: 'MS' },
    document = window.document, testEl = document.createElement('div'),
    supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
    transform,
    transitionProperty, transitionDuration, transitionTiming,
    animationName, animationDuration, animationTiming,
    cssReset = {}

  function dasherize(str) { return downcase(str.replace(/([a-z])([A-Z])/, '$1-$2')) }
  function downcase(str) { return str.toLowerCase() }
  function normalizeEvent(name) { return eventPrefix ? eventPrefix + name : downcase(name) }

  $.each(vendors, function(vendor, event){
    if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
      prefix = '-' + downcase(vendor) + '-'
      eventPrefix = event
      return false
    }
  })

  transform = prefix + 'transform'
  cssReset[transitionProperty = prefix + 'transition-property'] =
  cssReset[transitionDuration = prefix + 'transition-duration'] =
  cssReset[transitionTiming   = prefix + 'transition-timing-function'] =
  cssReset[animationName      = prefix + 'animation-name'] =
  cssReset[animationDuration  = prefix + 'animation-duration'] =
  cssReset[animationTiming    = prefix + 'animation-timing-function'] = ''

  $.fx = {
    off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
    speeds: { _default: 400, fast: 200, slow: 600 },
    cssPrefix: prefix,
    transitionEnd: normalizeEvent('TransitionEnd'),
    animationEnd: normalizeEvent('AnimationEnd')
  }

  $.fn.animate = function(properties, duration, ease, callback){
    if ($.isPlainObject(duration))
      ease = duration.easing, callback = duration.complete, duration = duration.duration
    if (duration) duration = (typeof duration == 'number' ? duration :
                    ($.fx.speeds[duration] || $.fx.speeds._default)) / 1000
    return this.anim(properties, duration, ease, callback)
  }

  $.fn.anim = function(properties, duration, ease, callback){
    var key, cssValues = {}, cssProperties, transforms = '',
        that = this, wrappedCallback, endEvent = $.fx.transitionEnd

    if (duration === undefined) duration = 0.4
    if ($.fx.off) duration = 0

    if (typeof properties == 'string') {
      // keyframe animation
      cssValues[animationName] = properties
      cssValues[animationDuration] = duration + 's'
      cssValues[animationTiming] = (ease || 'linear')
      endEvent = $.fx.animationEnd
    } else {
      cssProperties = []
      // CSS transitions
      for (key in properties)
        if (supportedTransforms.test(key)) transforms += key + '(' + properties[key] + ') '
        else cssValues[key] = properties[key], cssProperties.push(dasherize(key))

      if (transforms) cssValues[transform] = transforms, cssProperties.push(transform)
      if (duration > 0 && typeof properties === 'object') {
        cssValues[transitionProperty] = cssProperties.join(', ')
        cssValues[transitionDuration] = duration + 's'
        cssValues[transitionTiming] = (ease || 'linear')
      }
    }

    wrappedCallback = function(event){
      if (typeof event !== 'undefined') {
        if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
        $(event.target).unbind(endEvent, wrappedCallback)
      }
      $(this).css(cssReset)
      callback && callback.call(this)
    }
    if (duration > 0) this.bind(endEvent, wrappedCallback)

    // trigger page reflow so new elements can animate
    this.size() && this.get(0).clientLeft

    this.css(cssValues)

    if (duration <= 0) setTimeout(function() {
      that.each(function(){ wrappedCallback.call(this) })
    }, 0)

    return this
  }

  testEl = null
})(Zepto)





    /*!Extend touch.js*/
/**
 * @import core/zepto.js
 * @file 提供简单的手势支持
 */
//     Zepto.js
//     (c) 2010-2012 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
    var touch = {},
        touchTimeout, tapTimeout, swipeTimeout,
        longTapDelay = 750, longTapTimeout

    function parentIfText(node) {
        return 'tagName' in node ? node : node.parentNode
    }

    function swipeDirection(x1, x2, y1, y2) {
        var xDelta = Math.abs(x1 - x2), yDelta = Math.abs(y1 - y2)
        return xDelta >= yDelta ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
    }

    function longTap() {
        longTapTimeout = null
        if (touch.last) {
            touch.el.trigger('longTap')
            touch = {}
        }
    }

    function cancelLongTap() {
        if (longTapTimeout) clearTimeout(longTapTimeout)
        longTapTimeout = null
    }

    function cancelAll() {
        if (touchTimeout) clearTimeout(touchTimeout)
        if (tapTimeout) clearTimeout(tapTimeout)
        if (swipeTimeout) clearTimeout(swipeTimeout)
        if (longTapTimeout) clearTimeout(longTapTimeout)
        touchTimeout = tapTimeout = swipeTimeout = longTapTimeout = null
        touch = {}
    }

    $(document).ready(function(){
        var now, delta

        $(document.body)
            .bind('touchstart', function(e){
                now = Date.now()
                delta = now - (touch.last || now)
                touch.el = $(parentIfText(e.touches[0].target))
                touchTimeout && clearTimeout(touchTimeout)
                touch.x1 = e.touches[0].pageX
                touch.y1 = e.touches[0].pageY
                if (delta > 0 && delta <= 250) touch.isDoubleTap = true
                touch.last = now
                longTapTimeout = setTimeout(longTap, longTapDelay)
            })
            .bind('touchmove', function(e){
                cancelLongTap()
                touch.x2 = e.touches[0].pageX
                touch.y2 = e.touches[0].pageY
                if (Math.abs(touch.x1 - touch.x2) > 10)
                    e.preventDefault()
            })
            .bind('touchend', function(e){
                cancelLongTap()

                // swipe
                if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
                    (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30))

                    swipeTimeout = setTimeout(function() {
                        touch.el.trigger('swipe')
                        touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
                        touch = {}
                    }, 0)

                // normal tap
                else if ('last' in touch)

                // delay by one tick so we can cancel the 'tap' event if 'scroll' fires
                // ('tap' fires before 'scroll')
                    tapTimeout = setTimeout(function() {

                        // trigger universal 'tap' with the option to cancelTouch()
                        // (cancelTouch cancels processing of single vs double taps for faster 'tap' response)
                        var event = $.Event('tap')
                        event.cancelTouch = cancelAll
                        touch.el.trigger(event)

                        // trigger double tap immediately
                        if (touch.isDoubleTap) {
                            touch.el.trigger('doubleTap')
                            touch = {}
                        }

                        // trigger single tap after 250ms of inactivity
                        else {
                            touchTimeout = setTimeout(function(){
                                touchTimeout = null
                                touch.el.trigger('singleTap')
                                touch = {}
                            }, 250)
                        }

                    }, 0)

            })
            .bind('touchcancel', cancelAll)

        $(window).bind('scroll', cancelAll)
    })

    ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown', 'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function(m){
        $.fn[m] = function(callback){ return this.bind(m, callback) }
    })
})(Zepto);

/*!Extend zepto.extend.js*/
/**
 * @name zepto.extend
 * @file 对Zepto做了些扩展，以下所有JS都依赖与此文件
 * @desc 对Zepto一些扩展，组件必须依赖
 * @import core/zepto.js
 */

(function($){
    $.extend($, {
        contains: function(parent, node) {
            /**
             * modified by chenluyang
             * @reason ios4 safari下，无法判断包含文字节点的情况
             * @original return parent !== node && parent.contains(node)
             */
            return parent.compareDocumentPosition
                ? !!(parent.compareDocumentPosition(node) & 16)
                : parent !== node && parent.contains(node)
        }
    });
})(Zepto);


//Core.js
;(function($, undefined) {
    //扩展在Zepto静态类上
    $.extend($, {
        /**
         * @grammar $.toString(obj)  ⇒ string
         * @name $.toString
         * @desc toString转化
         */
        toString: function(obj) {
            return Object.prototype.toString.call(obj);
        },

        /**
         * @desc 从集合中截取部分数据，这里说的集合，可以是数组，也可以是跟数组性质很像的对象，比如arguments
         * @name $.slice
         * @grammar $.slice(collection, [index])  ⇒ array
         * @example (function(){
         *     var args = $.slice(arguments, 2);
         *     console.log(args); // => [3]
         * })(1, 2, 3);
         */
        slice: function(array, index) {
            return Array.prototype.slice.call(array, index || 0);
        },

        /**
         * @name $.later
         * @grammar $.later(fn, [when, [periodic, [context, [data]]]])  ⇒ timer
         * @desc 延迟执行fn
         * **参数:**
         * - ***fn***: 将要延时执行的方法
         * - ***when***: *可选(默认 0)* 什么时间后执行
         * - ***periodic***: *可选(默认 false)* 设定是否是周期性的执行
         * - ***context***: *可选(默认 undefined)* 给方法设定上下文
         * - ***data***: *可选(默认 undefined)* 给方法设定传入参数
         * @example $.later(function(str){
         *     console.log(this.name + ' ' + str); // => Example hello
         * }, 250, false, {name:'Example'}, ['hello']);
         */
        later: function(fn, when, periodic, context, data) {
            return window['set' + (periodic ? 'Interval' : 'Timeout')](function() {
                fn.apply(context, data);
            }, when || 0);
        },

        /**
         * @desc 解析模版
         * @grammar $.parseTpl(str, data)  ⇒ string
         * @name $.parseTpl
         * @example var str = "<p><%=name%></p>",
         * obj = {name: 'ajean'};
         * console.log($.parseTpl(str, data)); // => <p>ajean</p>
         */
        parseTpl: function(str, data) {
            var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' + 'with(obj||{}){__p.push(\'' + str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/<%=([\s\S]+?)%>/g, function(match, code) {
                return "'," + code.replace(/\\'/g, "'") + ",'";
            }).replace(/<%([\s\S]+?)%>/g, function(match, code) {
                    return "');" + code.replace(/\\'/g, "'").replace(/[\r\n\t]/g, ' ') + "__p.push('";
                }).replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t') + "');}return __p.join('');";
            var func = new Function('obj', tmpl);
            return data ? func(data) : func;
        },

        /**
         * @desc 减少执行频率, 多次调用，在指定的时间内，只会执行一次。
         * **options:**
         * - ***delay***: 延时时间
         * - ***fn***: 被稀释的方法
         * - ***debounce_mode***: 是否开启防震动模式, true:start, false:end
         *
         * <code type="text">||||||||||||||||||||||||| (空闲) |||||||||||||||||||||||||
         * X    X    X    X    X    X      X    X    X    X    X    X</code>
         *
         * @grammar $.throttle(delay, fn) ⇒ function
         * @name $.throttle
         * @example var touchmoveHander = function(){
         *     //....
         * }
         * //绑定事件
         * $(document).bind('touchmove', $.throttle(250, touchmoveHander));//频繁滚动，每250ms，执行一次touchmoveHandler
         *
         * //解绑事件
         * $(document).unbind('touchmove', touchmoveHander);//注意这里面unbind还是touchmoveHander,而不是$.throttle返回的function, 当然unbind那个也是一样的效果
         *
         */
        throttle: function(delay, fn, debounce_mode) {
            var last = 0,
                timeId;

            if (typeof fn !== 'function') {
                debounce_mode = fn;
                fn = delay;
                delay = 250;
            }

            function wrapper() {
                var that = this,
                    period = Date.now() - last,
                    args = arguments;

                function exec() {
                    last = Date.now();
                    fn.apply(that, args);
                };

                function clear() {
                    timeId = undefined;
                };

                if (debounce_mode && !timeId) {
                    // debounce模式 && 第一次调用
                    exec();
                }

                timeId && clearTimeout(timeId);
                if (debounce_mode === undefined && period > delay) {
                    // throttle, 执行到了delay时间
                    exec();
                } else {
                    // debounce, 如果是start就clearTimeout
                    timeId = setTimeout(debounce_mode ? clear : exec, debounce_mode === undefined ? delay - period : delay);
                }
            };
            // for event bind | unbind
            wrapper._zid = fn._zid = fn._zid || $.proxy(fn)._zid;
            return wrapper;
        },

        /**
         * @desc 减少执行频率, 在指定的时间内, 多次调用，只会执行一次。
         * **options:**
         * - ***delay***: 延时时间
         * - ***fn***: 被稀释的方法
         * - ***t***: 指定是在开始处执行，还是结束是执行, true:start, false:end
         *
         * 非at_begin模式
         * <code type="text">||||||||||||||||||||||||| (空闲) |||||||||||||||||||||||||
         *                         X                                X</code>
         * at_begin模式
         * <code type="text">||||||||||||||||||||||||| (空闲) |||||||||||||||||||||||||
         * X                                X                        </code>
         *
         * @grammar $.debounce(delay, fn[, at_begin]) ⇒ function
         * @name $.debounce
         * @example var touchmoveHander = function(){
         *     //....
         * }
         * //绑定事件
         * $(document).bind('touchmove', $.debounce(250, touchmoveHander));//频繁滚动，只要间隔时间不大于250ms, 在一系列移动后，只会执行一次
         *
         * //解绑事件
         * $(document).unbind('touchmove', touchmoveHander);//注意这里面unbind还是touchmoveHander,而不是$.debounce返回的function, 当然unbind那个也是一样的效果
         */
        debounce: function(delay, fn, t) {
            return fn === undefined ? $.throttle(250, delay, false) : $.throttle(delay, fn, t === undefined ? false : t !== false);
        }
    });

    /**
     * 扩展类型判断
     * @param {Any} obj
     * @see isString, isBoolean, isRegExp, isNumber, isDate, isObject, isNull, isUdefined
     */
    /**
     * @name $.isString
     * @grammar $.isString(val)  ⇒ Boolean
     * @desc 判断变量类型是否为***String***
     * @example console.log($.isString({}));// => false
     * console.log($.isString(123));// => false
     * console.log($.isString('123'));// => true
     */
    /**
     * @name $.isBoolean
     * @grammar $.isBoolean(val)  ⇒ Boolean
     * @desc 判断变量类型是否为***Boolean***
     * @example console.log($.isBoolean(1));// => false
     * console.log($.isBoolean('true'));// => false
     * console.log($.isBoolean(false));// => true
     */
    /**
     * @name $.isRegExp
     * @grammar $.isRegExp(val)  ⇒ Boolean
     * @desc 判断变量类型是否为***RegExp***
     * @example console.log($.isRegExp(1));// => false
     * console.log($.isRegExp('test'));// => false
     * console.log($.isRegExp(/test/));// => true
     */
    /**
     * @name $.isNumber
     * @grammar $.isNumber(val)  ⇒ Boolean
     * @desc 判断变量类型是否为***Number***
     * @example console.log($.isNumber('123'));// => false
     * console.log($.isNumber(true));// => false
     * console.log($.isNumber(123));// => true
     */
    /**
     * @name $.isDate
     * @grammar $.isDate(val)  ⇒ Boolean
     * @desc 判断变量类型是否为***Date***
     * @example console.log($.isDate('123'));// => false
     * console.log($.isDate('2012-12-12'));// => false
     * console.log($.isDate(new Date()));// => true
     */
    /**
     * @name $.isObject
     * @grammar $.isObject(val)  ⇒ Boolean
     * @desc 判断变量类型是否为***Object***
     * @example console.log($.isObject('123'));// => false
     * console.log($.isObject(true));// => false
     * console.log($.isObject({}));// => true
     */
    /**
     * @name $.isNull
     * @grammar $.isNull(val)  ⇒ Boolean
     * @desc 判断变量类型是否为***null***
     * @example console.log($.isNull(false));// => false
     * console.log($.isNull(0));// => false
     * console.log($.isNull(null));// => true
     */
    /**
     * @name $.isUndefined
     * @grammar $.isUndefined(val)  ⇒ Boolean
     * @desc 判断变量类型是否为***undefined***
     * @example
     * console.log($.isUndefined(false));// => false
     * console.log($.isUndefined(0));// => false
     * console.log($.isUndefined(a));// => true
     */
    $.each("String Boolean RegExp Number Date Object Null Undefined".split(" "), function( i, name ){
        var fn;

        if( 'is' + name in $ ) return;//already defined then ignore.

        switch (name) {
            case 'Null':
                fn = function(obj){ return obj === null; };
                break;
            case 'Undefined':
                fn = function(obj){ return obj === undefined; };
                break;
            default:
                fn = function(obj){ return new RegExp(name + ']', 'i').test( toString(obj) )};
        }
        $['is'+name] = fn;
    });

    var toString = $.toString;

})(Zepto);

//Support.js
(function($, undefined) {
    var ua = navigator.userAgent,
        na = navigator.appVersion,
        br = $.browser;

    /**
     * @name $.browser
     * @desc 扩展zepto中对browser的检测
     *
     * **可用属性**
     * - ***qq*** 检测qq浏览器
     * - ***chrome*** 检测chrome浏览器
     * - ***uc*** 检测uc浏览器
     * - ***version*** 检测浏览器版本
     *
     * @example
     * if ($.browser.qq) {      //在qq浏览器上打出此log
     *     console.log('this is qq browser');
     * }
     */
    $.extend( br, {
        qq: /qq/i.test(ua),
        uc: /UC/i.test(ua) || /UC/i.test(na)
    } );

    br.uc = br.uc || !br.qq && !br.chrome && !br.firefox && !/safari/i.test(ua);

    try {
        br.version = br.uc ? na.match(/UC(?:Browser)?\/([\d.]+)/)[1] : br.qq ? ua.match(/MQQBrowser\/([\d.]+)/)[1] : br.version;
    } catch (e) {}


    /**
     * @name $.support
     * @desc 检测设备对某些属性或方法的支持情况
     *
     * **可用属性**
     * - ***orientation*** 检测是否支持转屏事件，UC中存在orientaion，但转屏不会触发该事件，故UC属于不支持转屏事件(iOS 4上qq, chrome都有这个现象)
     * - ***touch*** 检测是否支持touch相关事件
     * - ***cssTransitions*** 检测是否支持css3的transition
     * - ***has3d*** 检测是否支持translate3d的硬件加速
     *
     * @example
     * if ($.support.has3d) {      //在支持3d的设备上使用
     *     console.log('you can use transtion3d');
     * }
     */
    $.support = $.extend($.support || {}, {
        orientation: !(br.uc || (parseFloat($.os.version)<5 && (br.qq || br.chrome))) && !($.os.android && parseFloat($.os.version) > 3) && "orientation" in window && "onorientationchange" in window,
        touch: "ontouchend" in document,
        cssTransitions: "WebKitTransitionEvent" in window,
        has3d: 'WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix()
    });

})(Zepto);

//Event.js
(function($) {
    /**
     * @name $.matchMedia
     * @grammar $.matchMedia(query)  ⇒ MediaQueryList
     * @desc 是原生的window.matchMedia方法的polyfill，对于不支持matchMedia的方法系统和浏览器，按照[w3c window.matchMedia](http://www.w3.org/TR/cssom-view/#dom-window-matchmedia)的接口
     * 定义，对matchMedia方法进行了封装。原理是用css media query及transitionEnd事件来完成的。在页面中插入media query样式及元素，当query条件满足时改变该元素样式，同时这个样式是transition作用的属性，
     * 满足条件后即会触发transitionEnd，由此创建MediaQueryList的事件监听。由于transition的duration time为0.001ms，故若直接使用MediaQueryList对象的matches去判断当前是否与query匹配，会有部分延迟，
     * 建议注册addListener的方式去监听query的改变。$.matchMedia的详细实现原理及采用该方法实现的转屏统一解决方案详见
     * [GMU Pages: 转屏解决方案($.matchMedia)](https://github.com/gmuteam/GMU/wiki/%E8%BD%AC%E5%B1%8F%E8%A7%A3%E5%86%B3%E6%96%B9%E6%A1%88$.matchMedia)
     *
     * **MediaQueryList对象包含的属性**
     * - ***matches*** 是否满足query
     * - ***query*** 查询的css query，类似\'screen and (orientation: portrait)\'
     * - ***addListener*** 添加MediaQueryList对象监听器，接收回调函数，回调参数为MediaQueryList对象
     * - ***removeListener*** 移除MediaQueryList对象监听器
     *
     * @example
     * $.matchMedia('screen and (orientation: portrait)').addListener(fn);
     */
    $.matchMedia = (function() {
        var mediaId = 0,
            cls = 'gmu-media-detect',
            transitionEnd = $.fx.transitionEnd,
            cssPrefix = $.fx.cssPrefix,
            $style = $('<style></style>').append('.' + cls + '{' + cssPrefix + 'transition: width 0.001ms; width: 0; position: absolute; top: -10000px;}\n').appendTo('head');

        return function (query) {
            var id = cls + mediaId++,
                $mediaElem = $('<div class="' + cls + '" id="' + id + '"></div>').appendTo('body'),
                listeners = [],
                ret;

            $style.append('@media ' + query + ' { #' + id + ' { width: 1px; } }\n') ;   //原生matchMedia也需要添加对应的@media才能生效
            if ('matchMedia' in window) {
                return window.matchMedia(query);
            }

            $mediaElem.on(transitionEnd, function() {
                ret.matches = $mediaElem.width() === 1;
                $.each(listeners, function (i,fn) {
                    $.isFunction(fn) && fn.call(ret, ret);
                });
            });

            ret = {
                matches: $mediaElem.width() === 1 ,
                media: query,
                addListener: function (callback) {
                    listeners.push(callback);
                    return this;
                },
                removeListener: function (callback) {
                    var index = listeners.indexOf(callback);
                    ~index && listeners.splice(index, 1);
                    return this;
                }
            };

            return ret;
        };
    }());

    $(function () {
        var handleOrtchange = function (mql) {
            $(window).trigger('ortchange');
        };
        $.mediaQuery = {
            ortchange: 'screen and (width: ' + window.innerWidth + 'px)'
        };
        $.matchMedia($.mediaQuery.ortchange).addListener(handleOrtchange);
    });

    /**
     * @name Trigger Events
     * @theme event
     * @desc 扩展的事件
     * - ***scrollStop*** : scroll停下来时触发, 考虑前进或者后退后scroll事件不触发情况。
     * - ***ortchange*** : 当转屏的时候触发，兼容uc和其他不支持orientationchange的设备，利用css media query实现，解决了转屏延时及orientation事件的兼容性问题
     * @example $(document).on('scrollStop', function () {        //scroll停下来时显示scrollStop
     *     console.log('scrollStop');
     * });
     *
     * $(window).on('ortchange', function () {        //当转屏的时候触发
     *     console.log('ortchange');
     * });
     */
    /** dispatch scrollStop */
    function _registerScrollStop(){
        $(window).on('scroll', $.debounce(80, function() {
            $(document).trigger('scrollStop');
        }, false));
    }
    //在离开页面，前进或后退回到页面后，重新绑定scroll, 需要off掉所有的scroll，否则scroll时间不触发
    function _touchstartHander() {
        $(window).off('scroll');
        _registerScrollStop();
    }
    _registerScrollStop();
    $(window).on('pageshow', function(e){
        if(e.persisted) {//如果是从bfcache中加载页面
            $(document).off('touchstart', _touchstartHander).one('touchstart', _touchstartHander);
        }
    });
})(Zepto);

/*!Extend zepto.fix.js*/
/**
 * @file 实现了通用fix方法。
 * @name zepto.fix
 * @import core/zepto.extend.js
 */

/**
 * @name fix
 * @grammar fix(options)   ⇒ self
 * @desc 固顶fix方法，对不支持position:fixed的设备上将元素position设为absolute，
 * 在每次scrollstop时根据opts参数设置当前显示的位置，类似fix效果。
 *
 * Options:
 * - ''top'' {Number}: 距离顶部的px值
 * - ''left'' {Number}: 距离左侧的px值
 * - ''bottom'' {Number}: 距离底部的px值
 * - ''right'' {Number}: 距离右侧的px值
 * @example
 * var div = $('div');
 * div.fix({top:0, left:0}); //将div固顶在左上角
 * div.fix({top:0, right:0}); //将div固顶在右上角
 * div.fix({bottom:0, left:0}); //将div固顶在左下角
 * div.fix({bottom:0, right:0}); //将div固顶在右下角
 *
 */

(function ($, undefined) {
    $.extend($.fn, {
        fix: function(opts) {
            var me = this;                      //如果一个集合中的第一元素已fix，则认为这个集合的所有元素已fix，
            if(me.attr('isFixed')) return me;   //这样在操作时就可以针对集合进行操作，不必单独绑事件去操作
            me.css(opts).css('position', 'fixed').attr('isFixed', true);
            var buff = $('<div style="position:fixed;top:10px;"></div>').appendTo('body'),
                top = buff[0].getBoundingClientRect().top,
                checkFixed = function() {
                    if(window.pageYOffset > 0) {
                        if(buff[0].getBoundingClientRect().top !== top) {
                            me.css('position', 'absolute');
                            doFixed();
                            $(document).on('scrollStop', doFixed);
                            $(window).on('ortchange', doFixed);
                        }
                        $(document).off('scrollStop', checkFixed);
                        buff.remove();
                    }
                },
                doFixed = function() {
                    me.css({
                        top: window.pageYOffset + (opts.bottom !== undefined ? window.innerHeight - me.height() - opts.bottom : (opts.top ||0)),
                        left: opts.right !== undefined ? document.body.offsetWidth - me.width() - opts.right : (opts.left || 0)
                    });
                    opts.width == '100%' && me.css('width', document.body.offsetWidth);
                };
            $(document).on('scrollStop', checkFixed);
            return me;
        }
    });
}(Zepto));
/*!Extend zepto.highlight.js*/
/**
 *  @file 实现了通用highlight方法。
 *  @name zepto.highlight
 *  @desc 点击高亮效果
 *  @import core/zepto.js, core/zepto.extend.js
 */
(function($) {
    var actElem, inited = false, timer, cls, removeCls = function(){
        clearTimeout(timer);
        if(actElem && (cls = actElem.attr('highlight-cls'))){
            actElem.removeClass(cls).attr('highlight-cls', '');
            actElem = null;
        }
    };
    $.extend($.fn, {
        /**
         * @name highlight
         * @desc 禁用掉系统的高亮，当手指移动到元素上时添加指定class，手指移开时，移除该class
         * @grammar  highlight(className)   ⇒ self
         * @example var div = $('div');
         * div.highlight('div-hover');
         *
         * $('a').highlight();// 把所有a的自带的高亮效果去掉。
         */
        highlight: function(className) {
            inited = inited || !!$(document).on('touchend.highlight touchmove.highlight touchcancel.highlight', removeCls);
            removeCls();
            return this.each(function() {
                var $el = $(this);
                $el.css('-webkit-tap-highlight-color', 'rgba(255,255,255,0)').off('touchstart.highlight');
                className && $el.on('touchstart.highlight', function() {
                    timer = $.later(function() {
                        actElem = $el.attr('highlight-cls', className).addClass(className);
                    }, 100);
                });
            });
        }
    });
})(Zepto);

/*!Extend zepto.imglazyload.js*/
/**
 *  @file 基于Zepto的图片延迟加载插件
 *  @name zepto.imglazyload
 *  @desc 图片延迟加载
 *  @import core/zepto.extend.js
 */
(function ($) {
    /**
     * @name imglazyload
     * @grammar  imglazyload(opts)   ⇒ self
     * @desc 图片延迟加载
     * **Options**
     * - ''placeHolder''     {String}:              (可选, 默认值:\'\')图片显示前的占位符
     * - ''container''       {Array|Selector}:      (可选, 默认值:window)图片延迟加载容器，若innerScroll为true，则传外层wrapper容器即可
     * - ''threshold''       {Array|Selector}:      (可选, 默认值:0)阀值，为正值则提前加载
     * - ''urlName''         {String}:              (可选, 默认值:data-url)图片url名称
     * - ''eventName''       {String}:              (可选, 默认值:scrollStop)绑定事件方式
     * - ''refresh''         {Boolean}              (可选, 默认值:false)是否是更新操作，若是页面追加图片，可以将该参数设为true
     * - ''innerScroll''     {Boolean}              (可选, 默认值:false)是否是内滚，若内滚，则不绑定eventName事件，用户需在外部绑定相应的事件，可调$.fn.imglazyload.detect去检测图片是否出现在container中
     * - ''isVertical''      {Boolean}              (可选, 默认值:true)是否竖滚
     * - ''startload''       {Function}             (可选, 默认值:null)开始加载前的事件，该事件作为参数，不是trigger的
     *
     * **events**
     * - ''startload'' 开始加载图片
     * - ''loadcomplete'' 加载完成
     * - ''error'' 加载失败
     *
     * @example $('.lazy-load').imglazyload();
     * $('.lazy-load').imglazyload().on('error', function (e) {
     *     e.preventDefault();      //该图片不再加载
     * });
     */
    var pedding;
    $.fn.imglazyload = function (opts) {
        var splice = Array.prototype.splice,
            opts = $.extend({
                threshold:0,
                container:window,
                urlName:'data-url',
                placeHolder:'',
                eventName:'scrollStop',
                refresh: false,
                innerScroll: false,
                isVertical: true,
                startload: null
            }, opts),
            $viewPort = $(opts.container),
            isVertical = opts.isVertical,
            isWindow = $.isWindow($viewPort.get(0)),
            OFFSET = {
                win: [isVertical ? 'scrollY' : 'scrollX', isVertical ? 'innerHeight' : 'innerWidth'],
                img: [isVertical ? 'top' : 'left', isVertical ? 'height' : 'width']
            };

        !isWindow && (OFFSET['win'] = OFFSET['img']);   //若container不是window，则OFFSET中取值同img

        function isInViewport(offset) {      //图片出现在可视区的条件
            var viewOffset = isWindow ? window : $viewPort.offset(),
                viewTop = viewOffset[OFFSET.win[0]],
                viewHeight = viewOffset[OFFSET.win[1]];
            return viewTop >= offset[OFFSET.img[0]] - opts.threshold - viewHeight && viewTop <= offset[OFFSET.img[0]] + offset[OFFSET.img[1]];
        }

        pedding = $.slice(this).reverse();
        if (opts.refresh) return this;      //更新pedding值，用于在页面追加图片

        function _load(div) {     //加载图片，并派生事件
            var $div = $(div), $img;
            $.isFunction(opts.startload) && opts.startload.call($div);
            $img = $('<img />').on('load',function () {
                $div.replaceWith($img).trigger('loadcomplete');
                $img.off('load');
            }).on('error',function () {     //图片加载失败处理
                    var errorEvent = $.Event('error');       //派生错误处理的事件
                    $div.trigger(errorEvent);
                    errorEvent.defaultPrevented || pedding.push(div);
                    $img.off('error').remove();
                }).attr('src', $div.attr(opts.urlName));
        }

        function _detect() {     //检测图片是否出现在可视区，并对满足条件的开始加载
            var i, $image, offset, div;
            for (i = pedding.length; i--;) {
                $image = $(div = pedding[i]);
                offset = $image.offset();
                isInViewport(offset) && (splice.call(pedding, i, 1), _load(div));
            }
        }

        $(document).ready(function () {    //页面加载时条件检测
            opts.placeHolder && $(pedding).append(opts.placeHolder);     //初化时将placeHolder存入
            _detect();
        });

        !opts.innerScroll && $(window).on(opts.eventName + ' ortchange', function () {    //不是内滚时，在window上绑定事件
            _detect();
        });

        $.fn.imglazyload.detect = _detect;    //暴露检测方法，供外部调用

        return this;
    };

})(Zepto);

/*!Extend zepto.iscroll.js*/
/*!
 * iScroll v4.2.2 ~ Copyright (c) 2012 Matteo Spinelli, http://cubiq.org
 * Released under MIT license, http://cubiq.org/license
 */
(function(window, doc){
    var m = Math,_bindArr = [],
        dummyStyle = doc.createElement('div').style,
        vendor = (function () {
            var vendors = 'webkitT,MozT,msT,OT,t'.split(','),
                t,
                i = 0,
                l = vendors.length;

            for ( ; i < l; i++ ) {
                t = vendors[i] + 'ransform';
                if ( t in dummyStyle ) {
                    return vendors[i].substr(0, vendors[i].length - 1);
                }
            }

            return false;
        })(),
        cssVendor = vendor ? '-' + vendor.toLowerCase() + '-' : '',


    // Style properties
        transform = prefixStyle('transform'),
        transitionProperty = prefixStyle('transitionProperty'),
        transitionDuration = prefixStyle('transitionDuration'),
        transformOrigin = prefixStyle('transformOrigin'),
        transitionTimingFunction = prefixStyle('transitionTimingFunction'),
        transitionDelay = prefixStyle('transitionDelay'),

    // Browser capabilities
        isAndroid = (/android/gi).test(navigator.appVersion),
        isTouchPad = (/hp-tablet/gi).test(navigator.appVersion),

        has3d = prefixStyle('perspective') in dummyStyle,
        hasTouch = 'ontouchstart' in window && !isTouchPad,
        hasTransform = !!vendor,
        hasTransitionEnd = prefixStyle('transition') in dummyStyle,

        RESIZE_EV = 'onorientationchange' in window ? 'orientationchange' : 'resize',
        START_EV = hasTouch ? 'touchstart' : 'mousedown',
        MOVE_EV = hasTouch ? 'touchmove' : 'mousemove',
        END_EV = hasTouch ? 'touchend' : 'mouseup',
        CANCEL_EV = hasTouch ? 'touchcancel' : 'mouseup',
        TRNEND_EV = (function () {
            if ( vendor === false ) return false;

            var transitionEnd = {
                ''			: 'transitionend',
                'webkit'	: 'webkitTransitionEnd',
                'Moz'		: 'transitionend',
                'O'			: 'otransitionend',
                'ms'		: 'MSTransitionEnd'
            };

            return transitionEnd[vendor];
        })(),

        nextFrame = (function() {
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function(callback) { return setTimeout(callback, 1); };
        })(),
        cancelFrame = (function () {
            return window.cancelRequestAnimationFrame ||
                window.webkitCancelAnimationFrame ||
                window.webkitCancelRequestAnimationFrame ||
                window.mozCancelRequestAnimationFrame ||
                window.oCancelRequestAnimationFrame ||
                window.msCancelRequestAnimationFrame ||
                clearTimeout;
        })(),

    // Helpers
        translateZ = has3d ? ' translateZ(0)' : '',

    // Constructor
        iScroll = function (el, options) {
            var that = this,
                i;

            that.wrapper = typeof el == 'object' ? el : doc.getElementById(el);
            that.wrapper.style.overflow = 'hidden';
            that.scroller = that.wrapper.children[0];

            that.translateZ = translateZ;
            // Default options
            that.options = {
                hScroll: true,
                vScroll: true,
                x: 0,
                y: 0,
                bounce: true,
                bounceLock: false,
                momentum: true,
                lockDirection: true,
                useTransform: true,
                useTransition: false,
                topOffset: 0,
                checkDOMChanges: false,		// Experimental
                handleClick: true,


                // Events
                onRefresh: null,
                onBeforeScrollStart: function (e) { e.preventDefault(); },
                onScrollStart: null,
                onBeforeScrollMove: null,
                onScrollMove: null,
                onBeforeScrollEnd: null,
                onScrollEnd: null,
                onTouchEnd: null,
                onDestroy: null

            };

            // User defined options
            for (i in options) that.options[i] = options[i];

            // Set starting position
            that.x = that.options.x;
            that.y = that.options.y;

            // Normalize options
            that.options.useTransform = hasTransform && that.options.useTransform;

            that.options.useTransition = hasTransitionEnd && that.options.useTransition;



            // Set some default styles
            that.scroller.style[transitionProperty] = that.options.useTransform ? cssVendor + 'transform' : 'top left';
            that.scroller.style[transitionDuration] = '0';
            that.scroller.style[transformOrigin] = '0 0';
            if (that.options.useTransition) that.scroller.style[transitionTimingFunction] = 'cubic-bezier(0.33,0.66,0.66,1)';

            if (that.options.useTransform) that.scroller.style[transform] = 'translate(' + that.x + 'px,' + that.y + 'px)' + translateZ;
            else that.scroller.style.cssText += ';position:absolute;top:' + that.y + 'px;left:' + that.x + 'px';



            that.refresh();

            that._bind(RESIZE_EV, window);
            that._bind(START_EV);


            if (that.options.checkDOMChanges) that.checkDOMTime = setInterval(function () {
                that._checkDOMChanges();
            }, 500);
        };

// Prototype
    iScroll.prototype = {
        enabled: true,
        x: 0,
        y: 0,
        steps: [],
        scale: 1,
        currPageX: 0, currPageY: 0,
        pagesX: [], pagesY: [],
        aniTime: null,
        isStopScrollAction:false,

        handleEvent: function (e) {
            var that = this;
            switch(e.type) {
                case START_EV:
                    if (!hasTouch && e.button !== 0) return;
                    that._start(e);
                    break;
                case MOVE_EV: that._move(e); break;
                case END_EV:
                case CANCEL_EV: that._end(e); break;
                case RESIZE_EV: that._resize(); break;
                case TRNEND_EV: that._transitionEnd(e); break;
            }
        },

        _checkDOMChanges: function () {
            if (this.moved ||  this.animating ||
                (this.scrollerW == this.scroller.offsetWidth * this.scale && this.scrollerH == this.scroller.offsetHeight * this.scale)) return;

            this.refresh();
        },

        _resize: function () {
            var that = this;
            setTimeout(function () { that.refresh(); }, isAndroid ? 200 : 0);
        },

        _pos: function (x, y) {
            x = this.hScroll ? x : 0;
            y = this.vScroll ? y : 0;

            if (this.options.useTransform) {
                this.scroller.style[transform] = 'translate(' + x + 'px,' + y + 'px) scale(' + this.scale + ')' + translateZ;
            } else {
                x = m.round(x);
                y = m.round(y);
                this.scroller.style.left = x + 'px';
                this.scroller.style.top = y + 'px';
            }

            this.x = x;
            this.y = y;

        },



        _start: function (e) {
            var that = this,
                point = hasTouch ? e.touches[0] : e,
                matrix, x, y,
                c1, c2;

            if (!that.enabled) return;

            if (that.options.onBeforeScrollStart) that.options.onBeforeScrollStart.call(that, e);

            if (that.options.useTransition ) that._transitionTime(0);

            that.moved = false;
            that.animating = false;

            that.distX = 0;
            that.distY = 0;
            that.absDistX = 0;
            that.absDistY = 0;
            that.dirX = 0;
            that.dirY = 0;
            that.isStopScrollAction = false;

            if (that.options.momentum) {
                if (that.options.useTransform) {
                    // Very lame general purpose alternative to CSSMatrix
                    matrix = getComputedStyle(that.scroller, null)[transform].replace(/[^0-9\-.,]/g, '').split(',');
                    x = +matrix[4];
                    y = +matrix[5];
                } else {
                    x = +getComputedStyle(that.scroller, null).left.replace(/[^0-9-]/g, '');
                    y = +getComputedStyle(that.scroller, null).top.replace(/[^0-9-]/g, '');
                }

                if (x != that.x || y != that.y) {
                    that.isStopScrollAction = true;
                    if (that.options.useTransition) that._unbind(TRNEND_EV);
                    else cancelFrame(that.aniTime);
                    that.steps = [];
                    that._pos(x, y);
                    if (that.options.onScrollEnd) that.options.onScrollEnd.call(that);
                }
            }



            that.startX = that.x;
            that.startY = that.y;
            that.pointX = point.pageX;
            that.pointY = point.pageY;

            that.startTime = e.timeStamp || Date.now();

            if (that.options.onScrollStart) that.options.onScrollStart.call(that, e);

            that._bind(MOVE_EV, window);
            that._bind(END_EV, window);
            that._bind(CANCEL_EV, window);
        },

        _move: function (e) {
            var that = this,
                point = hasTouch ? e.touches[0] : e,
                deltaX = point.pageX - that.pointX,
                deltaY = point.pageY - that.pointY,
                newX = that.x + deltaX,
                newY = that.y + deltaY,

                timestamp = e.timeStamp || Date.now();

            if (that.options.onBeforeScrollMove) that.options.onBeforeScrollMove.call(that, e);

            that.pointX = point.pageX;
            that.pointY = point.pageY;

            // Slow down if outside of the boundaries
            if (newX > 0 || newX < that.maxScrollX) {
                newX = that.options.bounce ? that.x + (deltaX / 2) : newX >= 0 || that.maxScrollX >= 0 ? 0 : that.maxScrollX;
            }
            if (newY > that.minScrollY || newY < that.maxScrollY) {
                newY = that.options.bounce ? that.y + (deltaY / 2) : newY >= that.minScrollY || that.maxScrollY >= 0 ? that.minScrollY : that.maxScrollY;
            }

            that.distX += deltaX;
            that.distY += deltaY;
            that.absDistX = m.abs(that.distX);
            that.absDistY = m.abs(that.distY);

            if (that.absDistX < 6 && that.absDistY < 6) {
                return;
            }

            // Lock direction
            if (that.options.lockDirection) {
                if (that.absDistX > that.absDistY + 5) {
                    newY = that.y;
                    deltaY = 0;
                } else if (that.absDistY > that.absDistX + 5) {
                    newX = that.x;
                    deltaX = 0;
                }
            }

            that.moved = true;

            // internal for header scroll

            that._beforePos ? that._beforePos(newY, deltaY) && that._pos(newX, newY) : that._pos(newX, newY);

            that.dirX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
            that.dirY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

            if (timestamp - that.startTime > 300) {
                that.startTime = timestamp;
                that.startX = that.x;
                that.startY = that.y;
            }

            if (that.options.onScrollMove) that.options.onScrollMove.call(that, e);
        },

        _end: function (e) {
            if (hasTouch && e.touches.length !== 0) return;

            var that = this,
                point = hasTouch ? e.changedTouches[0] : e,
                target, ev,
                momentumX = { dist:0, time:0 },
                momentumY = { dist:0, time:0 },
                duration = (e.timeStamp || Date.now()) - that.startTime,
                newPosX = that.x,
                newPosY = that.y,
                newDuration;


            that._unbind(MOVE_EV, window);
            that._unbind(END_EV, window);
            that._unbind(CANCEL_EV, window);

            if (that.options.onBeforeScrollEnd) that.options.onBeforeScrollEnd.call(that, e);


            if (!that.moved) {

                if (hasTouch && this.options.handleClick && !that.isStopScrollAction) {
                    that.doubleTapTimer = setTimeout(function () {
                        that.doubleTapTimer = null;

                        // Find the last touched element
                        target = point.target;
                        while (target.nodeType != 1) target = target.parentNode;

                        if (target.tagName != 'SELECT' && target.tagName != 'INPUT' && target.tagName != 'TEXTAREA') {
                            ev = doc.createEvent('MouseEvents');
                            ev.initMouseEvent('click', true, true, e.view, 1,
                                point.screenX, point.screenY, point.clientX, point.clientY,
                                e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
                                0, null);
                            ev._fake = true;
                            target.dispatchEvent(ev);
                        }
                    },  0);
                }


                that._resetPos(400);

                if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
                return;
            }

            if (duration < 300 && that.options.momentum) {
                momentumX = newPosX ? that._momentum(newPosX - that.startX, duration, -that.x, that.scrollerW - that.wrapperW + that.x, that.options.bounce ? that.wrapperW : 0) : momentumX;
                momentumY = newPosY ? that._momentum(newPosY - that.startY, duration, -that.y, (that.maxScrollY < 0 ? that.scrollerH - that.wrapperH + that.y - that.minScrollY : 0), that.options.bounce ? that.wrapperH : 0) : momentumY;

                newPosX = that.x + momentumX.dist;
                newPosY = that.y + momentumY.dist;

                if ((that.x > 0 && newPosX > 0) || (that.x < that.maxScrollX && newPosX < that.maxScrollX)) momentumX = { dist:0, time:0 };
                if ((that.y > that.minScrollY && newPosY > that.minScrollY) || (that.y < that.maxScrollY && newPosY < that.maxScrollY)) momentumY = { dist:0, time:0 };
            }

            if (momentumX.dist || momentumY.dist) {
                newDuration = m.max(m.max(momentumX.time, momentumY.time), 10);



                that.scrollTo(m.round(newPosX), m.round(newPosY), newDuration);

                if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
                return;
            }



            that._resetPos(200);
            if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
        },

        _resetPos: function (time) {
            var that = this,
                resetX = that.x >= 0 ? 0 : that.x < that.maxScrollX ? that.maxScrollX : that.x,
                resetY = that.y >= that.minScrollY || that.maxScrollY > 0 ? that.minScrollY : that.y < that.maxScrollY ? that.maxScrollY : that.y;

            if (resetX == that.x && resetY == that.y) {
                if (that.moved) {
                    that.moved = false;
                    if (that.options.onScrollEnd) that.options.onScrollEnd.call(that);		// Execute custom code on scroll end
                    if (that._afterPos) that._afterPos();
                }

                return;
            }

            that.scrollTo(resetX, resetY, time || 0);
        },



        _transitionEnd: function (e) {
            var that = this;

            if (e.target != that.scroller) return;

            that._unbind(TRNEND_EV);

            that._startAni();
        },


        /**
         *
         * Utilities
         *
         */
        _startAni: function () {
            var that = this,
                startX = that.x, startY = that.y,
                startTime = Date.now(),
                step, easeOut,
                animate;

            if (that.animating) return;

            if (!that.steps.length) {
                that._resetPos(400);
                return;
            }

            step = that.steps.shift();

            if (step.x == startX && step.y == startY) step.time = 0;

            that.animating = true;
            that.moved = true;

            if (that.options.useTransition) {
                that._transitionTime(step.time);
                that._pos(step.x, step.y);
                that.animating = false;
                if (step.time) that._bind(TRNEND_EV);
                else that._resetPos(0);
                return;
            }

            animate = function () {
                var now = Date.now(),
                    newX, newY;

                if (now >= startTime + step.time) {
                    that._pos(step.x, step.y);
                    that.animating = false;
                    if (that.options.onAnimationEnd) that.options.onAnimationEnd.call(that);			// Execute custom code on animation end
                    that._startAni();
                    return;
                }

                now = (now - startTime) / step.time - 1;
                easeOut = m.sqrt(1 - now * now);
                newX = (step.x - startX) * easeOut + startX;
                newY = (step.y - startY) * easeOut + startY;
                that._pos(newX, newY);
                if (that.animating) that.aniTime = nextFrame(animate);
            };

            animate();
        },

        _transitionTime: function (time) {
            time += 'ms';
            this.scroller.style[transitionDuration] = time;

        },

        _momentum: function (dist, time, maxDistUpper, maxDistLower, size) {
            var deceleration = 0.0006,
                speed = m.abs(dist) * (this.options.speedScale||1) / time,
                newDist = (speed * speed) / (2 * deceleration),
                newTime = 0, outsideDist = 0;

            // Proportinally reduce speed if we are outside of the boundaries
            if (dist > 0 && newDist > maxDistUpper) {
                outsideDist = size / (6 / (newDist / speed * deceleration));
                maxDistUpper = maxDistUpper + outsideDist;
                speed = speed * maxDistUpper / newDist;
                newDist = maxDistUpper;
            } else if (dist < 0 && newDist > maxDistLower) {
                outsideDist = size / (6 / (newDist / speed * deceleration));
                maxDistLower = maxDistLower + outsideDist;
                speed = speed * maxDistLower / newDist;
                newDist = maxDistLower;
            }

            newDist = newDist * (dist < 0 ? -1 : 1);
            newTime = speed / deceleration;

            return { dist: newDist, time: m.round(newTime) };
        },

        _offset: function (el) {
            var left = -el.offsetLeft,
                top = -el.offsetTop;

            while (el = el.offsetParent) {
                left -= el.offsetLeft;
                top -= el.offsetTop;
            }

            if (el != this.wrapper) {
                left *= this.scale;
                top *= this.scale;
            }

            return { left: left, top: top };
        },



        _bind: function (type, el, bubble) {
            _bindArr.concat([el || this.scroller, type, this]);
            (el || this.scroller).addEventListener(type, this, !!bubble);
        },

        _unbind: function (type, el, bubble) {
            (el || this.scroller).removeEventListener(type, this, !!bubble);
        },


        /**
         *
         * Public methods
         *
         */
        destroy: function () {
            var that = this;

            that.scroller.style[transform] = '';



            // Remove the event listeners
            that._unbind(RESIZE_EV, window);
            that._unbind(START_EV);
            that._unbind(MOVE_EV, window);
            that._unbind(END_EV, window);
            that._unbind(CANCEL_EV, window);



            if (that.options.useTransition) that._unbind(TRNEND_EV);

            if (that.options.checkDOMChanges) clearInterval(that.checkDOMTime);

            if (that.options.onDestroy) that.options.onDestroy.call(that);

            //清除所有绑定的事件
            for (var i = 0, l = _bindArr.length; i < l;) {
                _bindArr[i].removeEventListener(_bindArr[i + 1], _bindArr[i + 2]);
                _bindArr[i] = null;
                i = i + 3
            }
            _bindArr = [];

            //干掉外边的容器内容
            var div = doc.createElement('div');
            div.appendChild(this.wrapper);
            div.innerHTML = '';
            that.wrapper = that.scroller = div = null;
        },

        refresh: function () {
            var that = this,
                offset;



            that.wrapperW = that.wrapper.clientWidth || 1;
            that.wrapperH = that.wrapper.clientHeight || 1;

            that.minScrollY = -that.options.topOffset || 0;
            that.scrollerW = m.round(that.scroller.offsetWidth * that.scale);
            that.scrollerH = m.round((that.scroller.offsetHeight + that.minScrollY) * that.scale);
            that.maxScrollX = that.wrapperW - that.scrollerW;
            that.maxScrollY = that.wrapperH - that.scrollerH + that.minScrollY;
            that.dirX = 0;
            that.dirY = 0;

            if (that.options.onRefresh) that.options.onRefresh.call(that);

            that.hScroll = that.options.hScroll && that.maxScrollX < 0;
            that.vScroll = that.options.vScroll && (!that.options.bounceLock && !that.hScroll || that.scrollerH > that.wrapperH);


            offset = that._offset(that.wrapper);
            that.wrapperOffsetLeft = -offset.left;
            that.wrapperOffsetTop = -offset.top;


            that.scroller.style[transitionDuration] = '0';
            that._resetPos(400);
        },

        scrollTo: function (x, y, time, relative) {
            var that = this,
                step = x,
                i, l;

            that.stop();

            if (!step.length) step = [{ x: x, y: y, time: time, relative: relative }];

            for (i=0, l=step.length; i<l; i++) {
                if (step[i].relative) { step[i].x = that.x - step[i].x; step[i].y = that.y - step[i].y; }
                that.steps.push({ x: step[i].x, y: step[i].y, time: step[i].time || 0 });
            }

            that._startAni();
        },

        scrollToElement: function (el, time) {
            var that = this, pos;
            el = el.nodeType ? el : that.scroller.querySelector(el);
            if (!el) return;

            pos = that._offset(el);
            pos.left += that.wrapperOffsetLeft;
            pos.top += that.wrapperOffsetTop;

            pos.left = pos.left > 0 ? 0 : pos.left < that.maxScrollX ? that.maxScrollX : pos.left;
            pos.top = pos.top > that.minScrollY ? that.minScrollY : pos.top < that.maxScrollY ? that.maxScrollY : pos.top;
            time = time === undefined ? m.max(m.abs(pos.left)*2, m.abs(pos.top)*2) : time;

            that.scrollTo(pos.left, pos.top, time);
        },

        scrollToPage: function (pageX, pageY, time) {
            var that = this, x, y;

            time = time === undefined ? 400 : time;

            if (that.options.onScrollStart) that.options.onScrollStart.call(that);


            x = -that.wrapperW * pageX;
            y = -that.wrapperH * pageY;
            if (x < that.maxScrollX) x = that.maxScrollX;
            if (y < that.maxScrollY) y = that.maxScrollY;


            that.scrollTo(x, y, time);
        },

        disable: function () {
            this.stop();
            this._resetPos(0);
            this.enabled = false;

            // If disabled after touchstart we make sure that there are no left over events
            this._unbind(MOVE_EV, window);
            this._unbind(END_EV, window);
            this._unbind(CANCEL_EV, window);
        },

        enable: function () {
            this.enabled = true;
        },

        stop: function () {
            if (this.options.useTransition) this._unbind(TRNEND_EV);
            else cancelFrame(this.aniTime);
            this.steps = [];
            this.moved = false;
            this.animating = false;
        },

        isReady: function () {
            return !this.moved &&  !this.animating;
        }
    };

    function prefixStyle (style) {
        if ( vendor === '' ) return style;

        style = style.charAt(0).toUpperCase() + style.substr(1);
        return vendor + style;
    }

    dummyStyle = null;	// for the sake of it

    if (typeof exports !== 'undefined') exports.iScroll = iScroll;
    else window.iScroll = iScroll;

    (function($){
        if(!$)return;
        var orgiScroll = iScroll,
            id = 0,
            cacheInstance = {};
        function createInstance(el,options){
            var uqid = 'iscroll' + id++;
            el.data('_iscroll_',uqid);
            return cacheInstance[uqid] = new orgiScroll(el[0],options)
        }
        window.iScroll = function(el,options){
            return createInstance($(typeof el == 'string' ? '#' + el : el),options)
        };
        $.fn.iScroll = function(method){
            var resultArr = [];
            this.each(function(i,el){
                if(typeof method == 'string'){
                    var instance = cacheInstance[$(el).data('_iscroll_')],pro;
                    if(instance && (pro = instance[method])){
                        var result = $.isFunction(pro) ? pro.apply(instance, Array.prototype.slice.call(arguments,1)) : pro;
                        if(result !== instance && result !== undefined){
                            resultArr.push(result);
                        }
                    }
                }else{
                    if(!$(el).data('_iscroll_'))
                        createInstance($(el),method)
                }
            });

            return resultArr.length ? resultArr : this;
        }
    })(window.Zepto || null)



})(window, document);
/**
 * Change list
 * 修改记录
 *
 * 1. 2012-08-14 解决滑动中按住停止滚动，松开后被点元素触发点击事件。
 *
 * 具体修改:
 * a. 202行 添加isStopScrollAction: false 给iScroll的原型上添加变量
 * b. 365行 _start方法里面添加that.isStopScrollAction = false; 默认让这个值为false
 * c. 390行 if (x != that.x || y != that.y)条件语句里面 添加了  that.isStopScrollAction = true; 当目标值与实际值不一致，说明还在滚动动画中
 * d. 554行 that.isStopScrollAction || (that.doubleTapTimer = setTimeout(function () {
 *          ......
 *          ......
 *          }, that.options.zoom ? 250 : 0));
 *   如果isStopScrollAction为true就不派送click事件
 *
 *
 * 2. 2012-08-14 给options里面添加speedScale属性，提供外部控制冲量滚动速度
 *
 * 具体修改
 * a. 108行 添加speedScale: 1, 给options里面添加speedScale属性，默认为1
 * b. 798行 speed = m.abs(dist) * this.options.speedScale / time, 在原来速度的基础上*speedScale来改变速度
 *
 * 3. 2012-08-21 修改部分代码，给iscroll_plugin墙用的
 *
 * 具体修改
 * a. 517行  在_pos之前，调用_beforePos,如果里面不返回true,  将不会调用_pos
 *  // internal for header scroll
 *  if (that._beforePos)
 *      that._beforePos(newY, deltaY) && that._pos(newX, newY);
 *  else
 *      that._pos(newX, newY);
 *
 * b. 680行 在滚动结束后调用 _afterPos.
 * // internal for header scroll
 * if (that._afterPos) that._afterPos();
 *
 * c. 106行构造器里面添加以下代码
 * // add var to this for header scroll
 * that.translateZ = translateZ;
 *
 * 为处理溢出
 * _bind 方法
 * destroy 方法
 * 最开头的 _bindArr = []
 *
 */
/**
 * @file GMU定制版iscroll，基于[iScroll 4.2.2](http://cubiq.org/iscroll-4), 去除zoom, pc兼容，snap, scrollbar等功能。同时把iscroll扩展到了Zepto的原型中。
 * @name zepto.iScroll
 * @import core/zepto.js
 * @desc GMU定制版iscroll，基于{@link[http://cubiq.org/iscroll-4] iScroll 4.2.2}, 去除zoom, pc兼容，snap, scrollbar等功能。同时把iscroll扩展到了***Zepto***的原型中。
 */

/**
 * @name iScroll
 * @grammar new iScroll(el,[options])  ⇒ self
 * @grammar $('selecotr').iScroll([options])  ⇒ zepto实例
 * @desc 将iScroll加入到了***$.fn***中，方便用Zepto的方式调用iScroll。
 * **el**
 * - ***el {String/ElementNode}*** iscroll容器节点
 *
 * **Options**
 * - ***hScroll*** {Boolean}: (可选, 默认: true)横向是否可以滚动
 * - ***vScroll*** {Boolean}: (可选, 默认: true)竖向是否可以滚动
 * - ***momentum*** {Boolean}: (可选, 默认: true)是否带有滚动效果
 * - ***checkDOMChanges*** {Boolean, 默认: false}: (可选)每个500毫秒判断一下滚动区域的容器是否有新追加的内容，如果有就调用refresh重新渲染一次
 * - ***useTransition*** {Boolean, 默认: false}: (可选)是否使用css3来来实现动画，默认是false,建议开启
 * - ***topOffset*** {Number}: (可选, 默认: 0)可滚动区域头部缩紧多少高度，默认是0， ***主要用于头部下拉加载更多时，收起头部的提示按钮***
 * @example
 * $('div').iscroll().find('selector').atrr({'name':'aaa'}) //保持链式调用
 * $('div').iScroll('refresh');//调用iScroll的方法
 * $('div').iScroll('scrollTo', 0, 0, 200);//调用iScroll的方法, 200ms内滚动到顶部
 */


/**
 * @name destroy
 * @desc 销毁iScroll实例，在原iScroll的destroy的基础上对创建的dom元素进行了销毁
 * @grammar destroy()  ⇒ undefined
 */

/**
 * @name refresh
 * @desc 更新iScroll实例，在滚动的内容增减时，或者可滚动区域发生变化时需要调用***refresh***方法来纠正。
 * @grammar refresh()  ⇒ undefined
 */

/**
 * @name scrollTo
 * @desc 使iScroll实例，在指定时间内滚动到指定的位置， 如果relative为true, 说明x, y的值是相对与当前位置的。
 * @grammar scrollTo(x, y, time, relative)  ⇒ undefined
 */
/**
 * @name scrollToElement
 * @desc 滚动到指定内部元素
 * @grammar scrollToElement(element, time)  ⇒ undefined
 * @grammar scrollToElement(selector, time)  ⇒ undefined
 */
/**
 * @name scrollToPage
 * @desc 跟scrollTo很像，这里传入的是百分比。
 * @grammar scrollToPage(pageX, pageY, time)  ⇒ undefined
 */
/**
 * @name disable
 * @desc 禁用iScroll
 * @grammar disable()  ⇒ undefined
 */
/**
 * @name enable
 * @desc 启用iScroll
 * @grammar enable()  ⇒ undefined
 */
/**
 * @name stop
 * @desc 定制iscroll滚动
 * @grammar stop()  ⇒ undefined
 */


/*!Extend zepto.location.js*/
/**
 *  @file 获取当前详细地址
 *  @name zepto.location
 *  @desc 获取当前详细地址
 *  @import core/zepto.js, core/zepto.extend.js
 */
(function($) {
    $.extend($.fn, {
        /**
         * @desc 调用地图API，获取当前地址位置详细信息
         * **successCB：** 获取信息成功回调函数
         * **errorCB：** 获取信息失败回调函数
         * **options:**
         * - ***enableHighAccuracy***: boolean 是否要求高精度的地理信息
         * - ***timeout***: 获取信息的超时限制
         * - ***maximumAge***: 对地理信息进行缓存的时间
         *
         * @grammar $.location(fn, fn, options) ⇒ function
         * @name $.location
         * @example $.location(function(rs){
         *      console.log(rs)
         *  })
         */
        location : function(successCB, errorCB, options){
            //获取地图提供的js api
            $.ajaxJSONP({
                url: 'http://api.map.baidu.com/api?v=1.4&callback=?',
                success: function(){
                    window.navigator.geolocation
                        ? window.navigator.geolocation.getCurrentPosition(handleSuccess, handleError, $.extend({
                        enableHighAccuracy : true
                    }, options))
                        : (errorCB && errorCB("浏览器不支持html5来获取地理位置信息"))
                }
            })
            function handleSuccess(position){
                //获取当前手机经纬度坐标，并将其转化成百度坐标
                var lng = position.coords.longitude,
                    lat = position.coords.latitude,
                    xyUrl = "http://api.map.baidu.com/ag/coord/convert?from=2&to=4&x=" + lng + "&y=" + lat + '&callback=?'
                $.ajaxJSONP({
                    url: xyUrl,
                    success: function(data){
                        var gc = new BMap.Geocoder()
                        gc.getLocation(new BMap.Point(data.x, data.y), function(rs){	//data.x data.y为加密后的百度坐标，传入Point后可解析成详细地址
                            successCB && successCB(rs)
                        })
                    }
                })
            }

            function handleError(){
                errorCB && errorCB(arguments)
            }
        }
    });
})(Zepto);

/*!Extend zepto.position.js*/
/**
 *  @file 基于Zepto的位置设置获取组件
 *  @name zepto.position
 *  @desc 定位插件
 *  @import core/zepto.extend.js
 */
//offset
(function($, undefined){
    var _offset = $.fn.offset, offset ={};

    /**
     * @name offset
     * @grammar offset()  ⇒ array
     * @grammar offset(coordinates)  ⇒ self
     * @grammar offset(function(index, oldOffset){ ... })  ⇒ self
     * @desc 扩展offset方法，让它支持设置制定坐标。
     * @example $('p').offset({top: 50, left: 50});//将p设置到坐标点（50， 50）位置。
     *
     * $('p').offset(function(index, oldOffset){//将p的位置向做移动50px
     *     oldOffset.left -=50;
     *     return oldOffset;
     * });
     */
    $.fn.offset = function(options){
        //如果传入的不是object，则直接调用老的offset.
        if(!$.isPlainObject(options))return _offset.apply(this, arguments);
        //遍历调用offsets.setOffset。
        return this.each(function(i){
            offset.setOffset( this, options, i );
        });
    }

    //设置offset值
    offset.setOffset = function ( elem, options, i ) {
        var $el = $(elem),
            position = $el.css( "position"),
            curOffset = $el.offset(),
            curCSSTop = $el.css( "top" ),
            curCSSLeft = $el.css( "left" ),
            calculatePosition = ( position === "absolute" || position === "fixed" ) && ~$.inArray("auto", [curCSSTop, curCSSLeft]),
            props = {}, curPosition = {}, curTop, curLeft;

        //如果是static定位，则需要把定位设置成relative，否则top，left值无效。
        position === "static" && $el.css("position", "relative");

        //如果定位是absolute或者fixed，同时top或者left中存在auto定位。
        curPosition = calculatePosition?$el.position():curPosition;
        curTop = curPosition.top || parseFloat( curCSSTop ) || 0;
        curLeft = curPosition.left || parseFloat( curCSSLeft ) || 0;

        //如果options是一个方法，则调用此方法来获取options，同时传入当前offset
        options = $.isFunction( options )?options.call( elem, i, curOffset ):options;

        options.top != null && (props.top = options.top - curOffset.top + curTop);
        options.left != null && (props.left = options.left - curOffset.left + curLeft);

        "using" in options ? options.using.call( elem, props ): $el.css( props );
    }
})(Zepto);

//position
(function ($, undefined) {
    var _position = $.fn.position || function(){
            if (!this.length) return null;
            var offsetParent = this.offsetParent(),
                offset       = this.offset(),
                parentOffset = /^(?:body|html)$/i.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset()

            parentOffset.top  += parseFloat( offsetParent.css('border-top-width') ) || 0
            parentOffset.left += parseFloat( offsetParent.css('border-left-width') ) || 0

            return {
                top:  offset.top  - parentOffset.top,
                left: offset.left - parentOffset.left
            }
        },
        round = Math.round,
        rhorizontal = /left|center|right/,
        rvertical = /top|center|bottom/,
        roffset = /([\+\-]\d+%?)/,
        rposition = /^\w+/,
        rpercent = /%$/;

    function getOffsets( offsets, width, height ) {
        return [
            parseInt( offsets[ 0 ], 10 ) * ( rpercent.test( offsets[ 0 ] ) ? width / 100 : 1 ),
            parseInt( offsets[ 1 ], 10 ) * ( rpercent.test( offsets[ 1 ] ) ? height / 100 : 1 )
        ];
    }

    function parseCss( elem, prop ) {
        return parseInt( elem.css( prop ), 10 ) || 0;
    }

    function getDimensions( elem ) {
        var raw = elem[0];
        return raw.nodeType === 9?{//如果是document
            width: elem.width(),
            height: elem.height(),
            top: 0,
            left: 0
        }: raw == window ? {//如果是window
            width: elem.width(),
            height: elem.height(),
            top: raw.pageYOffset,
            left: raw.pageXOffset
        }: raw.preventDefault && (raw = raw.touches?raw.touches[0]:raw) ? {//如果是event对象
            width: 0,
            height: 0,
            offset: { top: raw.pageY, left: raw.pageX }
        }: elem.offset();
    }

    function getWithinInfo(elem){
        var withinElem = $( elem = (elem || window) ),
            _isWindow = elem == window,
            offset = _isWindow? { left: 0, top: 0 } : withinElem.offset();
        return {
            element: withinElem,
            isWindow: _isWindow,
            offset: offset,
            width: offset.width || withinElem.width(),
            height: offset.height || withinElem.height(),
            scrollLeft: _isWindow?elem.pageXOffset:elem.scrollLeft,
            scrollTop: _isWindow?elem.pageYOffset:elem.scrollTop
        };
    }

    /**
     * @name position
     * @grammar position()  ⇒ array
     * @grammar position(opts)  ⇒ self
     * @desc 获取元素相对于相对父级元素（父级最近为position为relative｜abosolute｜fixed的元素）的坐标位置。
     *
     * 如果传入了opts，则把所选元素设置成制定位置。参数格式如下。
     * - ''my'' //默认为'center'// 设置中心点。可以为'left top', 'center bottom', 'right center'...
     *   同时还可以设置偏移量。如 'left+5 center-20%'。
     * - ''at'' //默认为'center'// 设置定位到目标元素的什么位置。参数格式同my参数一致。
     * - ''of'' //默认为null// 设置目标元素
     * - ''collision'' //默认为null// 碰撞检测回调方法。传入function.
     * - ''within'' //默认为window，碰撞检测对象。
     * - ''using''  传入function，如果没有传入position将通过css方法设置，可以传入一个function在方法中，通过animate方法来设置，这样就有了动画效果，而不是瞬间变化。
     */
    $.fn.position = function (opts) {
        if (!opts || !opts.of) {
            return _position.call(this);
        }
        opts = $.extend({}, opts);//弄个副本

        var atOffset, targetWidth, targetHeight, basePosition, dimensions,
            target = $( opts.of ), tmp, collision,
            within = getWithinInfo( opts.within ),
            offsets = {};

        dimensions = getDimensions( target );
        target[0].preventDefault && (opts.at = "left top");
        targetWidth = dimensions.width;
        targetHeight = dimensions.height;
        basePosition = {
            left: dimensions.left,
            top: dimensions.top
        };

        $.each( [ "my", "at" ], function() {
            var pos = ( opts[ this ] || "" ).split( " " );

            pos.length ===1 && pos[rhorizontal.test( pos[ 0 ] )?"push":"unshift"]("center");
            pos[ 0 ] = rhorizontal.test( pos[ 0 ] ) ? pos[ 0 ] : "center";
            pos[ 1 ] = rvertical.test( pos[ 1 ] ) ? pos[ 1 ] : "center";

            offsets[ this ] = [
                roffset.test(pos[ 0 ]) ? RegExp.$1 : 0,
                roffset.test(pos[ 1 ]) ? RegExp.$1 : 0
            ];
            opts[ this ] = [
                rposition.exec( pos[ 0 ] )[ 0 ],
                rposition.exec( pos[ 1 ] )[ 0 ]
            ];
        });

        basePosition.left += (tmp = opts.at[ 0 ]) === "right"?targetWidth:tmp == "center"?targetWidth / 2:0;
        basePosition.top += (tmp = opts.at[ 1 ]) === "bottom"?targetHeight:tmp == "center"?targetHeight / 2:0;

        atOffset = getOffsets( offsets.at, targetWidth, targetHeight );
        basePosition.left += atOffset[ 0 ];
        basePosition.top += atOffset[ 1 ];

        return this.each(function() {
            var collisionPosition,
                elem = $( this ),
                offset = elem.offset(),
                tmp,
                elemWidth = offset.width,
                elemHeight = offset.height,
                marginLeft = parseCss( elem, "marginLeft" ),
                marginTop = parseCss( elem, "marginTop" ),
                collisionWidth = elemWidth + marginLeft + parseCss( elem, "marginRight" ),
                collisionHeight = elemHeight + marginTop + parseCss( elem, "marginBottom" ),
                position = $.extend( {}, basePosition ),
                myOffset = getOffsets( offsets.my, elemWidth, elemHeight );

            position.left -= (tmp = opts.my[ 0 ]) === "right"?elemWidth:tmp==="center"?elemWidth/2:0;
            position.top -= (tmp = opts.my[ 1 ]) === "bottom"?elemHeight:tmp==="center"?elemHeight/2:0;
            position.left += myOffset[ 0 ];
            position.top += myOffset[ 1 ];

            position.left = round(position.left);
            position.top = round(position.top);

            collisionPosition = {
                marginLeft: marginLeft,
                marginTop: marginTop
            };

            $.isFunction(collision = opts.collision) && collision.call(this, position, {
                targetWidth: targetWidth,
                targetHeight: targetHeight,
                elemWidth: elemWidth,
                elemHeight: elemHeight,
                collisionPosition: collisionPosition,
                collisionWidth: collisionWidth,
                collisionHeight: collisionHeight,
                offset: [ atOffset[ 0 ] + myOffset[ 0 ], atOffset [ 1 ] + myOffset[ 1 ] ],
                my: opts.my,
                at: opts.at,
                within: within,
                elem : elem
            });
            elem.offset( $.extend( position, { using: opts.using } ) );
        });
    }
})(Zepto);
/*!Extend zepto.ui.js*/
/**
 * @file 所有UI组件的基类，通过它可以简单的快速的创建新的组件。
 * @name zepto.ui
 * @short zepto.ui
 * @desc 所有UI组件的基类，通过它可以简单的快速的创建新的组件。
 * @import core/zepto.js, core/zepto.extend.js
 */
(function($, undefined) {
    var id = 1,
        _blankFn = function(){},
        tpl = '<%=name%>-<%=id%>',
        record = (function(){
            var data = {},
                id = 0,
                iKey = "GMUWidget"+(+ new Date()); //internal key.

            return function( obj, key, val){
                var dkey = obj[ iKey ] || ( obj[ iKey ] = ++id ),
                    store = data[dkey] || (data[dkey] = {});

                !$.isUndefined(val) && (store[key] = val);
                $.isNull(val) && delete store[key];

                return store[ key ];
            }
        })();

    $.ui = $.ui || {
        version: '2.0.5',

        guid: _guid,

        /**
         * @name $.ui.define
         * @grammar $.ui.define(name, data[, superClass]) ⇒ undefined
         * @desc 定义组件,
         * - ''name'' 组件名称
         * - ''data'' 对象，设置此组件的prototype。可以添加属性或方法
         * - ''superClass'' 基类，指定此组件基于哪个现有组件，默认为Widget基类
         * **示例:**
         * <code type="javascript">
         * $.ui.define('helloworld', {
         *     _data: {
         *         opt1: null
         *     },
         *     enable: function(){
         *         //...
         *     }
         * });
         * </code>
         *
         * **定义完后，就可以通过以下方式使用了**
         *<code type="javascript">
         * var instance = $.ui.helloworld({opt1: true});
         * instance.enable();
         *
         * //或者
         * $('#id').helloworld({opt1:true});
         * //...later
         * $('#id').helloworld('enable');
         * </code>
         *
         * **Tips**
         * 1. 通过Zepto对象上的组件方法，可以直接实例话组件, 如: $('#btn').button({label: 'abc'});
         * 2. 通过Zepto对象上的组件方法，传入字符串this, 可以获得组件实例，如：var btn = $('#btn').button('this');
         * 3. 通过Zepto对象上的组件方法，可以直接调用组件方法，第一个参数用来指定方法名，之后的参数作为方法参数，如: $('#btn').button('setIcon', 'home');
         * 4. 在子类中，如覆写了某个方法，可以在方法中通过this.$super()方法调用父级方法。如：this.$super('enable');
         */
        define: function(name, data, superClass) {
            if(superClass) data.inherit = superClass;
            var Class = $.ui[name] = _createClass(function(el, options) {
                var obj = _createObject(Class.prototype, {
                    _id: $.parseTpl(tpl, {
                        name: name,
                        id: _guid()
                    })
                });

                obj._createWidget.call(obj, el, options,Class.plugins);
                return obj;
            }, data);
            return _zeptoLize(name, Class);
        },

        /**
         * @name $.ui.isWidget()
         * @grammar $.ui.isWidget(obj) ⇒ boolean
         * @grammar $.ui.isWidget(obj, name) ⇒ boolean
         * @desc 判断obj是不是widget实例
         *
         * **参数**
         * - ''obj'' 用于检测的对象
         * - ''name'' 可选，默认监测是不是''widget''(基类)的实例，可以传入组件名字如''button''。作用将变为obj是不是button组件实例。
         * @param obj
         * @param name
         * @example
         *
         * var btn = $.ui.button(),
         *     dialog = $.ui.dialog();
         *
         * console.log($.isWidget(btn)); // => true
         * console.log($.isWidget(dialog)); // => true
         * console.log($.isWidget(btn, 'button')); // => true
         * console.log($.isWidget(dialog, 'button')); // => false
         * console.log($.isWidget(btn, 'noexist')); // => false
         */
        isWidget: function(obj, name){
            return obj instanceof (name===undefined ? _widget: $.ui[name] || _blankFn);
        }
    };

    /**
     * generate guid
     */
    function _guid() {
        return id++;
    };

    function _createObject(proto, data) {
        var obj = {};
        Object.create ? obj = Object.create(proto) : obj.__proto__ = proto;
        return $.extend(obj, data || {});
    }

    function _createClass(Class, data) {
        if (data) {
            _process(Class, data);
            $.extend(Class.prototype, data);
        }
        return $.extend(Class, {
            plugins: [],
            register: function(fn) {
                if ($.isObject(fn)) {
                    $.extend(this.prototype,fn);
                    return;
                }
                this.plugins.push(fn);
            }
        });
    }

    /**
     * handle inherit & _data
     */
    function _process(Class, data) {
        var superClass = data.inherit || _widget,
            proto = superClass.prototype,
            obj;
        obj = Class.prototype = _createObject(proto, {
            $factory: Class,
            $super: function(key) {
                var fn = proto[key];
                return $.isFunction(fn) ? fn.apply(this, $.slice(arguments, 1)) : fn;
            }
        });
        obj._data = $.extend({}, proto._data, data._data);
        delete data._data;
        return Class;
    }

    /**
     * 强制setup模式
     * @grammar $(selector).dialog(opts);
     */
    function _zeptoLize( name ) {
        $.fn[ name ] = function(opts) {
            var ret,
                obj,
                args = $.slice(arguments, 1);

            $.each( this, function( i, el ){

                obj = record( el, name ) || $.ui[name]( el, $.extend( $.isPlainObject(opts) ? opts : {}, {
                    setup: true
                } ) );
                if ($.isString( opts )) {
                    if (!$.isFunction( obj[ opts ] ) && opts !== 'this') {
                        throw new Error(name + '组件没有此方法');    //当不是取方法是，抛出错误信息
                    }
                    ret = $.isFunction( obj[ opts ] ) ? obj[opts].apply(obj, args) : undefined;
                }
                if( ret !== undefined && ret !== obj || opts === "this" && ( ret = obj ) ) {
                    return false;
                }
                ret = undefined;
            });
            //ret 为真就是要返回ui实例之外的内容
            //obj 'this'时返回
            //其他都是返回zepto实例
            //修改返回值为空的时，返回值不对的问题
            return ret !== undefined ? ret : this;
        };
    }
    /**
     * @name widget
     * @desc GMU所有的组件都是此类的子类，即以下此类里面的方法都可在其他组建中调用。
     */
    var _widget = function() {};
    $.extend(_widget.prototype, {
        _data: {
            status: true
        },

        /**
         * @name data
         * @grammar data(key) ⇒ value
         * @grammar data(key, value) ⇒ value
         * @desc 设置或者获取options, 所有组件中的配置项都可以通过此方法得到。
         * @example
         * $('a#btn').button({label: '按钮'});
         * console.log($('a#btn').button('data', 'label'));// => 按钮
         */
        data: function(key, val) {
            var _data = this._data;
            if ($.isObject(key)) return $.extend(_data, key);
            else return !$.isUndefined(val) ? _data[key] = val : _data[key];
        },

        /**
         * common constructor
         */
        _createWidget: function(el, opts,plugins) {

            if ($.isObject(el)) {
                opts = el || {};
                el = undefined;
            }

            var data = $.extend({}, this._data, opts);
            $.extend(this, {
                _el: el ? $(el) : undefined,
                _data: data
            });

            //触发plugins
            var me = this;
            $.each( plugins, function( i, fn ){
                var result = fn.apply( me );
                if(result && $.isPlainObject(result) ){
                    var plugins = me._data.disablePlugin;
                    if( !plugins || $.isString(plugins) && !~plugins.indexOf(result.pluginName) ){
                        delete result.pluginName;
                        $.each(result,function( key, val ){
                            var orgFn;
                            if((orgFn = me[key]) && $.isFunction( val ) ){
                                me[key] = function(){
                                    me[key + 'Org'] = orgFn;
                                    return val.apply(me,arguments);
                                }
                            }else
                                me[key] = val;
                        });
                    }
                }
            });
            // use setup or render
            if(data.setup) this._setup(el && el.getAttribute('data-mode'));
            else this._create();
            this._init();

            var me = this,
                $el = this.trigger('init').root();
            $el.on('tap', function(e) {
                (e['bubblesList'] || (e['bubblesList'] = [])).push(me);
            });

            record( $el[0], me._id.split('-')[0], me );
        },

        /**
         * @interface: use in render mod
         * @name _create
         * @desc 接口定义，子类中需要重新实现此方法，此方法在render模式时被调用。
         *
         * 所谓的render方式，即，通过以下方式初始化组件
         * <code>
         * $.ui.widgetName(options);
         * </code>
         */
        _create: function() {},

        /**
         * @interface: use in setup mod
         * @name _setup
         * @desc 接口定义，子类中需要重新实现此方法，此方法在setup模式时被调用。第一个行参用来分辨时fullsetup，还是setup
         *
         * <code>
         * $.ui.define('helloworld', {
         *     _setup: function(mode){
         *          if(mode){
         *              //为fullsetup模式
         *          } else {
         *              //为setup模式
         *          }
         *     }
         * });
         * </code>
         *
         * 所谓的setup方式，即，先有dom，然后通过选择器，初始化Zepto后，在Zepto对象直接调用组件名方法实例化组件，如
         * <code>
         * //<div id="widget"></div>
         * $('#widget').widgetName(options);
         * </code>
         *
         * 如果用来初始化的element，设置了data-mode="true"，组件将以fullsetup模式初始化
         */
        _setup: function(mode) {},

        /**
         * @name root
         * @grammar root() ⇒ value
         * @grammar root(el) ⇒ value
         * @desc 设置或者获取根节点
         * @example
         * $('a#btn').button({label: '按钮'});
         * console.log($('a#btn').button('root'));// => a#btn
         */
        root: function(el) {
            return this._el = el || this._el;
        },

        /**
         * @name id
         * @grammar id() ⇒ value
         * @grammar id(id) ⇒ value
         * @desc 设置或者获取组件id
         */
        id: function(id) {
            return this._id = id || this._id;
        },

        /**
         * @name destroy
         * @grammar destroy() ⇒ undefined
         * @desc 注销组件
         */
        destroy: function() {
            var me = this,
                $el;
            $el = this.trigger('destroy').off().root();
            $el.find('*').off();
            record( $el[0], me._id.split('-')[0], null);
            $el.off().remove();
            this.__proto__ = null;
            $.each(this, function(key) {
                delete me[key];
            });
        },

        /**
         * @name on
         * @grammar on(type, handler) ⇒ instance
         * @desc 绑定事件，此事件绑定不同于zepto上绑定事件，此On的this只想组件实例，而非zepto实例
         */
        on: function(ev, callback) {
            this.root().on(ev, $.proxy(callback, this));
            return this;
        },

        /**
         * @name off
         * @grammar off(type) ⇒ instance
         * @grammar off(type, handler) ⇒ instance
         * @desc 解绑事件
         */
        off: function(ev, callback) {
            this.root().off(ev, callback);
            return this;
        },

        /**
         * @name trigger
         * @grammar trigger(type[, data]) ⇒ instance
         * @desc 触发事件, 此trigger会优先把options上的事件回调函数先执行，然后给根DOM派送事件。
         * options上回调函数可以通过e.preventDefaualt()来组织事件派发。
         */
        trigger: function(event, data) {
            event = $.isString(event) ? $.Event(event) : event;
            var onEvent = this.data(event.type),result;
            if( onEvent && $.isFunction(onEvent) ){
                event.data = data;
                result = onEvent.apply(this, [event].concat(data));
                if(result === false || event.defaultPrevented){
                    return this;
                }
            }
            this.root().trigger(event, data);
            return this;
        }
    });
})(Zepto);
/*!Widget slider.js*/

/**
 * @file 图片轮播组件
 * @name Slider
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/slider/slider.html</qrcode>
 * 图片轮播组件
 * @import core/touch.js, core/zepto.extend.js, core/zepto.ui.js
 */

(function($, undefined) {
    /**
     * @name       $.ui.slider
     * @grammar    $.ui.slider(el [,options]) => instance
     * @desc **el**
     * css选择器, 或者zepto对象
     * **Options**
     * - ''container'' {selector|zepto}: (可选)放置的父容器
     * - ''content'' {Array}: (必选)内容,格式为：\[ {href:'图片跳转URL', pic:'图片路径', title:'图片下方文字'}, {...}\]
     * - ''viewNum'' {Number}: (可选, 默认:1) 可以同时看到几张图片
     * - ''imgInit'' {Number}: (可选, 默认:2)初始加载几张图片
     * - ''itemRender'' {Function}: (可选)render模式时，使用的自定义内容构造函数，接受一个从0开始的index参数，返回空值时构造结束
     * - ''imgZoom'' {Boolean}: (可选, 默认:false)是否缩放图片,设为true时可以将超出边界的图片等比缩放
     * - ''loop'' {Boolean}: (可选, 默认:false)设为true时,播放到最后一张时继续正向播放第一张(无缝滑动)，设为false则反向播放倒数第2张
     * - ''stopPropagation'' {Boolean}: (可选, 默认:false)是否在横向滑动的时候阻止冒泡(慎用,会导致上层元素接受不到touchMove事件)
     * - ''springBackDis'' {Number}: (可选, 默认:15)滑动能够回弹的最大距离
     * - ''autoPlay'' {Boolean}: ((可选, 默认:true)是否自动播放
     * - ''autoPlayTime'' {Number}: (可选, 默认:4000ms)自动播放的间隔
     * - ''animationTime'' {Number}: (可选, 默认:400ms)滑动动画时间
     * - ''showArr'' {Boolean}: (可选, 默认:true)是否展示上一个下一个箭头
     * - ''showDot'' {Boolean}: (可选, 默认:true)是否展示页码
     * - ''slide'' {Function}: (可选)开始切换页面时执行的函数,第1个参数为Event对象,第2个参数为滑动后的page页码
     * - ''slideend'' {Function}: (可选)页面切换完成(滑动完成)时执行的函数,第1个参数为Event对象,第2个参数为滑动后的page页码
     *
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/slider/slider.html">
     * ../gmu/_examples/widget/slider/slider.html
     * </codepreview>
     */
    $.ui.define('slider', {
        _data:{
            viewNum:                1,
            imgInit:                2,
            itemRender:             null,
            imgZoom:                false,
            loop:                   false,
            stopPropagation:        false,
            springBackDis:          15,
            autoPlay:               true,
            autoPlayTime:           4000,
            animationTime:          400,
            showArr:                true,
            showDot:                true,
            slide:                  null,
            slideend:               null,
            index:                  0,
            _stepLength:            1,
            _direction:             1
        },

        _create:function() {
            var me = this,
                i = 0, j, k = [],
                content = me.data('content');
            me._initConfig();
            (me.root() || me.root($('<div></div>'))).addClass('ui-slider').appendTo(me.data('container') || (me.root().parent().length ? '' : document.body)).html(
                '<div class="ui-slider-wheel"><div class="ui-slider-group">' +
                    (function() {
                        if(me.data('itemRender')) {
                            var render = me.data('itemRender');
                            while(j = render.call(me, i++)) k.push('<div class="ui-slider-item">' + j + '</div>');
                        } else {
                            while(j = content[i++]) k.push('<div class="ui-slider-item"><a href="' + j.href + '"><img lazyload="' + j.pic + '"/></a>' + (j.title ? '<p>' + j.title + '</p>': '') + '</div>');
                        }
                        k.push(me.data('loop') ? '</div><div class="ui-slider-group">' + k.join('') + '</div></div>' : '</div></div>');
                        return k.join('');
                    }()));
            me._addDots();
        },

        _setup: function(mode) {
            var me = this,
                root = me.root().addClass('ui-slider');
            me._initConfig();
            if(!mode) {
                var items = root.children(),
                    group = $('<div class="ui-slider-group"></div>').append(items.addClass('ui-slider-item'));
                root.empty().append($('<div class="ui-slider-wheel"></div>').append(group).append(me.data('loop') ? group.clone() : ''));
                me._addDots();
            } else me.data('loop') && $('.ui-slider-wheel', root).append($('.ui-slider-group', root).clone());
        },

        _init:function() {
            var me = this,
                index = me.data('index'),
                root = me.root(),
                _eventHandler = $.proxy(me._eventHandler, me);
            me._setWidth();
            $(me.data('wheel')).on('touchstart touchmove touchend touchcancel webkitTransitionEnd', _eventHandler);
            $(window).on('ortchange', _eventHandler);
            $('.ui-slider-pre', root).on('tap', function() { me.pre() });
            $('.ui-slider-next', root).on('tap', function() { me.next() });
            me.on('destroy',function() {
                clearTimeout(me.data('play'));
                $(window).off('ortchange', _eventHandler);
            });
            me.data('autoPlay') && me._setTimeout();
        },

        /**
         * 初始化参数配置
         */
        _initConfig: function() {
            var o = this._data;
            if(o.viewNum > 1) {
                o.loop = false;
                o.showDot = false;
                o.imgInit = o.viewNum + 1;
            }
        },

        /**
         * 添加底部圆点及两侧箭头
         */
        _addDots:function() {
            var me = this,
                root = me.root(),
                length = $('.ui-slider-item', root).length / (me.data('loop') ? 2 : 1),
                html = [];
            if(me.data('showDot')) {
                html.push('<p class="ui-slider-dots">');
                while(length--) html.push('<b></b>');
                html.push('</p>');
            }
            me.data('showArr') && (html.push('<span class="ui-slider-pre"><b></b></span><span class="ui-slider-next"><b></b></span>'));
            root.append(html.join(''));
        },
        /**
         * 设置轮播条及元素宽度,设置选中dot,设置索引map,加载图片
         */
        _setWidth:function(){
            var me = this,
                o = me._data,
                root = me.root(),
                width = Math.ceil(root.width() / o.viewNum),
                height = root.height(),
                loop = o.loop,
                items = $('.ui-slider-item', root).toArray(),
                length = items.length,
                wheel = $('.ui-slider-wheel', root).width(width * length)[0],
                dots = $('.ui-slider-dots b', root).toArray(),
                allImgs = $('img', root).toArray(),
                lazyImgs = allImgs.concat(),
                dotIndex = {}, i, j,
                l = o.imgInit || length;
            o.showDot && (dots[0].className = 'ui-slider-dot-select');
            if(o.imgZoom) $(lazyImgs).on('load', function() {
                var h = this.height,
                    w = this.width,
                    min_h = Math.min(h, height),
                    min_w = Math.min(w, width);
                if(h/height > w/width) this.style.cssText += 'height:' + min_h + 'px;' + 'width:' + min_h/h * w + 'px;';
                else this.style.cssText += 'height:' + min_w/w * h + 'px;' + 'width:' + min_w + 'px';
                this.onload = null;
            });
            for(i = 0; i < length; i++) {
                items[i].style.cssText += 'width:'+ width + 'px;position:absolute;-webkit-transform:translate3d(' + i * width + 'px,0,0);z-index:' + (900 - i);
                dotIndex[i] = loop ? (i > length/2 - 1 ? i - length/2 : i) : i;
                if(i < l) {
                    j = lazyImgs.shift();
                    j && (j.src = j.getAttribute('lazyload'));
                    if(o.loop) {
                        j = allImgs[i + length/2];
                        j && (j.src = j.getAttribute('lazyload'));
                    }
                }
            }
            me.data({
                root:           root[0],
                wheel:          wheel,
                items:          items,
                lazyImgs:       lazyImgs,
                allImgs:        allImgs,
                length:         length,
                width:          width,
                height:         height,
                dots:           dots,
                dotIndex:       dotIndex,
                dot:            dots[0]
            });
            return me;
        },

        /**
         * 事件管理函数
         */
        _eventHandler:function(e) {
            var me = this;
            switch (e.type) {
                case 'touchmove':
                    me._touchMove(e);
                    break;
                case 'touchstart':
                    me._touchStart(e);
                    break;
                case 'touchcancel':
                case 'touchend':
                    me._touchEnd();
                    break;
                case 'webkitTransitionEnd':
                    me._transitionEnd();
                    break;
                case 'ortchange':
                    me._resize.call(me);
                    break;
            }
        },

        /**
         * touchstart事件
         */
        _touchStart:function(e) {
            var me = this;
            me.data({
                pageX:      e.touches[0].pageX,
                pageY:      e.touches[0].pageY,
                S:          false,      //isScrolling
                T:          false,      //isTested
                X:          0           //horizontal moved
            });
            me.data('wheel').style.webkitTransitionDuration = '0ms';
        },

        /**
         * touchmove事件
         */
        _touchMove:function(e) {
            var o = this._data,
                X = o.X = e.touches[0].pageX - o.pageX;
            if(!o.T) {
                var index = o.index,
                    length = o.length,
                    S = Math.abs(X) < Math.abs(e.touches[0].pageY - o.pageY);
                o.loop && (o.index = index > 0 && (index < length - 1) ? index : (index === length - 1) && X < 0 ? length/2 - 1 : index === 0 && X > 0 ? length/2 : index);
                S || clearTimeout(o.play);
                o.T = true;
                o.S = S;
            }
            if(!o.S) {
                o.stopPropagation && e.stopPropagation();
                e.preventDefault();
                o.wheel.style.webkitTransform = 'translate3d(' + (X - o.index * o.width) + 'px,0,0)';
            }
        },

        /**
         * touchend事件
         */
        _touchEnd:function() {
            var me = this,
                o = me._data;
            if(!o.S) {
                var distance = o.springBackDis,
                    stepLength = o.X <= -distance ? Math.ceil(-o.X / o.width) : (o.X > distance) ? -Math.ceil(o.X / o.width) : 0;
                o._stepLength = Math.abs(stepLength);
                me._slide(o.index + stepLength);
            }
        },

        /**
         * 轮播位置判断
         */
        _slide:function(index, auto) {
            var me = this,
                o = me._data,
                length = o.length,
                end = length - o.viewNum + 1;
            if(-1 < index && index < end) {
                me._move(index);
            } else if(index >= end) {
                if(!o.loop) {
                    me._move(end - (auto ? 2 : 1));
                    o._direction = -1;
                } else {
                    o.wheel.style.cssText += '-webkit-transition:0ms;-webkit-transform:translate3d(-' + (length/2 - 1) * o.width + 'px,0,0);';
                    o._direction =  1;
                    $.later(function() {me._move(length/2)}, 20);
                }
            } else {
                if(!o.loop) me._move(auto ? 1 : 0);
                else {
                    o.wheel.style.cssText += '-webkit-transition:0ms;-webkit-transform:translate3d(-' + (length/2) * o.width + 'px,0,0);';
                    $.later(function() {me._move(length/2 - 1)}, 20);
                }
                o._direction =  1;
            }
            return me;
        },

        /**
         * 轮播方法
         */
        _move:function(index) {
            var o = this._data,
                dotIndex = o.dotIndex[index];
            this.trigger('slide', dotIndex);
            if(o.lazyImgs.length) {
                var j = o.allImgs[index];
                j && j.src || (j.src = j.getAttribute('lazyload'));
            }
            if(o.showDot) {
                o.dot.className = '';
                o.dots[dotIndex].className = 'ui-slider-dot-select';
                o.dot = o.dots[dotIndex];
            }
            o.index = index;
            o.wheel.style.cssText += '-webkit-transition:' + o.animationTime + 'ms;-webkit-transform:translate3d(-' + index * o.width + 'px,0,0);';
        },

        /**
         * 滑动结束
         */
        _transitionEnd:function() {
            var me = this,
                o = me._data;
            me.trigger('slideend', o.dotIndex[o.index]);
            if(o.lazyImgs.length){
                for(var length = o._stepLength, i = 0; i< length; i++) {
                    var j = o.lazyImgs.shift();
                    j && (j.src = j.getAttribute('lazyload'));
                    if(o.loop) {
                        j = o.allImgs[o.index + o.length / 2];
                        j && !j.src && (j.src = j.getAttribute('lazyload'));
                    }
                }
                o._stepLength = 1;
            }
            me._setTimeout();
        },

        /**
         * 设置自动播放
         */
        _setTimeout:function() {
            var me = this, o = me._data;
            if(!o.autoPlay) return me;
            clearTimeout(o.play);
            o.play = $.later(function() {
                me._slide.call(me, o.index + o._direction, true);
            }, o.autoPlayTime);
            return me;
        },

        /**
         * 重设容器及子元素宽度
         */
        _resize:function() {
            var me = this,
                o = me._data,
                width = o.root.offsetWidth / o.viewNum, //todo 添加获取隐藏元素大小的方法
                length = o.length,
                items = o.items;
            if(!width) return me;
            o.width = width;
            clearTimeout(o.play);
            for(var i = 0; i < length; i++) items[i].style.cssText += 'width:' + width + 'px;-webkit-transform:translate3d(' + i * width + 'px,0,0);';
            o.wheel.style.removeProperty('-webkit-transition');
            o.wheel.style.cssText += 'width:' + width * length + 'px;-webkit-transform:translate3d(-' + o.index * width + 'px,0,0);';
            o._direction = 1;
            me._setTimeout();
            return me;
        },

        /**
         * @desc 滚动到上一张
         * @name pre
         * @grammar pre() => self
         *  @example
         * //setup mode
         * $('#slider').slider('pre');
         *
         * //render mode
         * var demo = $.ui.slider();
         * demo.pre();
         */
        pre:function() {
            var me = this;
            me._slide(me.data('index') - 1);
            return me;
        },

        /**
         * @desc 滚动到下一张
         * @name next
         * @grammar next() => self
         *  @example
         * //setup mode
         * $('#slider').slider('next');
         *
         * //render mode
         * var demo = $.ui.slider();
         * demo.next();
         */
        next:function() {
            var me = this;
            me._slide(me.data('index') + 1);
            return me;
        },

        /**
         * @desc 停止自动播放
         * @name stop
         * @grammar stop() => self
         *  @example
         * //setup mode
         * $('#slider').slider('stop');
         *
         * //render mode
         * var demo = $.ui.slider();
         * demo.stop();
         */
        stop:function() {
            var me = this;
            clearTimeout(me.data('play'));
            me.data('autoPlay', false);
            return me;
        },

        /**
         * @desc 恢复自动播放
         * @name resume
         * @grammar resume() => self
         *  @example
         * //setup mode
         * $('#slider').slider('resume');
         *
         * //render mode
         * var demo = $.ui.slider();
         * demo.resume();
         */
        resume:function() {
            var me = this;
            me.data('_direction',1);
            me.data('autoPlay', true);
            me._setTimeout();
            return me;
        }

        /**
         * @name Trigger Events
         * @theme event
         * @desc 组件内部触发的事件
         * ^ 名称 ^ 处理函数参数 ^ 描述 ^
         * | init | event | 组件初始化的时候触发，不管是render模式还是setup模式都会触发 |
         * | slide | event | 开始切换页面时执行的函数，参数为滑动后的page页码 |
         * | slideend | event | 页面切换完成(滑动完成)时执行的函数，参数为滑动后的page页码 |
         * | destroy | event | 组件在销毁的时候触发 |
         */
    });
})(Zepto);

/*!Widget slider.dynamic.js*/
/**
 * @file Slider － 内容可动态修改插件
 * @name Slider.dynamic
 * @short Slider.dynamic
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/slider/slider_dynamic.html</qrcode>
 * 此插件扩充slider， 让内容可以动态修改，在这种模式下，dom个数跟items的个数无关，永远是3个div轮换，对于图片集比较多的图片轮播，采用这种方式。
 * @import widget/slider.js
 */
(function ($) {
    var itemRender = function (item) {
        return '<div class="ui-slider-item">' +
            '<a href="' + item.href + '"><img lazyload="' + item.pic + '"/></a>' +
            (item.title ? '<p>' + item.title + '</p>' : '') + '</div>';
    }

    $.ui.slider.register(function () {
        return {
            pluginName: 'dynamic',

            _setup: function () {
                throw new Error("This plugin does not support setup mode");
            },

            _create: function () {
                var data = this._data, group,
                    content = data.content;

                data.autoPlay = false;//disable auto play
                data.loop = false;//disable loop
                data.viewNum = 1; //disable multi items per page.
                data.showDot = false; // disable dot display.

                group = $('<div class="ui-slider-group"></div>');
                this._renderItems(content, data.index || 0, group, data);

                (this.root() || this.root($('<div></div>')))
                    .addClass('ui-slider')
                    .appendTo(data.container || (this.root().parent().length ? '' : document.body))
                    .html(
                        $('<div class="ui-slider-wheel"></div>')
                            .append(group)
                    );
                this._addDots();
            },

            _renderItems: function (content, index, group, data) {
                var arr, active, rest, item, i,
                    render = data.itemRender || itemRender;//allow customize render

                arr = content.slice(index, index + 3);
                this._active = active = content[index];
                rest = 3 - arr.length;
                rest && (arr = content.slice(index - rest, index).concat(arr));

                data.index = $.inArray(active, this._pool = arr);
                this._index = index;

                for (i = 0; i < 3 && (item = arr[i]); i++)
                    group.append(render(item));

                this._loadImages(group.find('img[lazyload]'));
            },

            _init: function () {
                this._initOrg();
                this._adjustPos();
                this.trigger('slide', [this._index || 0, this._active]);
            },

            _transitionEnd: function () {
                this._transitionEndOrg();
                this._adjustPos();
            },

            _adjustPos: function () {
                var data = this._data,
                    root = this.root(),
                    content = data.content,
                    length = content.length,
                    item, elem, width = data.width,
                    group = root.find('.ui-slider-group'),
                    render = data.itemRender || itemRender,
                    index, pos, delta, next;

                index = $.inArray(this._active, content);
                pos = data.index;
                delta = pos - 1;
                next = index + delta;

                if (delta && next < length && next >= 0) {
                    //need to move
                    item = content[next];
                    elem = $(render(item));
                    this._loadImages(elem.find('img[lazyload]'));

                    group.children().eq(1 - delta)
                        .remove();
                    group[delta < 0 ? 'prepend' : 'append'](elem);

                    this._pool.splice(1 - delta, 1);
                    this._pool[delta < 0 ? 'unshift' : 'push'](item);

                    data.index -= delta;
                    data.items = group.children().each(function (i) {
                        this.style.cssText += 'width:' + width + 'px;position:absolute;-webkit-transform:translate3d(' + i * width + 'px,0,0);z-index:' + (900 - i);
                    });
                    data.wheel.style.cssText += '-webkit-transition:0ms;-webkit-transform:translate3d(-' + data.index * width + 'px,0,0);';
                }
                if (index === 0 || index === length - 1) {
                    //到达边缘
                    this.trigger('edge', [index === 0, this._active]);
                }
                return this;
            },

            /**
             * 轮播位置判断
             */
            _move: function (index) {
                var data = this._data,
                    _index;

                data.index = index;
                this._active = this._pool[index];
                this._index = _index = $.inArray(this._active, data.content);

                this.trigger('slide', [_index, this._active]);
                data.wheel.style.cssText += '-webkit-transition:' + (data.animationTime || '0') + 'ms;-webkit-transform:translate3d(-' + data.index * data.width + 'px,0,0);';
            },

            _touchStart: function (e) {
                var data = this._data,
                    target, current, matrix;

                this._touchStartOrg.apply(this, arguments);
                target = -data.index * data.width;
                matrix = getComputedStyle(data.wheel, null)['webkitTransform'].replace(/[^0-9\-.,]/g, '').split(',');
                current = +matrix[4];
                if (target !== current) {
                    this._adjustPos();
                }
            },

            _loadImages: function (imgs) {
                var data = this._data;

                data.imgZoom && imgs.on('load', function () {
                    var h = this.height,
                        w = this.width,
                        width = data.width,
                        height = data.height,
                        min_h = Math.min(h, height),
                        min_w = Math.min(w, width);

                    $(this).off('load', arguments.callee);

                    this.style.cssText += h / height > w / width ?
                        ('height:' + min_h + 'px;' + 'width:' + min_h / h * w + 'px;') :
                        ('height:' + min_w / w * h + 'px;' + 'width:' + min_w + 'px');
                });

                imgs.each(function () {
                    this.src = this.getAttribute('lazyload');
                    this.removeAttribute('lazyload');
                });
            },

            /**
             * @desc 更新内容，直接换掉content中数据，然后重新渲染新设置的内容。在需要延时扩充图片集的情况下使用。
             * @name update
             * @grammar update( content ) => self
             *  @example
             * //setup mode
             * $('#slider').slider('update', [item1, item2, item3]);
             *
             * //render mode
             * var demo = $.ui.slider();
             * demo.update([item1, item2, item3]);
             */
            update: function (content) {
                var data = this._data, group, width = data.width,
                    active,
                    index = $.inArray(active = this._active, content);

                ~index || (index = data._direction > 0 ? 0 : content.length - 1);
                group = this.root().find('.ui-slider-group').empty();
                this._renderItems(data.content = content, index, group, data);
                data.items = group.children()
                    .each(function (i) {
                        this.style.cssText += 'width:' + width + 'px;position:absolute;-webkit-transform:translate3d(' + i * width + 'px,0,0);z-index:' + (900 - i);
                    });

                this._adjustPos();
                active !== this._active && this.trigger('slide', [index || 0, this._active]);
            }
        };
    });
})(Zepto);
/*!Widget suggestion.js*/
/**
 * @file 搜索建议组件
 * @name Suggestion
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/suggestion/suggestion_setup.html</qrcode>
 * 搜索建议组件
 * @import core/touch.js, core/zepto.ui.js, core/zepto.iscroll.js, core/zepto.highlight.js
 */
(function($, undefined){
    /**
     * @name suggestion
     * @desc   搜索建议组件
     * @grammar     suggestion() => self
     * @grammar     $.ui.suggestion([el [,options]]) => self
     * @desc
     * **Options**
     * - ''container''        {Selector}:                  (必选)父元素
     * - ''source''           {String}:                    (必选)请求数据的url
     * - ''param''            {String}:                    (可选)url附加参数
     * - ''formID''           {String}:                    (可选)提交搜索的表单，默认为包含input框的第一个父级form
     * - ''posAdapt''         {Boolean,默认:false}:         (可选)是否自动调整位置
     * - ''listCount''        {Number, 默认: 5}:            (可选)展现sug的条数: 5
     * - ''isCache''          {Boolean, 默认: true}:        (可选)是否缓存query: true
     * - ''isStorage''        {Boolean, 默认: true}:        (可选)是否本地存储pick项: true
     * - ''isSharing''        {Boolean, 默认: true}:        (可选)是否共享历史记录: true
     * - ''shareName''        {String}:                    (可选)共享缓存key
     * - ''autoClose''        {Boolean}:                   (可选)点击input之外自动关闭
     * - ''usePlus''          {Boolean}:                   (可选)是否启用+号
     * - ''status''           {Boolean}:                   (可选)是否开启事件，可在close时设为false，则下次sug不再弹出
     * - ''useIscroll''      {Boolean}:                   (可选)是否启用iscroll，启用则sug可内滚
     * - ''height''           {Number}:                    (可选)设置高度
     * - ''width''            {Number}:                    (可选)设置宽度
     * - ''minChars''         {Number}:                    (可选, 默认: 0)最小输入字符: 0
     * - ''maxChars''         {Number}:                    (可选, 默认: 1000)最大输入字符: 1000
     * - ''offset''           {Object}:                    (可选, 默认: {x:0, y:0})偏移量{x:0, y:0}
     * - ''renderList''       {Function}:                  (可选)自定义渲染下拉列表
     * - ''renderEvent''      {Function}:                  (可选)绑定用户事件
     * - ''sendRequest''      {Function}:                  (可选)用户自定义请求方式
     * - ''select''         {Function}:                    (可选)选中一条sug触发
     * - ''submit''         {Function}:                    (可选)提交时触发
     * - ''open''          {Function}:                    (可选)sug框展开时触发
     * - ''close''         {Function}:                     (可选)sug框关闭时触发
     * **setup方式html规则**
     * <code type="html">
     * <input type="text" id="input">
     * </code>
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/suggestion/suggestion_setup.html">
     * ../gmu/_examples/widget/suggestion/suggestion_setup.html
     * </codepreview>
     */
    $.ui.define('suggestion', {
        _data: {
            listCount: 50,
            isCache: true,
            isStorage: true,
            minChars: 0,
            maxChars: 1000,
            useIscroll: true,
            offset: {x: 0, y: 0, w: 0},
            confirmClearHistory: true
        },

        _create: function() {
            var me = this,
                expando = +new Date(),
                maskID = 'ui-input-mask-' + expando,
                sugID = me.data('id', "ui-suggestion-" + $.ui.guid()),
                $input = me.root($(me.data('container'))).attr("autocomplete", "off"),
                formID = me.data('formID'),
                $maskElem = $input.parent();

            me.data({
                inputWidth: $input.get(0).offsetWidth,
                cacheData: {},
                form: formID ? $(formID) : $input.closest('form')
            });
            if ($maskElem.attr('class') != 'ui-input-mask') {
                $maskElem = $('<div id="' + maskID + '" class="ui-input-mask"></div>').appendTo($input.parent()).append($input);
            }
            me.data('maskElem', $maskElem);
            me.data('wrapper', $('<div id="' + sugID + '" class="ui-suggestion"><div class="ui-suggestion-content"><div class="ui-suggestion-scroller"></div></div><div class="ui-suggestion-button"></div></div>').appendTo($maskElem));
            me._initSuggestionOffset();
        },

        _init: function() {
            var me = this,
                $input = me.root(),
                form = me.data('form'),
                eventHandler = $.proxy(me._eventHandler, me);

            me.data('wrapper').on('touchstart', eventHandler);
            form.length && form.on('submit', eventHandler);
            $input.on('focus input', eventHandler).parent().on('touchstart', eventHandler);
            $(window).on('ortchange', eventHandler);
            me.data('autoClose') && $(document).on('tap', eventHandler);
            me.on('destroy', function() {
                var me = this,
                    $maskElem = me.data('maskElem');
                $(document).off('tap', eventHandler);
                $(window).off('ortchange', eventHandler);
                clearTimeout(me.data('timeId'));
                clearTimeout(me.data('hideTimer'));
                $maskElem.find('*').off();
                me.data('iScroll') && me.data('iScroll').destroy();
                $maskElem.off().remove();
            })._setSize();
        },

        _setup: function(){
            var me = this;
            me.data('container', me.root()); // add container
            me._create();
        },

        /**
         * 初始化属性
         * @private
         */
        _initSuggestionOffset: function() {
            var me = this, width,
                $elem = me.data('wrapper'),
                $input = me.root(),
                customOffset = me.data('offset'),
                border = 2 * parseInt($elem.css('border-left-width') || 0);

            me.data('pos', $input.height() + (customOffset.y || 0));
            me.data('realWidth', (me.data('width') || $input.width()) - border);
            $elem.css({
                position: 'absolute',
                left: customOffset.x || 0
            });
            return me;
        },

        /**
         * 设置size
         * @private
         */
        _setSize: function() {
            var me = this,
                width = me.data('realWidth'),
                additionWidth = me.root().parent().width() - me.data('inputWidth');
            me.data('wrapper').css('width', width + additionWidth);
            return me;
        },

        /**
         * 适配位置
         * @private
         */
        _posAdapt: function(dps) {
            var me = this;
            dps ? me._setPos().data('timeId', $.later(function() {
                me._setPos();
            }, 200, true)) : clearInterval(me.data('timeId'));
            return me;
        },

        /**
         * 设置位置
         * @private
         */
        _setPos: function() {
            var me = this,
                win = window,
                $elem = me.data('wrapper'),
                $input = me.root(),
                height = parseFloat($elem.height()),
                customOffset = me.data('offset'),
                pos =  parseFloat(me.data('pos')),
                uVal = $input.offset().top - win.pageYOffset,
                dVal = $(win).height() - uVal;

            if (me.data('posAdapt') && uVal > dVal) {
                $elem.css('top', -height - (customOffset.y || 0) + 'px');
            } else {
                $elem.css('top', pos);
            }
            return me;
        },

        /**
         * input输入处理
         * @private
         */
        _change: function(query) {
            var me = this,
                data = me._cacheData(query),
                isCache = me.data('isCache'),
                source = me.data('source');
            return data && isCache ? me._render(query, data) : me._sendRequest(query);
        },

        /**
         * 事件管理器
         * @private
         */
        _eventHandler: function(e) {
            var me = this,
                type = e.type,
                target = e.target,
                maskElem = me.data('maskElem').get(0);

            if (!me.data('status')) return;
            switch (type) {
                case 'focus':
                    me._setSize()._showList()._setPos().trigger('open');
                    break;
                case 'touchstart':
                case 'mousedown':
                    if (!e.formDelete) break;
                    e.preventDefault();
                case 'input':
                    me._showList();
                    break;
                case 'ortchange':
                    me._setSize()._setPos();
                    break;
                case 'submit':       //form提交时能存储历史记录
                    me.data('isStorage') && me._localStorage(me.getValue());
                case 'click':
                case 'tap':
                    if (!(maskElem.compareDocumentPosition(target) & 16)) me.hide();
                    break;
            }
        },

        /**
         * 显示下拉浮层
         * @private
         */
        _showList: function() {
            var me = this,
                query = me.getValue(),
                data = me._localStorage();

            if (query !== '' && (query.length < parseFloat(me.data('minChars')) || query.length > parseFloat(me.data('maxChars')))) {
                return me;
            }
            return query ? me._change(query) : data ? me._render(null, {s: data.split(encodeURIComponent(','))}) : me.hide();
        },

        /**
         * 绑定下拉浮层中的事件
         * @private
         */
        _bindSuggestionListEvent: function() {
            var me = this,
                $input =  me.root();
            me.data('wrapper').find(".ui-suggestion-result").on('tap', function(e) {
                var elem = e.target, that = this;
                setTimeout(function(){
                    if (elem && elem.className == 'ui-suggestion-plus') {
                        $input.val(elem.getAttribute('data-item')).trigger('input');
                    } else {
                        me._select(that)._submit();
                    }
                }, 400);
            }).highlight('ui-suggestion-result-highlight');
            return me;
        },

        /**
         * 绑定关闭按钮事件
         * @private
         */
        _bindCloseEvent: function() {
            var me = this,
                $wrapper = me.data('wrapper');

            $wrapper.find('span:first-child').on('click', function() {
                $.later(function(){
                    me.clearHistory();
                }, $.os.android?200:0);
            });

            $wrapper.find('span:last-child').on('click', function() {
                me.hide().leaveInput().trigger('close');
            });
            return me;
        },

        /**
         * 发送异步请求
         * @private
         */
        _sendRequest: function(query) {
            var me = this,
                url = me.data('source'),
                param = me.data('param'),
                cb = "suggestion_" + (+new Date()),
                sendRequest = me.data('sendRequest');

            if ($.isFunction(sendRequest)) {
                sendRequest(query, function(data) {
                    me._render(query, data)._cacheData(query, data);
                });
            } else if (query) {
                url += (url.indexOf("?") === -1 ? "?" : "") + "&wd=" + encodeURIComponent(query);
                url.indexOf("&cb=") === -1 && (url += "&cb=" + cb);
                param && (url += '&' + param);
                window[cb] = function(data) {
                    me._render(query, data)._cacheData(query, data);
                    $('[src="' + url + '"]').remove();
                    delete window[cb];
                };
                $.ajax({
                    url: url,
                    dataType: 'jsonp'
                });
            }
            return me;
        },

        /**
         * @desc 获取input值
         * @name getValue
         * @grammar getValue() => string
         * @example $('#input').suggestion('getValue');
         */
        getValue: function() {
            return $.trim(this.root().val());
        },

        /**
         * 渲染下拉浮层
         * @private
         */
        _render: function(query, data) {
            var me = this, html,
                $elem = me.data('wrapper'),
                $content = $elem.find('.ui-suggestion-content'),
                $button = $elem.find('.ui-suggestion-button'),
                renderList = me.data('renderList'),
                renderEvent = me.data('renderEvent'),
                clearBox = '<span style="display:none;"></span><span>关闭</span>';

            query === null && (clearBox = '<span>清除历史记录</span><span>关闭</span>');
            html = renderList ? renderList.apply(me, [query, data]) : me._renderList(query, data);

            if (html) {
                $content.find('*').off(); // unbind all events in sug list
                $content.find('.ui-suggestion-scroller').html(html);
                $button.find('*').off();
                $button.html(clearBox);
                renderEvent ? renderEvent.apply(me) : me._bindSuggestionListEvent();
                me._bindCloseEvent()._show();
                if (me.data('useIscroll')) {
                    data.s.length >= 2 ? $content.css('height', me.data('height') || 66) : $content.css('height', 38);
                    var iscroll = (me.data('iScroll') || me.data('iScroll', new iScroll($content.get(0), {
                        topOffset: 0,
                        hScroll: false,
                        vScrollbar: false,
                        hScrollbar: false
                    })));
                    iscroll.scrollTo(0, 0);
                    iscroll.refresh();
                } else {
                    $content.on('touchstart', function(e){e.preventDefault()});
                }
            } else me.hide();

            return me;
        },

        /**
         * 渲染list HTML片段
         * @private
         */
        _renderList: function(query, data) {
            var me = this,
                listCount = me.data('listCount'),
                usePlus = me.data('usePlus'),
                html = "<ul>",
                sugs = data.s;

            if (!data || !sugs || !sugs.length) {
                this.hide();
                return;
            }
            sugs = sugs.slice(0, listCount);
            query = this._htmlEncode(query) || null;    //FEBASE-736 修改query为空时,replace替换错误的bug
            $.each(sugs, function(index, item) {
                item = me._htmlEncode(item);
                var str = $.trim(item).replace(query, '<span>' + query + '</span>');
                if (usePlus) str += '<div class="ui-suggestion-plus" data-item="' + item + '"></div>';
                html += '<li><div class="ui-suggestion-result">' + str + '</div></li>';
            });
            return html + '</ul>';
        },

        _htmlEncode: function(str){
            return $('<div></div>').text(str).html();
        },

        /**
         * 提交搜索提示
         * @private
         */
        _submit: function() {
            var me = this,
                keyValue = me.root().val();

            me.trigger("submit");
            if(!me.data('submit') && !(me._callbacks && me._callbacks.submit))
                window.location = 'http://www.baidu.com/s?wd=' + encodeURIComponent(keyValue);
            return me;
        },


        /**
         * 选择搜索提示
         * @private
         */
        _select: function(target) {
            var me = this,
                targetContent = target.textContent;

            me.root().val(targetContent);
            me.data('isStorage') && me._localStorage(targetContent);
            return me.trigger("select", target).hide();
        },

        /**
         * 缓存搜索提示
         * @private
         */
        _cacheData: function(key, value) {
            var me = this;
            if (me.data('isCache')) {
                return value !== undefined ? me.data('cacheData')[key] = value : me.data('cacheData')[key];
            }
        },

        /**
         * 操作历史记录
         * @private
         */
        _localStorage: function(value) {
            var me = this,
                ret,
                localdata,
                data,
                shareName = me.data('shareName'),
                id = me.data('isSharing') ? shareName ? shareName + '-SUG-Sharing-History' : 'SUG-Sharing-History' : me.data('id');

            try{
                if (value === null) window.localStorage[id] = "";
                else if (value !== undefined) {
                    localdata = window.localStorage[id];
                    data = localdata ? localdata.split(encodeURIComponent(',')) : [];

                    if (!~$.inArray(value, data) ) {
                        data.unshift(value);
                        window.localStorage[id] = data.join(encodeURIComponent(','));
                    }
                }
                ret = window.localStorage[id];
            } catch(e){}
            return ret;
        },

        /**
         * 显示suggestion
         * @private
         */
        _show: function() {
            var me = this;
            // hide后200ms内再次show，清除timer
            if(me.data('hideTimer')) {
                clearTimeout(me.data('hideTimer'));
                me.data('hideTimer', null);
            }
            me.data('wrapper').css("display", "block");
            me.data('posAdapt') && me._posAdapt(1);
            return me.trigger('show');
        },

        /**
         * @desc 隐藏suggestion
         * @name hide
         * @grammar hide() => self
         */
        hide: function() {
            var me = this;
            me.data('hideTimer', $.later(function() {
                me.data('wrapper').css("display", "none");
                me.data('hideTimer', null);
            }, 200));
            return me._posAdapt(0).trigger('hide');
        },

        /**
         * @desc 清除历史记录
         * @name clearHistory
         * @grammar clearHistory() => undefined
         */
        clearHistory: function() {
            var me = this, _clear = function(){
                me._localStorage(null);
                me.hide();
            };
            me.data('confirmClearHistory') ? window.confirm('清除全部查询历史记录？') && _clear() : _clear();
        },

        /**
         * @desc 设置|获取历史记录
         * @name history
         * @grammar history() => string
         * @param {String} query 搜索条件
         */
        history: function(query) {
            return this._localStorage(query);
        },

        /**
         * @desc input获得焦点
         * @name focusInput
         * @grammar focusInput() => self
         */
        focusInput: function() {
            this.root().get(0).focus();
            return this;
        },

        /**
         * @desc input失去焦点
         * @name leaveInput
         * @grammar leaveInput() => self
         */
        leaveInput: function() {
            this.root().get(0).blur();
            return this;
        }
    });
})(Zepto);


/*!Widget quickdelete.js*/
/**
 * @file 快速删除组件
 * @name Quickdelete
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/suggestion/suggestion_setup.html</qrcode>
 * 快速删除组件
 * @import core/zepto.ui.js
 */
(function($) {
    /**
     * @name   quickdelete
     * @grammar  quickdelete    =>self
     * @grammar  $.ui.quickdelete([options])    =>self
     * @desc   快速删除组件
     * **Options**
     * - ''container''     {Selector}: (必选)父元素
     * - ''delete''        {Function}: (可选)点击close按钮时触发
     * - ''size''          {Number}: (可选，默认: 20)close按钮的大小
     * - ''offset''        {Object}: (可选，默认: {x:0, y:0})close按钮偏移量
     *
     * **setup方式html规则**
     * <code type="html">
     * <input type="text" id="input">
     * </code>
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/suggestion/suggestion_setup.html">
     * ../gmu/_examples/widget/suggestion/suggestion_setup.html
     * </codepreview>
     */
    $.ui.define('quickdelete', {
        _data: {
            size: 20,
            offset: {x: 0, y: 0}
        },

        _create: function() {
            var me = this,
                $input = me.data('input', $(me.data('container'))),
                expando = +new Date(),
                maskID = 'ui-input-mask-' + expando,
                elemID = "ui-quickdelete-delete-" + expando,
                $maskElem = $input.parent(),
                $deleteElem = $('<div id="' + elemID + '" class="ui-quickdelete-button"></div>').css({
                    height: me.data('size'),
                    width: me.data('size')
                });

            //在android2.1下-webkit-background-size不支持contain属性，
            $.os.android && $.os.android && parseFloat($.os.version).toFixed(1) == 2.1 && $deleteElem.css('-webkit-background-size', '20px 20px');
            if ($maskElem.attr('class') != 'ui-input-mask') {
                // avoid input blur
                $maskElem = $('<div id="' + maskID + '" class="ui-input-mask"></div>').appendTo($input.parent()).append($input);
            }

            me.root($maskElem.append(me.data('deleteElem', $deleteElem)).css('height', $input.height()));
            me._initButtonOffset();
        },

        _setup: function(){
            var me = this;
            me.data('container', me.root());
            this._create();
        },

        _init: function() {
            var me = this,
                $input = me.data('input'),
                eventHandler = $.proxy(me._eventHandler, me);

            $input.on('focus input blur', eventHandler);
            me.data('deleteElem').on('touchstart', eventHandler);
            me.on('destroy', function(){
                $input.off('focus input blur', eventHandler);
                me.data('deleteElem').off('touchstart', eventHandler);
                eventHandler = $.fn.emptyFn;
            });
            me.trigger('init');
        },

        _show: function() {
            this.data('deleteElem').css('visibility', 'visible');
            return this;
        },

        _hide: function() {
            this.data('deleteElem').css('visibility', 'hidden');
            return this;
        },

        _eventHandler: function(e){
            var me = this,
                type = e.type,
                target = e.target,
                $input = me.data('input');

            switch (type) {
                case 'focus':
                case 'input':
                    $.trim($input.val()) ? me._show() : me._hide();
                    break;
                case 'mousedown':
                case 'touchstart':
                    if (target == me.data('deleteElem').get(0)) {
                        e.preventDefault();
                        e.formDelete = true; // suggestion解决删除问题
                        $input.val('');
                        me._hide().trigger('delete');
                        $input.blur().focus();      //中文输入时，focus失效 trace:FEBASE-779
                    }
                    break;
                case 'blur':
                    me._hide();
                    break;
            }
        },

        _initButtonOffset: function() {
            var me = this,
                $input = me.data('input'),
                size = me.data('size'),
                targetOffset = me.root().offset(),
                customOffset = me.data('offset'),
                offsetX = customOffset.x || 0,
                offsetY = customOffset.y || 0,
                paddingOffsetY = Math.round((targetOffset.height - 2*offsetY - size) / 2); // padding值根据外层容器的宽度-Y的偏移量-小叉的大小

            me.data('deleteElem').css({
                padding: paddingOffsetY < 0 ? 0 : paddingOffsetY,
                top: offsetY,
                right: offsetX
            });

            $input.css({ // 处理输入长字符串，input挡住删除按钮问题
                position: 'absolute',
                top: 0,
                left: 0,
                width: 'auto',
                right: size + 20
            });
            return me;
        }
    });

})(Zepto);
/*!Widget dialog.js*/
/**
 * @file 弹出框组件
 * @name Dialog
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/dialog/dialog.html</qrcode>
 * 弹出框组件
 * @import core/zepto.ui.js, core/zepto.highlight.js
 */
(function($, undefined) {
    var tpl = {
        close: '<a class="ui-dialog-close" title="关闭"><span class="ui-icon ui-icon-delete"></span></a>',
        mask: '<div class="ui-mask"></div>',
        title: '<div class="ui-dialog-title">'+
            '<h3><%=title%></h3>'+
            '</div>',
        wrap: '<div class="ui-dialog">'+
            '<div class="ui-dialog-content"></div>'+
            '<% if(btns){ %>'+
            '<div class="ui-dialog-btns">'+
            '<% for(var i=0, length=btns.length; i<length; i++){var item = btns[i]; %>'+
            '<a class="ui-btn ui-btn-<%=item.index%>" data-key="<%=item.key%>"><%=item.text%></a>'+
            '<% } %>'+
            '</div>'+
            '<% } %>' +
            '</div> '
    };

    /**
     * @name $.ui.dialog
     * @grammar $.ui.dialog(options) ⇒ instance
     * @grammar dialog(options) ⇒ self
     * @desc **Options**
     * - ''autoOpen'' {Boolean}: (可选，默认：true)初始化后是否自动弹出
     * - ''closeBtn'' {Boolean}: (可选，默认：true)是否显示关闭按钮
     * - ''mask'' {Boolean}: (可选，默认：true)是否有遮罩层
     * - ''scrollMove'' {Boolean}: (可选，默认：true)是否禁用掉scroll，在弹出的时候
     * - ''title'' {String}: (可选)弹出框标题
     * - ''content'' {String|Selector}: (render模式下必填)弹出框内容
     * - ''width'' {String|Number}: (可选，默认: 300)弹出框宽度
     * - ''height'' {String|Number}: (可选，默认: \'auto\')弹出框高度
     * - ''buttons'' {Object}: (可选) 用来设置弹出框底部按钮，传入的格式为{key1: fn1, key2, fn2}，key将作为按钮的文字，fn将作为按钮点击后的Handler
     * - ''events'' 所有[Trigger Events](#dialog_triggerevents)中提及的事件都可以在此设置Hander, 如init: function(e){}。
     *
     * **如果是setup模式，部分参数是直接从DOM上读取**
     * - ''title'' 从element的title属性中读取
     * - ''content'' 直接为element。
     *
     * **比如**
     * <code>//<div id="dialog" title="弹出框标题"></div>
     * console.log($('#dialog').dialog('data', 'title')); // => 弹出框标题
     * console.log($('#dialog').dialog('data', 'content')); // => #dialog(Zepto对象)
     * </code>
     *
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/dialog/dialog.html">
     * ../gmu/_examples/widget/dialog/dialog.html
     * </codepreview>
     */
    $.ui.define('dialog', {
        _data: {
            autoOpen: true,
            buttons: null,
            closeBtn: true,
            mask: true,
            width: 300,
            height: 'auto',
            title: null,
            content: null,
            scrollMove: true,//是否禁用掉scroll，在弹出的时候
            container: null,
            maskClick: null,
            position: null //需要dialog.position插件才能用
        },

        /**
         * @name getWrap
         * @grammar getWrap() ⇒ Zepto instance
         * @desc 获取最外层的节点。
         */
        getWrap: function(){
            return this._data._wrap;
        },

        _setup: function(){
            var data = this._data;
            data.content = data.content || this._el.show();
            data.title = data.title || this._el.attr('title');
        },

        _init: function(){
            var me = this, data = me._data, btns,
                i= 0, eventHanlder = $.proxy(me._eventHandler, me), vars = {};

            data._container = $(data.container || document.body);
            (data._cIsBody = data._container.is('body')) || data._container.addClass('ui-dialog-container');
            vars.btns = btns= [];
            data.buttons && $.each(data.buttons, function(key){
                btns.push({
                    index: ++i,
                    text: key,
                    key: key
                });
            });
            data._mask = data.mask ? $(tpl.mask).appendTo(data._container) : null;
            data._wrap = $($.parseTpl(tpl.wrap, vars)).appendTo(data._container);
            data._content = $('.ui-dialog-content', data._wrap);

            data._title = $(tpl.title);
            data._close = data.closeBtn && $(tpl.close).highlight('ui-dialog-close-hover');
            me._el = me._el || data._content;//如果不需要支持render模式，此句要删除

            me.title(data.title);
            me.content(data.content);

            btns.length && $('.ui-dialog-btns .ui-btn', data._wrap).highlight('ui-state-hover');
            data._wrap.css({
                width: data.width,
                height: data.height
            });

            //bind events绑定事件
            $(window).on('ortchange', eventHanlder);
            data._wrap.on('click', eventHanlder);
            data._mask && data._mask.on('click', eventHanlder);
            data.autoOpen && me.root().one('init', function(){me.open();});
        },

        _eventHandler: function(e){
            var me = this, match, wrap, data = me._data, fn;
            switch(e.type){
                case 'ortchange':
                    this.refresh();
                    break;
                case 'touchmove':
                    data.scrollMove && e.preventDefault();
                    break;
                case 'click':
                    if(data._mask && ($.contains(data._mask[0], e.target) || data._mask[0] === e.target )){
                        return me.trigger('maskClick');
                    }
                    wrap = data._wrap.get(0);
                    if( (match = $(e.target).closest('.ui-dialog-close', wrap)) && match.length ){
                        me.close();
                    } else if( (match = $(e.target).closest('.ui-dialog-btns .ui-btn', wrap)) && match.length ) {
                        fn = data.buttons[match.attr('data-key')];
                        fn && fn.apply(me, arguments);
                    }
            }
        },

        _calculate: function(){
            var me = this, data = me._data, size, $win, root = document.body,
                ret = {}, isBody = data._cIsBody, round = Math.round;

            data.mask && (ret.mask = isBody ? {
                width:  '100%',
                height: Math.max(root.scrollHeight, root.clientHeight)-1//不减1的话uc浏览器再旋转的时候不触发resize.奇葩！
            }:{
                width: '100%',
                height: '100%'
            });

            size = data._wrap.offset();
            $win = $(window);
            ret.wrap = {
                left: '50%',
                marginLeft: -round(size.width/2) +'px',
                top: isBody?round($win.height() / 2) + window.pageYOffset:'50%',
                marginTop: -round(size.height/2) +'px'
            }
            return ret;
        },

        /**
         * @name refresh
         * @grammar refresh() ⇒ instance
         * @desc 用来更新弹出框位置和mask大小。如父容器大小发生变化时，可能弹出框位置不对，可以外部调用refresh来修正。
         */
        refresh: function(){
            var me = this, data = me._data, ret, action;
            if(data._isOpen) {

                action = function(){
                    ret = me._calculate();
                    ret.mask && data._mask.css(ret.mask);
                    data._wrap.css(ret.wrap);
                }

                //如果有键盘在，需要多加延时
                if( $.os.ios &&
                    document.activeElement &&
                    /input|textarea|select/i.test(document.activeElement.tagName)){

                    document.body.scrollLeft = 0;
                    $.later(action, 200);//do it later in 200ms.

                } else {
                    action();//do it now
                }
            }
            return me;
        },

        /**
         * @name open
         * @grammar open() ⇒ instance
         * @grammar open(x, y) ⇒ instance
         * @desc 弹出弹出框，如果设置了位置，内部会数值转给[position](widget/dialog.js#position)来处理。
         */
        open: function(x, y){
            var data = this._data;
            data._isOpen = true;

            data._wrap.css('display', 'block');
            data._mask && data._mask.css('display', 'block');

            x !== undefined && this.position ? this.position(x, y) : this.refresh();

            $(document).on('touchmove', $.proxy(this._eventHandler, this));
            return this.trigger('open');
        },

        /**
         * @name close
         * @grammar close() ⇒ instance
         * @desc 关闭弹出框
         */
        close: function(){
            var eventData, data = this._data;

            eventData = $.Event('beforeClose');
            this.trigger(eventData);
            if(eventData.defaultPrevented)return this;

            data._isOpen = false;
            data._wrap.css('display', 'none');
            data._mask && data._mask.css('display', 'none');

            $(document).off('touchmove', this._eventHandler);
            return this.trigger('close');
        },

        /**
         * @name title
         * @grammar title([value]) ⇒ value
         * @desc 设置或者获取弹出框标题。value接受带html标签字符串
         * @example $('#dialog').dialog('title', '标题<span>xxx</span>');
         */
        title: function(value) {
            var data = this._data, setter = value !== undefined;
            if(setter){
                value = (data.title = value) ? '<h3>'+value+'</h3>' : value;
                data._title.html(value)[value?'prependTo':'remove'](data._wrap);
                data._close && data._close.prependTo(data.title? data._title : data._wrap);
            }
            return setter ? this : data.title;
        },

        /**
         * @name content
         * @grammar content([value]) ⇒ value
         * @desc 设置或者获取弹出框内容。value接受带html标签字符串和zepto对象。
         * @example
         * $('#dialog').dialog('content', '内容');
         * $('#dialog').dialog('content', '<div>内容</div>');
         * $('#dialog').dialog('content', $('#content'));
         */
        content: function(val) {
            var data = this._data, setter = val!==undefined;
            setter && data._content.empty().append(data.content = val);
            return setter ? this: data.content;
        },

        /**
         * @desc 销毁组件。
         * @name destroy
         * @grammar destroy()  ⇒ instance
         */
        destroy: function(){
            var data = this._data, _eventHander = this._eventHandler;
            $(window).off('ortchange', _eventHander);
            $(document).off('touchmove', _eventHander);
            data._wrap.off('click', _eventHander).remove();
            data._mask && data._mask.off('click', _eventHander).remove();
            data._close && data._close.highlight();
            return this.$super('destroy');
        }

        /**
         * @name Trigger Events
         * @theme event
         * @desc 组件内部触发的事件
         *
         * ^ 名称 ^ 处理函数参数 ^ 描述 ^
         * | init | event | 组件初始化的时候触发，不管是render模式还是setup模式都会触发 |
         * | open | event | 当弹出框弹出后触发 |
         * | beforeClose | event | 在弹出框关闭之前触发，可以通过e.preventDefault()来阻止 |
         * | close | event | 在弹出框关闭之后触发 |
         * | destroy | event | 组件在销毁的时候触发 |
         */
    });
})(Zepto);
/*!Widget dialog.position.js*/
/**
 * @file Dialog － 父容器插件
 * @name Dialog.position
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/dialog/dialog_position.html</qrcode>
 * @short Dialog.position
 * @import widget/dialog.js, core/zepto.position.js
 */
(function ($, undefined) {
    /**
     * @name dialog.position
     * @desc 用zepto.position来定位dialog
     *
     *
     *
     *
     *
     *
     *
     *
     *
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/dialog/dialog_position.html">
     * ../gmu/_examples/widget/dialog/dialog_position.html
     * </codepreview>
     */
    $.ui.dialog.register(function () {
        return {
            pluginName: 'position',

            _init: function(){
                var data = this._data;
                this._initOrg();
                data.position = data.position || {of: data.container || window, at: 'center', my: 'center'};
            },

            /**
             * @name position
             * @grammar position(x, y) ⇒ instance
             * @desc 用来设置弹出框的位置，如果不另外设置，组件默认为上下左右居中对齐。位置参数接受，数值，百分比，带单位的数值，或者'center'。
             * 如: 100， 100px, 100em, 10%, center;
             * @notice 暂时不支持 left, right, top, bottom.
             */
            position: function(x, y){
                var data = this._data;
                if(!$.isPlainObject(x)){//兼容老格式！
                    data.position.at = 'left'+(x>0?'+'+x: x)+' top'+(y>0?'+'+y: y);
                } else $.extend(data.position, x);
                return this.refresh();
            },

            _calculate:function () {
                var me = this, data = me._data, position = data.position,
                    ret = this._calculateOrg();

                data._wrap.position($.extend(position, {
                    using: function(position){
                        ret.wrap = position;
                    }
                }));
                return ret;
            }
        }
    });
})(Zepto);

/*!Widget calendar.js*/
/**
 * @file 日历组件
 * @name Calendar
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/calendar/calendar.html</qrcode>
 * 日历组件, 可以用来给一容器生成日历。
 * @import core/touch.js, core/zepto.ui.js, core/zepto.highlight.js
 */
(function($, undefined) {
    var monthNames = ["01月", "02月", "03月", "04月", "05月", "06月",
            "07月", "08月", "09月", "10月", "11月", "12月"],

        dayNames = ["日", "一", "二", "三", "四", "五", "六"],
        offsetRE = /^(\+|\-)?(\d+)(M|Y)$/i,

    //获取月份的天数
        getDaysInMonth = function(year, month) {
            return 32 - new Date(year, month, 32).getDate();
        },

    //获取月份中的第一天是所在星期的第几天
        getFirstDayOfMonth = function(year, month) {
            return new Date(year, month, 1).getDay();
        },

    //格式化数字，不足补零.
        formatNumber = function(val, len) {
            var num = "" + val;
            while (num.length < len) {
                num = "0" + num;
            }
            return num;
        },

        getVal = function(elem) {
            return elem.is('select, input') ? elem.val() : elem.attr('data-value');
        },

        prototype;

    /**
     * @name $.ui.calendar
     * @grammar $.ui.calendar(options) ⇒ instance
     * @grammar calendar(options) ⇒ self
     * @desc **Options**
     * - ''date'' {Date|String}: (可选，默认：today) 初始化日期
     * - ''firstDay'' {Number}: (可选，默认：1)  设置新的一周从星期几开始，星期天用0表示, 星期一用1表示, 以此类推.
     * - ''minDate'' {Date|String}: (可选，默认：null)  设置可以选择的最小日期
     * - ''maxDate'' {Date|String}: (可选，默认：null)  设置可以选择的最大日期
     * - ''swipeable'' {Boolean}: (可选，默认：false)  设置是否可以通过左右滑动手势来切换日历
     * - ''monthChangeable'' {Boolean}: (可选，默认：false)  设置是否让月份可选择
     * - ''yearChangeable'' {Boolean}: (可选，默认：false)  设置是否让年份可选择
     * - ''events'' 所有[Trigger Events](#calendar_triggerevents)中提及的事件都可以在此设置Hander, 如init: function(e){}。
     *
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/calendar/calendar.html">
     * ../gmu/_examples/widget/calendar/calendar.html
     * </codepreview>
     */
    $.ui.define('calendar', {
        _data: {
            date: null, //默认日期
            firstDay: 1, //星期天用0表示, 星期一用1表示, 以此类推.
            maxDate: null, //可以选择的日期范围
            minDate: null,
            swipeable: false,
            monthChangeable: false,
            yearChangeable: false
        },

        _create: function() {
            var el = this.root();

            //如果没有指定el, 则创建一个空div
            el = el || this.root($('<div></div>'));
            el.appendTo(this.data('container') || (el.parent().length ? '' : document.body));
        },

        _init: function() {
            var data = this._data,
                el = this._container || this.root(),
                eventHandler = $.proxy(this._eventHandler, this);

            this.minDate(data.minDate)
                .maxDate(data.maxDate)
                .date(data.date || new Date())
                .refresh();

            el.addClass('ui-calendar')
                .on('click', eventHandler)
                .highlight();

            data.swipeable && el.on('swipeLeft swipeRight', eventHandler);
        },

        _eventHandler: function(e) {
            var data = this._data,
                root = (this._container || this.root()).get(0),
                match,
                target,
                cell,
                date,
                elems;

            switch (e.type) {
                case 'swipeLeft':
                case 'swipeRight':
                    return this.switchMonthTo((e.type == 'swipeRight' ? '-' : '+') + '1M');

                case 'change':
                    elems = $('.ui-calendar-header .ui-calendar-year, ' +
                        '.ui-calendar-header .ui-calendar-month', this._el);

                    return this.switchMonthTo(getVal(elems.eq(1)), getVal(elems.eq(0)));

                default:
                    //click

                    target = e.target;

                    if ((match = $(target).closest('.ui-calendar-calendar tbody a', root)) && match.length) {

                        e.preventDefault();
                        cell = match.parent();

                        this._option('selectedDate',
                            date = new Date(cell.attr('data-year'), cell.attr('data-month'), match.text()));

                        this.trigger('select', [date, $.calendar.formatDate(date), this]);
                        this.refresh();
                    } else if ((match = $(target).closest('.ui-calendar-prev, .ui-calendar-next', root)) && match.length) {

                        e.preventDefault();
                        this.switchMonthTo((match.is('.ui-calendar-prev') ? '-' : '+') + '1M');
                    }
            }
        },

        /**
         * @ignore
         * @name option
         * @grammar option(key[, value]) ⇒ instance
         * @desc 设置或获取Option，如果想要Option生效需要调用[Refresh](#calendar_refresh)方法。
         */
        _option: function(key, val) {
            var data = this._data,
                date, minDate, maxDate;

            //如果是setter
            if (val !== undefined) {

                switch (key) {
                    case 'minDate':
                    case 'maxDate':
                        data[key] = val ? $.calendar.parseDate(val) : null;
                        break;

                    case 'selectedDate':
                        minDate = data.minDate;
                        maxDate = data.maxDate;
                        val = $.calendar.parseDate(val);
                        val = minDate && minDate > val ? minDate : maxDate && maxDate < val ? maxDate : val;
                        data._selectedYear = data._drawYear = val.getFullYear();
                        data._selectedMonth = data._drawMonth = val.getMonth();
                        data._selectedDay = val.getDate();
                        break;

                    case 'date':
                        this._option('selectedDate', val);
                        data[key] = this._option('selectedDate');
                        break;

                    default:
                        data[key] = val;
                }

                //标记为true, 则表示下次refresh的时候要重绘所有内容。
                data._invalid = true;

                //如果是setter则要返回instance
                return this;
            }

            return key == 'selectedDate' ? new Date(data._selectedYear, data._selectedMonth, data._selectedDay) : data[key];
        },

        /**
         * 切换到今天所在月份。
         * @name switchToToday
         * @grammar switchToToday() ⇒ instance
         * @returns {*}
         */
        switchToToday: function() {
            var today = new Date();
            return this.switchMonthTo(today.getMonth(), today.getFullYear());
        },

        /**
         * @name switchMonthTo
         * @grammar switchMonthTo(month, year) ⇒ instance
         * @grammar switchMonthTo(str) ⇒ instance
         * @desc 使组件显示某月，当第一参数为str可以+1M, +4M, -5Y, +1Y等等。+1M表示在显示的月的基础上显示下一个月，+4m表示下4个月，-5Y表示5年前
         */
        switchMonthTo: function(month, year) {
            var data = this._data,
                minDate = this.minDate(),
                maxDate = this.maxDate(),
                offset,
                period,
                tmpDate;

            if ($.isString(month) && offsetRE.test(month)) {
                offset = RegExp.$1 == '-' ? -parseInt(RegExp.$2, 10) : parseInt(RegExp.$2, 10);
                period = RegExp.$3.toLowerCase();
                month = data._drawMonth + (period == 'm' ? offset : 0);
                year = data._drawYear + (period == 'y' ? offset : 0);
            } else {
                month = parseInt(month, 10);
                year = parseInt(year, 10);
            }

            //Date有一定的容错能力，如果传入2012年13月，它会变成2013年1月
            tmpDate = new Date(year, month, 1);

            //不能跳到不可选的月份
            tmpDate = minDate && minDate > tmpDate ? minDate : maxDate && maxDate < tmpDate ? maxDate : tmpDate;

            month = tmpDate.getMonth();
            year = tmpDate.getFullYear();

            if (month != data._drawMonth || year != data._drawYear) {
                this.trigger('monthchange', [
                    data._drawMonth = month, data._drawYear = year, this]);

                data._invalid = true;
                this.refresh();
            }

            return this;
        },

        /**
         * @name refresh
         * @grammar refresh() ⇒ instance
         * @desc 当修改option后需要调用此方法。
         */
        refresh: function() {
            var data = this._data,
                el = this._container || this.root(),
                eventHandler = $.proxy(this._eventHandler, this);

            //如果数据没有变化厕不重绘了
            if (!data._invalid) {
                return;
            }

            $('.ui-calendar-calendar td:not(.ui-state-disabled), .ui-calendar-header a', el).highlight();
            $('.ui-calendar-header select', el).off('change', eventHandler);
            el.empty().append(this._generateHTML());
            $('.ui-calendar-calendar td:not(.ui-state-disabled), .ui-calendar-header a', el).highlight('ui-state-hover');
            $('.ui-calendar-header select', el).on('change', eventHandler);
            data._invalid = false;
            return this;
        },

        /**
         * @desc 销毁组件。
         * @name destroy
         * @grammar destroy()  ⇒ instance
         */
        destroy: function() {
            var el = this._container || this.root(),
                eventHandler = this._eventHandler;

            $('.ui-calendar-calendar td:not(.ui-state-disabled)', el).highlight();
            $('.ui-calendar-header select', el).off('change', eventHandler);
            return this.$super('destroy');
        },

        /**
         * 重绘表格
         */
        _generateHTML: function() {
            var data = this._data,
                drawYear = data._drawYear,
                drawMonth = data._drawMonth,
                tempDate = new Date(),
                today = new Date(tempDate.getFullYear(), tempDate.getMonth(),
                    tempDate.getDate()),

                minDate = this.minDate(),
                maxDate = this.maxDate(),
                selectedDate = this.selectedDate(),
                html = '',
                i,
                j,
                firstDay,
                day,
                leadDays,
                daysInMonth,
                rows,
                printDate;

            firstDay = (isNaN(firstDay = parseInt(data.firstDay, 10)) ? 0 : firstDay);

            html += this._renderHead(data, drawYear, drawMonth, minDate, maxDate) +
                '<table  class="ui-calendar-calendar"><thead><tr>';

            for (i = 0; i < 7; i++) {
                day = (i + firstDay) % 7;

                html += '<th' + ((i + firstDay + 6) % 7 >= 5 ?

                    //如果是周末则加上ui-calendar-week-end的class给th
                    ' class="ui-calendar-week-end"' : '') + '>' +
                    '<span>' + dayNames[day] + '</span></th>';
            }

            //添加一个间隙，样式需求
            html += '</thead></tr><tbody><tr class="ui-calendar-gap">' +
                '<td colspan="7">&#xa0;</td></tr>';

            daysInMonth = getDaysInMonth(drawYear, drawMonth);
            leadDays = (getFirstDayOfMonth(drawYear, drawMonth) - firstDay + 7) % 7;
            rows = Math.ceil((leadDays + daysInMonth) / 7);
            printDate = new Date(drawYear, drawMonth, 1 - leadDays);

            for (i = 0; i < rows; i++) {
                html += '<tr>';

                for (j = 0; j < 7; j++) {
                    html += this._renderDay(j, printDate, firstDay, drawMonth, selectedDate, today, minDate, maxDate);
                    printDate.setDate(printDate.getDate() + 1);
                }
                html += '</tr>';
            }
            html += '</tbody></table>';
            return html;
        },

        _renderHead: function(data, drawYear, drawMonth, minDate, maxDate) {
            var html = '<div class="ui-calendar-header">',

            //上一个月的最后一天
                lpd = new Date(drawYear, drawMonth, -1),

            //下一个月的第一天
                fnd = new Date(drawYear, drawMonth + 1, 1),
                i,
                max;

            html += '<a class="ui-calendar-prev' + (minDate && minDate > lpd ?
                ' ui-state-disable' : '') + '" href="#">&lt;&lt;</a><div class="ui-calendar-title">';

            if (data.yearChangeable) {
                html += '<select class="ui-calendar-year">';

                for (i = Math.max(1970, drawYear - 10), max = i + 20; i < max; i++) {
                    html += '<option value="' + i + '" ' + (i == drawYear ?
                        'selected="selected"' : '') + '>' + i + '年</option>';
                }
                html += '</select>';
            } else {
                html += '<span class="ui-calendar-year" data-value="' + drawYear + '">' + drawYear + '年' + '</span>';
            }

            if (data.monthChangeable) {
                html += '<select class="ui-calendar-month">';

                for (i = 0; i < 12; i++) {
                    html += '<option value="' + i + '" ' + (i == drawMonth ?
                        'selected="selected"' : '') + '>' + monthNames[i] + '</option>';
                }
                html += '</select>';
            } else {
                html += '<span class="ui-calendar-month" data-value="' + drawMonth + '">' + monthNames[drawMonth] + '</span>';
            }

            html += '</div><a class="ui-calendar-next' + (maxDate && maxDate < fnd ?
                ' ui-state-disable' : '') + '" href="#">&gt;&gt;</a></div>';
            return html;
        },

        _renderDay: function(j, printDate, firstDay, drawMonth, selectedDate, today, minDate, maxDate) {

            var otherMonth = (printDate.getMonth() !== drawMonth),
                unSelectable;

            unSelectable = otherMonth || (minDate && printDate < minDate) || (maxDate && printDate > maxDate);

            return "<td class='" + ((j + firstDay + 6) % 7 >= 5 ? "ui-calendar-week-end" : "") + // 标记周末

                (unSelectable ? " ui-calendar-unSelectable ui-state-disabled" : "") + //标记不可点的天

                (otherMonth || unSelectable ? '' : (printDate.getTime() === selectedDate.getTime() ? " ui-calendar-current-day" : "") + //标记当前选择
                    (printDate.getTime() === today.getTime() ? " ui-calendar-today" : "") //标记今天
                    ) + "'" +

                (unSelectable ? "" : " data-month='" + printDate.getMonth() + "' data-year='" + printDate.getFullYear() + "'") + ">" +

                (otherMonth ? "&#xa0;" : (unSelectable ? "<span class='ui-state-default'>" + printDate.getDate() + "</span>" :
                    "<a class='ui-state-default" + (printDate.getTime() === today.getTime() ? " ui-state-highlight" : "") + (printDate.getTime() === selectedDate.getTime() ? " ui-state-active" : "") +
                        "' href='#'>" + printDate.getDate() + "</a>")) + "</td>";
        }
    });

    prototype = $.ui.calendar.prototype;

    //添加更直接的option修改接口
    $.each(['maxDate', 'minDate', 'date', 'selectedDate'], function(i, name) {
        prototype[name] = function(val) {
            return this._option(name, val);
        }
    });

    //补充注释

    /**
     * @name maxDate
     * @grammar maxDate([value]) ⇒ instance
     * @desc 设置或获取maxDate，如果想要Option生效需要调用[Refresh](#calendar_refresh)方法。
     */

    /**
     * @name minDate
     * @grammar minDate([value]) ⇒ instance
     * @desc 设置或获取minDate，如果想要Option生效需要调用[Refresh](#calendar_refresh)方法。
     */

    /**
     * @name date
     * @grammar date([value]) ⇒ instance
     * @desc 设置或获取当前date，如果想要Option生效需要调用[Refresh](#calendar_refresh)方法。
     */

    /**
     * @name date
     * @grammar date([value]) ⇒ instance
     * @desc 设置或获取当前选中的日期，如果想要Option生效需要调用[Refresh](#calendar_refresh)方法。
     */


        //@todo 支持各种格式
        //开放接口，如果现有格式不能满足需求，外部可以通过覆写一下两个方法
    $.calendar = {

        /**
         * 解析字符串成日期格式对象。目前支持yyyy-mm-dd格式和yyyy/mm/dd格式。
         * @name $.calendar.parseDate
         * @grammar $.calendar.parseDate( str ) ⇒ Date
         */
        parseDate: function(obj) {
            var dateRE = /^(\d{4})(?:\-|\/)(\d{1,2})(?:\-|\/)(\d{1,2})$/;
            return $.isDate(obj) ? obj : dateRE.test(obj) ? new Date(parseInt(RegExp.$1, 10), parseInt(RegExp.$2, 10) - 1, parseInt(RegExp.$3, 10)) : null;
        },

        /**
         * 格式化日期对象为字符串, 输出格式为yyy-mm-dd
         * @name $.calendar.formatDate
         * @grammar $.calendar.formatDate( date ) ⇒ String
         */
        formatDate: function(date) {
            return date.getFullYear() + '-' + formatNumber(date.getMonth() + 1, 2) + '-' + formatNumber(date.getDate(), 2);
        }
    }

    /**
     * @name Trigger Events
     * @theme event
     * @desc 组件内部触发的事件
     *
     * ^ 名称 ^ 处理函数参数 ^ 描述 ^
     * | init | event | 组件初始化的时候触发，不管是render模式还是setup模式都会触发 |
     * | select | event, date, dateStr, ui | 选中日期的时候触发 |
     * | monthchange | event, month, year, ui | 当当前现实月份发生变化时触发 |
     * | destroy | event | 组件在销毁的时候触发 |
     */

})(Zepto);
/*!Widget calendar.picker.js*/
/**
 * @file Calendar － Picker插件
 * @name Calendar － Picker插件
 * @short Calendar.picker
 * @import widget/calendar.js, core/zepto.highlight.js
 * @desc 默认的Calendar组件，只是在指定容器上生成日历功能，与表单元素的交互功能在此插件中体现.
 *
 * selector将会被认为是可赋值对象，当确认按钮点击后，所选的日期会赋值给selector。
 *
 * **Demo**
 * <codepreview href="../gmu/_examples/widget/calendar/calendar_picker.html">
 * ../gmu/_examples/widget/calendar/calendar_picker.html
 * </codepreview>
 */
(function ($) {

    $.ui.calendar.register(function () {
        return {
            pluginName: 'picker',

            _create: function () {
                var el = this.root();

                if( !el ) {
                    throw new Error("请指定日期选择器的赋值对象");
                }
            },

            _init: function(){
                var el = this.root(),
                    data = this._data;

                this._container = $('<div></div>');

                //如果有初始值，则把此值赋值给calendar
                data.date || (data.date = el[el.is('select, input')?'val':'text']());

                this._initOrg();

                $(window).on('ortchange', $.proxy(this._eventHandler, this));
                this.on('commit', function(e, date){
                    var str = $.calendar.formatDate(date);

                    el[el.is('select, input')?'val':'text'](str);
                });
            },

            _eventHandler: function(e){
                if(e.type === 'ortchange') {
                    this._frame && this._frame.refresh();
                }else {
                    this._eventHandlerOrg( e );
                }
            },

            /**
             * @name show
             * @grammar show() ⇒ instance
             * @desc 显示组件
             */
            show: function(){
                var me = this,
                    el;

                if( this._visible ) {
                    return this;
                }

                el = this._container;

                this._visible = true;
                this.refresh();
                this._frame = SlideUp(el, function( confirm ){
                    var date;
                    if( confirm) {
                        date = me._option('selectedDate');
                        me.trigger('commit', [date, $.calendar.formatDate(date), me]);
                        me._option('date', date);
                    } else {
                        me._option('selectedDate', me._option('date'));
                    }
                    me.hide();
                    return false;
                });
                return this.trigger('show', this);
            },

            /**
             * @name hide
             * @grammar hide() ⇒ instance
             * @desc 隐藏组件
             */
            hide: function(){
                var me = this,
                    event;

                if (!this._visible) {
                    return this;
                }

                event = $.Event('beforehide');
                this.trigger(event, this);

                //如果外部阻止了此事件，则停止往下执行
                if(event.isDefaultPrevented()){
                    return this;
                }

                this._visible = false;

                this._frame.close(function(){
                    me.trigger && me.trigger('hide');
                });

                this._frame = null;

                return this;
            },

            /**
             * @name Trigger Events
             * @theme event
             * @desc 组件内部触发的事件
             *
             * ^ 名称 ^ 处理函数参数 ^ 描述 ^
             * | show | event, ui | 当组件显示后触发 |
             * | hide | event, ui | 当组件隐藏后触发 |
             * | beforehide | event, ui | 组件隐藏之前触发，可以通过e.preventDefault()来阻止 |
             * | commit | event, date, dateStr, ui | 但确认选择某个日期的时候触发 |
             */

            //解绑ortchange事件
            destroy: function () {
                $(window).off('ortchange', this._eventHandler);
                this._frame && this._frame.close();
                return this.destroyOrg();
            }
        };
    });

    function SlideUp(div, cb) {
        var
        //用来记录div的原始位置的
            holder = $('<span class="ui-holder"></span>'),

        //dom
            root = $('<div class="ui-slideup-wrap">' +
                '   <div class="ui-slideup">' +
                '       <div class="header">' +
                '           <span class="ok-btn">确认</span>' +
                '           <span class="no-btn">取消</span>' +
                '       </div>' +
                '       <div class="frame"></div>' +
                '   </div>' +
                '</div>'),
            sDiv = $('.ui-slideup', root),
            frame = $('.frame', sDiv),

        //对外只公开refresh和close方法
            obj = {

                /**
                 * 当屏幕旋转的时候时候需要外部调用
                 */
                refresh: function( callback ){
                    root.css({
                        top: window.pageYOffset + 'px',
                        height: window.innerHeight + 'px'
                    });

                    sDiv.animate({
                        translateY: '-' + sDiv.height() + 'px',
                        translateZ: '0'
                    }, 400, 'ease-out', function () {
                        callback && callback.call(obj);
                    });

                    return obj;
                },

                close: function( callback ){
                    var count = SlideUp.count = SlideUp.count - 1;

                    root.off('click.slideup' + id);

                    sDiv
                        .animate({
                            translateY: '0',
                            translateZ: '0'
                        }, 200, 'ease-out', function () {
                            callback && callback();

                            //还原div的位置
                            holder.replaceWith(div);

                            //销毁
                            root.remove();
                            count === 0 && $(document).off('touchmove.slideup');
                        })
                        .find('.ok-btn, .no-btn')
                        .highlight();

                    return obj;
                }
            },

        //为了解绑事件用的
            id = SlideUp.id = ( SlideUp.id >>> 0 ) + 1,

        //记录当前弹出了多少次
            count;

        frame.append( div.replaceWith( holder ) );

        count = SlideUp.count = ( SlideUp.count >>> 0 ) + 1;

        //弹出多个时，只会注册一次
        count === 1 && $(document).on('touchmove.slideup', function (e) {

            //禁用系统滚动
            e.preventDefault();
        });

        root
            .on('click.slideup' + id, '.ok-btn, .no-btn', function () {
                cb.call(obj, $(this).is('.ok-btn')) !== false && obj.close();
            })
            .appendTo(document.body)
            .find('.ok-btn, .no-btn')
            .highlight('ui-state-hover');

        obj.refresh();

        return obj;
    }

})(Zepto);

/*!Widget panel.js*/
/**
 * @file panel组件
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/panel/panel_position.html</qrcode>
 * 面板组件
 * @name Panel
 * @import core/touch.js, core/zepto.ui.js
 */
(function ($, undefined) {
    var cssPrefix = $.fx.cssPrefix,
        transitionEnd = $.fx.transitionEnd;
    /**
     * @name panel
     * @grammar $('.panel').panel() ⇒ self
     * --该组件不支持create模式，只有setup模式--
     * @desc **Options**
     * - ''contentWrap'' {Dom/Zepto/selector}: (可选，默认：true)主体内容dom
     * - ''scrollMode'' {String}: (可选，默认：follow)'follow |'hide' | 'fix'   Panel滑动方式，follow表示跟随页面滑动，hide表示页面滑动时panel消失, fix表示panel固定在页面中
     * - ''display'' {String}: (可选，默认：push)'overlay' | 'reveal' | 'push' Panel出现模式，overlay表示浮层reveal表示在content下边展示，push表示panel将content推出
     * - ''position'' {String}: (可选)left' | 'right' 在右边或左边
     * - ''dismissible'' {Boolean}: (render模式下必填)是否在内容区域点击后，panel消失
     * - ''swipeClose'' {Boolean}: (可选，默认: 300)在panel上滑动，panel是否关闭
     * - ''beforeopen'' {Function}: (可选，默认: \'auto\')panel打开前事件，该事件可以被阻止
     * - ''open'' {Function}: (可选，默认: \'auto\')panel打开后前事件
     * - ''beforeclose'' {Function}: (可选，默认: \'auto\')panel关闭前事件，该事件可以被阻止
     * - ''close'' {Function}: (可选，默认: \'auto\')panel关闭后事件
     * **example**
     * <code>//<div id="panel">这是panel</div><div id="content">这是panel</div>
     * $('#panel').panel({contentWrap: '#content'});
     * </code>
     *
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/panel/panel.html">
     * ../gmu/_examples/widget/panel/panel.html
     * </codepreview>
     */

    $.ui.define('panel', {
        _data: {
            contentWrap: '',       //若不传，则默认为panel的next节点
            scrollMode: 'follow',   //'follow |'hide' | 'fix'   Panel滑动方式，follow表示跟随页面滑动，hide表示页面滑动时panel消失, fix表示panel固定在页面中
            display: 'push',     //'overlay' | 'reveal' | 'push' Panel出现模式，overlay表示浮层reveal表示在content下边展示，push表示panel将content推出
            position: 'right',    //'left' | 'right' 在右边或左边
            dismissible: true,
            swipeClose: true,
            beforeopen: null,
            open: null,
            beforeclose: null,
            close: null
        },
        _create: function () {
            throw new Error('panel组件不支持create模式，请使用setup模式');
        },
        _setup: function () {
            var me = this,
                data = me._data,
                $el = me.root().addClass('ui-panel ui-panel-'+ data.position);

            me.panelWidth = $el.width() || 0;
            me.$contentWrap = $(data.contentWrap || $el.next());
            data.dismissible && ( me.$panelMask = $('<div class="ui-panel-dismiss"></div>').width(document.body.clientWidth - $el.width()).appendTo('body') || null);
        },
        _init: function () {
            var me = this,
                data = me._data;

            me.displayFn = me._setDisplay();
            me.$contentWrap.addClass('ui-panel-animate');
            me.root().on(transitionEnd, $.proxy(me._eventHandler, me)).hide();  //初始状态隐藏panel
            data.dismissible && me.$panelMask.hide().on('click', $.proxy(me._eventHandler, me));    //绑定mask上的关闭事件
            data.scrollMode !== 'follow' && $(document).on('scrollStop', $.proxy(me._eventHandler, me));
            $(window).on('ortchange', $.proxy(me._eventHandler, me));
        },
        /**
         * 生成display模式函数
         * */
        _setDisplay: function () {
            var me = this,
                $panel = me.root(),
                $contentWrap = me.$contentWrap,
                transform = cssPrefix + 'transform',
                posData = me._transDisplayToPos(),
                obj = {}, panelPos, contPos;

            $.each(['push', 'overlay', 'reveal'], function (i,display) {
                obj[display] = function (isOpen, pos, isClear) {   //isOpen:是打开还是关闭操作，pos:从右或从左打开关闭，isClear:是否是初始化操作
                    panelPos = posData[display].panel, contPos = posData[display].cont;
                    $panel.css(transform, 'translate3d(' + me._transDirectionToPos(pos, panelPos[isOpen]) + 'px,0,0)');
                    if (!isClear) {
                        $contentWrap.css(transform, 'translate3d(' + me._transDirectionToPos(pos, contPos[isOpen]) + 'px,0,0)');
                        me.maskTimer = $.later(function () {      //防止外界注册tap穿透，故做了延迟
                            me.$panelMask && me.$panelMask.css(pos, $panel.width()).toggle(isOpen);
                        }, 400);    //改变mask left/right值
                    }
                    return me;
                }
            });
            return obj;
        },
        /**
         * 初始化panel位置，每次打开之前由于位置可能不同，所以均需重置
         * */
        _initPanelPos: function (dis, pos) {
            this.displayFn[dis](0, pos, true);
            this.root().get(0).clientLeft;    //触发页面reflow，使得ui-panel-animate样式不生效
            return this;
        },
        /**
         * 将位置（左或右）转化为数值
         * */
        _transDirectionToPos: function (pos, val) {
            return pos === 'left' ? val : -val;
        },
        /**
         * 将打开模式（push,overlay,reveal）转化为数值
         * */
        _transDisplayToPos: function () {
            var me = this,
                panelWidth = me.panelWidth;
            return {
                push: {
                    panel: [-panelWidth, 0],    //[from, to] for panel
                    cont: [0, panelWidth]       //[from, to] for contentWrap
                },
                overlay: {
                    panel: [-panelWidth, 0],
                    cont: [0, 0]
                },
                reveal: {
                    panel: [0, 0],
                    cont: [0, panelWidth]
                }
            }
        },
        /**
         * 设置显示或关闭，关闭时的操作，包括模式、方向与需与打开时相同
         * */
        _setShow: function (isOpen, dis, pos) {
            var me = this,
                data = me._data,
                eventName = isOpen ? 'open' : 'close',
                beforeEvent = $.Event('before' + eventName),
                changed = isOpen !== me.state(),
                _eventBinder = isOpen ? 'on' : 'off',
                _eventHandler = isOpen ? $.proxy(me._eventHandler, me) : me._eventHandler,
                _dis = dis || data.display,
                _pos = pos || data.position;

            me.trigger(beforeEvent, [dis, pos]);
            if (beforeEvent.defaultPrevented) return me;
            if (changed) {
                me._dealState(isOpen, _dis, _pos);    //关闭或显示时，重置状态
                me.displayFn[_dis](me.isOpen = Number(isOpen), _pos);   //根据模式和打开方向，操作panel
                data.swipeClose && me.root()[_eventBinder]($.camelCase('swipe-' + _pos), _eventHandler);     //滑动panel关闭
                data.display = _dis, data.position = _pos;
            }
            return me;
        },
        /**
         * 打开或关闭前的状态重置操作，包括样式，位置等
         * */
        _dealState: function (isOpen, dis, pos) {
            var me = this,
                data = me._data,
                $panel = me.root(),
                $contentWrap = me.$contentWrap,
                addCls = 'ui-panel-' + dis + ' ui-panel-' + pos,
                removeCls = 'ui-panel-' + data.display + ' ui-panel-' + data.position + ' ui-panel-animate';

            if (isOpen) {
                $panel.removeClass(removeCls).addClass(addCls).show();
                data.scrollMode === 'fix' && $panel.css('top', $(window).scrollTop());    //fix模式下
                me._initPanelPos(dis, pos);      //panel及contentWrap位置初始化
                if (dis === 'reveal') {
                    $contentWrap.addClass('ui-panel-contentWrap').on(transitionEnd, $.proxy(me._eventHandler, me));    //reveal模式下panel不触发transitionEnd;
                } else {
                    $contentWrap.removeClass('ui-panel-contentWrap').off(transitionEnd, $.proxy(me._eventHandler, me));
                    $panel.addClass('ui-panel-animate');
                }
                me.$panelMask && me.$panelMask.css({     //panel mask状态初始化
                    'left': 'auto',
                    'right': 'auto',
                    'height': document.body.clientHeight
                });
            }
            return me;
        },

        _eventHandler: function (e) {
            var me = this,
                data = me._data,
                scrollMode = data.scrollMode,
                eventName = me.state() ? 'open' : 'close';

            switch (e.type) {
                case 'click':
                case 'swipeLeft':
                case 'swipeRight':
                    me.close();
                    break;
                case 'scrollStop':
                    scrollMode === 'fix' ? me.root().css('top', $(window).scrollTop()) : me.close();
                    break;
                case transitionEnd:
                    me.trigger(eventName, [data.display, data.position]);
                    break;
                case 'ortchange':   //增加转屏时对mask的处理
                    me.$panelMask && me.$panelMask.css('height', document.body.clientHeight);
                    scrollMode === 'fix' && me.root().css('top', $(window).scrollTop());     //转并重设top值
                    break;
            }
        },
        /**
         * @name open
         * @grammar open([display, [position]]) ⇒ self
         * @desc 打开panel, displan,position不传则为初始化时的方式
         * @example
         * $('#panel').panel('open', 'push', 'right');
         */
        open: function (display, position) {
            return this._setShow(true, display, position);
        },
        /**
         * @name close
         * @grammar close() ⇒ self
         * @desc 关闭panel, 只能按上次打开的模式及方向关闭panel
         * @example
         * $('#panel').panel('close');
         */
        close: function () {
            return this._setShow(false);
        },
        /**
         * @name toggle
         * @grammar toggle([display, [position]]) ⇒ self
         * @desc 关闭或打开panel
         * @example
         * $('#panel').panel('toggle','overlay', 'left');
         */
        toggle: function (display, position) {
            return this[this.isOpen ? 'close' : 'open'](display, position);
        },
        /**
         * @name state
         * @grammar state() ⇒ Boolean
         * @desc 获取当前panel状态，打开为true,关闭为false
         * @example
         * $('#panel').panel('state');
         */
        state: function () {
            return !!this.isOpen;
        },
        /**
         * @desc 销毁组件。
         * @name destroy
         * @grammar destroy()  ⇒ instance
         */
        destroy:function () {
            this.$panelMask && this.$panelMask.off().remove();
            this.maskTimer && clearTimeout(this.maskTimer);
            this.$contentWrap.removeClass('ui-panel-animate');
            $(document).off('scrollStop', this._eventHandler);
            $(window).off('ortchange', this._eventHandler);
            return this.$super('destroy');
        }
        /**
         * @name Trigger Events
         * @theme event
         * @desc 组件内部触发的事件
         *
         * ^ 名称 ^ 处理函数参数 ^ 描述 ^
         * | init | event | 组件初始化的时候触发 |
         * | beforeopen | event | panel打开前触发 |
         * | open | event | panel打开后触发 |
         * | beforeClose | event | panel关闭前触发，可以通过e.preventDefault()来阻止 |
         * | close | event | panel关闭后触发 |
         * | destroy | event | 组件在销毁的时候触发 |
         */
    });

})(Zepto);
/*!Widget dropmenu.js*/
/**
 * @file 下拉菜单组件
 * @name Dropmenu
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/dropmenu/dropmenu.html</qrcode>
 * 下拉菜单组件
 * @import core/zepto.ui.js, core/zepto.highlight.js
 * @importCSS icons.css
 */
(function ($, undefined) {
    var tpl = {
            arrow:'<span class="ui-dropmenu-arrow"></span>',
            items:'<ul class="ui-dropmenu-items">' +
                '<% for(var i=0, length = items.length; i<length; i++){ var item = items[i]; %>' +
                '<li class="<%=item.icon&&item.text?\'ui-icontext\':item.icon?\'ui-icononly\':\'ui-textonly\'%>"><a<% if(item.href){ %> href="<%=item.href%>"<% } %>>' +
                '<% if(item.icon){ %><span class="ui-icon ui-icon-<%=item.icon%>"></span><% } %>' +
                '<%=item.text%></a></li>' +
                '<% } %>' +
                '</ul>'
        },
        iconRE = /\bui\-icon\-(\w+)\b/ig,
        rootNodeRE = /^(?:body|html)$/i,
        zIndex = 100,
        defaultOffset = {
            up: {
                x:0,
                y:1
            },
            down: {
                x:0,
                y:-1
            }
        },
        defaultArrowPos = {
            left: {left:'25%', right:'auto'},
            center: {left:'50%', right:'auto'},
            right: {left:'75%', right:'auto'}
        };

    /**
     * @name $.ui.dropmenu
     * @grammar $.ui.dropmenu(options) ⇒ instance
     * @grammar dropmenu(options) ⇒ self
     * @desc **Options**
     * - ''btn'' {Zepto|Selector}: (可选) 设置dropmenu对应的按钮，当此按钮点击时会自动把此dropmenu显示。
     * - ''align'' {'left'|'center'|'right'|'center'}: (可选，默认：'auto')设置dropmenu是左对齐与按钮元素，还是居中对齐，右对齐，或自动对齐。
     *   自动对齐是自动选择一种最合适的对齐方式。算法是，先尝试居中对齐，如果下拉菜单出了可是区域，则尝试左对齐，再尝试右对齐。
     * - ''width'' {Number}: (可选)如果不传，宽度自适应与内容
     * - ''height'' {Number}: (可选)如果不传，高度自适应与内容
     * - ''offset'' {Object}: (可选)设置下拉菜单位置的偏移量，相对与自动算出来位置。格式：{x: -1, y: 5}
     * - ''pos'' {'up'|'down'|'auto'}: (可选，默认'down')设置下拉菜单是在按钮的下面显示还是上面显示。如果设置为'auto', 将自动设置，目的是尽量让下拉菜单不超出可视区域。
     * - ''direction'' {'vertical'|'horizontal'}: (可选, 默认'vertical')设置下拉菜单是垂直排列还是左右排列。
     * - ''arrow'' {Boolean}: (可选, 默认true) 是否显示箭头
     * - ''arrowPos'' {Object}: (可选) 控制箭头位置, Object中有两个参数，如下。
     *   - ''left''
     *   - ''right''
     *   默认如果align为center，{left:50%, right:auto}, 如果align为left,{left:25%, right:auto}, 如果align为right，{left:75%, right:auto}
     *   数值可以为数字，百分比，或者带单位的数字字符串。
     * - ''autoClose'' {Boolean}: (可选, 默认true) 当下拉菜单显示的时候，点击其他区域是否关闭菜单。
     * - ''items'' {Array}: (可选) 当为render模式时必填 设置下拉菜单的列表内容，格式为: \[{text:\'\', icon: \'\', click: fn, href:\'\'}, ...\]
     * - ''events'' 所有[Trigger Events](#dropmenu_triggerevents)中提及的事件都可以在此设置Hander, 如init: function(e){}。
     *
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/dropmenu/dropmenu.html">
     * ../gmu/_examples/widget/dropmenu/dropmenu.html
     * </codepreview>
     */
    $.ui.define('dropmenu', {
        _data:{
            btn: null,//按钮
            align:'center',//left, center, right, auto
            width:null,
            height:null,
            offset:null,
            pos: 'down',//up, down, auto.
            direction:'vertical', //vertical, horizontal
            arrow:true, //是否显示剪头
            arrowPos: null,
            autoClose:true, //点击其他地方自动关闭
            items:null, // 数组: {text:'', icon: '', click: '', href:''}
            itemClick: null,//event
            cacheParentOffset: true//是否把父级的位置缓存起来
        },

        _prepareDom:function (mode, data) {
            var me = this, content, $el = me._el, items;
            switch (mode) {
                case 'fullsetup':
                case 'setup':
                    data._arrow = me._findElement('.ui-dropmenu-arrow');
                    data._arrow || data.arrow && (data._arrow = $(tpl.arrow).prependTo($el));
                    data._items = me._el.find('ul').first();
                    if (data._items) {
                        items = [];
                        data._items.addClass('ui-dropmenu-items').children().each(function () {
                            var $li = $(this), a = $('a', this).first(), iconSpan = $('.ui-icon', this), item;
                            items.push(item = {
                                text:a.text(),
                                icon:iconSpan.length && iconSpan.attr('class').match(iconRE) && RegExp.$1
                            });
                            $li.addClass(item.icon && item.text ? 'ui-icontext' : item.icon ? 'ui-icononly' : 'ui-textonly');
                        });
                        data.items = items;
                    } else data._items = $($.parseTpl(tpl.items, {
                        items:data.items || []
                    })).appendTo($el);
                    break;
                default:
                    content = data.arrow ? tpl.arrow : '';
                    content += $.parseTpl(tpl.items, {
                        items:data.items || []
                    });
                    $el.append(content);
                    data._arrow = me._findElement('.ui-dropmenu-arrow');
                    data._items = me._findElement('.ui-dropmenu-items');
                    data.container = data.container || 'body';
            }
            data.container && $el.appendTo(data.container);
        },

        _findElement:function (selector) {
            var ret = this._el.find(selector);
            return ret.length ? ret : null;
        },

        _create:function () {
            var me = this, data = me._data;
            me._el = me._el || $('<div></div>');
            me._prepareDom('create', data);
        },

        _setup:function (mode) {
            var me = this, data = me._data;
            me._prepareDom(mode ? 'fullsetup' : 'setup', data);
        },

        _init:function () {
            var me = this, data = me._data, $el = me.root(), eventHandler = $.proxy(me._eventHandler, me);
            $el.addClass(me._prepareClassName()).css({
                width:data.width || '',
                height:data.height || ''
            });
            $('.ui-dropmenu-items li a', $el).highlight('ui-state-hover');
            $el.on('click', eventHandler).highlight();
            $(window).on('ortchange', eventHandler);
            data.btn && me.bindButton($.ui.isWidget(data.btn) ? data.btn.root(): data.btn);
        },

        _prepareClassName:function () {
            var data = this._data, className = 'ui-dropmenu';
            data.direction == 'horizontal' && (className += ' ui-horizontal');
            return className;
        },

        /**
         * @name bindButton
         * @grammar bindButton(el) ⇒ instance
         * @desc 用来绑定按钮
         * @notice 下拉菜单在显示前，需要绑定对应的按钮，否则下拉菜单不知道该显示在什么位置。
         * @desc 这不是唯一的绑定途径，在实例化时可以给btn option，设置值，或者在show方法中传入值。
         */
        bindButton:function (btn) {
            var me = this, data = me._data;
            data._btn && data._btn.off('click.dropmenu');
            data._btn = $(btn).on('click', $.proxy(me._eventHandler, me));
            return me;
        },

        _getParentOffset:function () {
            var elem = this._el,
                offsetParent = elem.offsetParent(),
                parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top:0, left:0 } : offsetParent.offset();
            // 添加边框
            parentOffset.top += parseFloat($(offsetParent[0]).css('border-top-width')) || 0;
            parentOffset.left += parseFloat($(offsetParent[0]).css('border-left-width')) || 0;
            return parentOffset;
        },

        _isInRange: function(s1, l1, s2, l2){
            return !(s1 < s2 || s1+l1>s2+l2)
        },

        __caculate: function(type, position, boxWidth, boxHeight){
            switch(type){
                case 'up':
                    return position.top - boxHeight;
                case 'down':
                    return position.top + position.height;
                case 'left':
                    return position.left;
                case 'center':
                    return position.left + position.width / 2 - boxWidth / 2;
                default: //right
                    return position.left + position.width - boxWidth;
            }
        },

        _caculate:function (target) {
            var top, left, data = this._data, offset, pos, align, $el, position, boxWidth, boxHeight,
                winStart, winLength,
                parentOffset = data._parentOffset;

            !data._btn ? (data._btn = $(target)) : data._btn.add(target);
            if (!data._btn.length) {
                throw new Error('调用dropmenu->show错误，需要指定一个Element与之关联!');
            }

            position = data._btn.offset();
            boxWidth = ($el = this._el).width();
            boxHeight = $el.height();
            pos = data.pos;
            align = data.align;

            if(pos == 'auto') {
                winStart = window.pageYOffset;
                winLength = window.innerHeight;
                top = this.__caculate(pos = 'down', position, boxWidth, boxHeight);
                if(!this._isInRange(top, boxHeight, winStart, winLength)){
                    top = this.__caculate(pos = 'up', position, boxWidth, boxHeight);
                    this._isInRange(top, boxHeight, winStart, winLength) || (top = this.__caculate(pos = 'down', position, boxWidth, boxHeight));
                }
            } else top = this.__caculate(data.pos, position, boxWidth, boxHeight);

            if(align == 'auto'){
                winStart = 0;//window.pageXOffset;
                winLength = window.innerWidth;
                left = this.__caculate(align = 'center', position, boxWidth, boxHeight);
                if(!this._isInRange(left, boxWidth, winStart, winLength)){
                    left = this.__caculate(align = 'left', position, boxWidth, boxHeight);
                    this._isInRange(left, boxWidth, winStart, winLength) || (left = this.__caculate(align = 'right', position, boxWidth, boxHeight));
                }
            } else left = this.__caculate(data.align, position, boxWidth, boxHeight);

            $el[pos=='up'?'addClass':'removeClass']('ui-dropmenu-pos-up')
                .removeClass('ui-alignleft ui-aligncenter ui-alignright')
                .addClass(align == 'left' ? 'ui-alignleft' : align == 'right' ? 'ui-alignright' : 'ui-aligncenter');

            offset = data.offset || defaultOffset[pos=='up'?'up':'down'];

            data._arrow && data._arrow.css(data.arrowPos || defaultArrowPos[align]);

            return {
                top:top + offset.y - parentOffset.top,
                left:left + offset.x - parentOffset.left
            };
        },

        /**
         * @name show
         * @grammar show() ⇒ instance
         * @grammar show(el) ⇒ instance
         * @desc 显示下拉菜单, 如果在调用此方法之前没有绑定按钮，在此需要作为第一个参数传入，否则组件将抛出异常。
         *
         * 一个下拉菜单可以绑定多个按钮显示，如果绑定的按钮时一个集合，在这需要指定显示在哪个按钮下面，否则将显示在集合的第一个按钮下面。
         * @example
         * //<a class="button">按钮1</a>
         * //<a class="button">按钮2</a>
         * //<div class="dropemenu"><ul><li>xxx</li>...</ul></div>
         * $('a.buttton').click(function(){
         *     $('.dropmenu').dropmenu('show', this);
         * });
         */
        show:function (target) {
            var me = this, data = this._data;
            data._parentOffset = data.cacheParentOffset ? data._parentOffset || this._getParentOffset() : this._getParentOffset();//获得父级的position:relative元素的offset
            data.autoClose && $(document).on('click.'+this.id(), function(e){
                me._isFromSelf(e.target) || me.hide();
            });
            this._el.css(this._caculate(data._actBtn = target || data._actBtn)).css('zIndex', zIndex++);//bugfix: FEBASE-542
            data._isShow = true;
            return this;
        },

        _eventHandler:function (e) {
            var me = this, match, data = this._data, el, itemData, eventData, _prevented, li;
            switch (e.type) {
                case 'ortchange':
                    data._parentOffset = this._getParentOffset();//TRACE FEBASE-658 转屏后，parentOffset不对了，要重新计算一次。
                    data._isShow && me._el.css(me._caculate(data._actBtn));
                    break;
                default:
                    el = me._el.get(0);
                    if((match = $(e.target).closest('.ui-dropmenu-items li', el)) && match.length){
                        eventData = $.Event('itemClick');
                        itemData = data.items[match.index()];//获取data.items中对应的item.
                        _prevented = itemData && itemData.click && itemData.click.apply(me, [eventData, itemData, match[0]]) === false;//如果item中有click则先调用item.click
                        (_prevented = _prevented || eventData.defaultPrevented ) || me.trigger(eventData, [itemData, match[0]]);//如果item.click返回的是false,或者在里面调用了e.preventDefault(). itemClick事件就不派送了。
                        (_prevented || eventData.defaultPrevented ) && e.preventDefault();//如果itemClick中的事件有被阻止就把本来的click给阻止掉，这样a连接就不会跳转了。
                    } else me.toggle();
            }
        },

        _isFromSelf:function (target) {
            var ret = false, data = this._data;
            $.each(this._el.add(data._btn), function () {
                if (this == target || $.contains(this, target)) {
                    ret = true;
                    return false;
                }
            });
            return ret;
        },

        /**
         * @name hide
         * @grammar hide() ⇒ instance
         * @desc 隐藏下拉菜单
         */
        hide:function () {
            var data = this._data;
            data._isShow && this.root().css('top', '-99999px');
            data.autoClose && $(document).off('click.'+this.id());
            data._isShow = false;
            return this;
        },

        /**
         * @name toggle
         * @grammar toggle() ⇒ instance
         * @desc 切换显示与隐藏
         */
        toggle: function(){
            return this[this._data._isShow?'hide':'show'].apply(this, arguments);
        },

        /**
         * @desc 销毁组件。
         * @name destroy
         * @grammar destroy()  ⇒ instance
         */
        destroy:function () {
            var data = this._data, eventHandler = this._eventHandler;
            data._btn && data._btn.off('click', eventHandler);
            $('.ui-dropmenu-items li a', this._el).highlight();
            data.autoClose && $(document).off('click.'+this.id());
            $(window).off('ortchange', eventHandler);
            return this.$super('destroy');
        }

        /**
         * @name Trigger Events
         * @theme event
         * @desc 组件内部触发的事件
         *
         * ^ 名称 ^ 处理函数参数 ^ 描述 ^
         * | init | event | 组件初始化的时候触发，不管是render模式还是setup模式都会触发 |
         * | itemClick | event, item(object包含icon, text, href信息) | 当某个菜单项被点击时触发 |
         * | destroy | event | 组件在销毁的时候触发 |
         */
    });

})(Zepto);
/*!Widget dropmenu.iscroll.js*/
/**
 * @file Dropmenu － 内滚插件
 * @name Dropmenu － 内滚插件
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/dropmenu/dropmenu_iscroll.html</qrcode>
 * @short Dropmenu.iscroll
 * @import widget/dropmenu.js, core/zepto.iscroll.js
 */
(function($, undefined){
    $.ui.dropmenu.register(function(){
        return {
            pluginName: 'iscroll',
            show: function(){
                var data = this._data;
                data.iScroll && window.iScroll && this._initiScroll();
                this.show = this.showOrg;
                return this.show.apply(this, arguments);
            },
            _initiScroll:function () {
                var data = this._data;
                data._items.wrap('<div class="iscroll-wrap"></div>');
                data._iWrap = $('.iscroll-wrap', this._el);
                data._iScroll = new iScroll(data._iWrap.get(0), $.extend({
                    hScroll: data.direction == 'horizontal',
                    vScroll: data.direction != 'horizontal'
                }, $.isObject(data.iScroll)?data.iScroll:{}));
                this._el.addClass('has-iScroll');
            }
        }
    });
    /**
     * @name dropmenu.iscroll
     * @desc 此插件使dropmenu带有内滚功能。
     *
     * 在初始化时需要传入iScroll参数才能启用此功能，如传入true，也可以传入对象，此对象在初始化 iScroll的时候可以将传入
     *
     * <code>
     * $('#dromenu').dropmenu({
     *     iScroll: {
     *         useTransform: false,
     *         //... 所有有效的iscroll选项都可以
     *     }
     * });
     * </code>
     *
     * @notice 需要带内滚功能时，需要同时设置width或者height，否则width和height将自适应与内容宽高，这样的话不具备滚动条件。
     *
     * @desc
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/dropmenu/dropmenu_iscroll.html">
     * ../gmu/_examples/widget/dropmenu/dropmenu_iscroll.html
     * </codepreview>
     */
})(Zepto);
/*!Widget tabs.js*/
/**
 * @file 选项卡组件
 * @desc 选项卡组件
 * @name Tabs
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/tabs/tabs.html</qrcode>
 * @import core/touch.js, core/zepto.ui.js,core/zepto.highlight.js
 * @importCSS transitions.css, loading.css
 */
(function ($, undefined) {
    var _uid = 1,
        uid = function(){
            return _uid++;
        },
        tpl = {
            nav:'<ul class="ui-tabs-nav">'+
                '<% var item; for(var i=0, length=items.length; i<length; i++) { item=items[i]; %>'+
                '<li<% if(i==active){ %> class="ui-state-active"<% } %>><a href="javascript:;"><%=item.title%></a></li>'+
                '<% } %></ul>',
            content:'<div class="ui-viewport ui-tabs-content">' +
                '<% var item; for(var i=0, length=items.length; i<length; i++) { item=items[i]; %>'+
                '<div<% if(item.id){ %> id="<%=item.id%>"<% } %> class="ui-panel ui-tabs-panel <%=transition%><% if(i==active){ %> ui-state-active<% } %>"><%=item.content%></div>'+
                '<% } %></div>'
        },
        idRE = /^#(.+)$/;

    /**
     * @name $.ui.tabs
     * @grammar $.ui.tabs(options) ⇒ instance
     * @grammar tabs(options) ⇒ self
     * @desc **Options**
     * - ''active'' {Number}: (可选，默认：0) 初始时哪个为选中状态，如果时setup模式，如果第2个li上加了ui-state-active样式时，active值为1
     * - ''items'' {Array}: 在render模式下需要必须设置 格式为\[{title:\'\', content:\'\', href:\'\'}\], href可以不设，可以用来设置ajax内容。
     * - ''transition'' {\'\'|\'slide\'}: 设置切换动画
     * - ''events'' 所有[Trigger Events](#tabs_triggerevents)中提及的事件都可以在此设置Hander, 如init: function(e){}。
     *
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/tabs/tabs.html">
     * ../gmu/_examples/widget/tabs/tabs.html
     * </codepreview>
     */
    $.ui.define('tabs', {
        _data:{
            active: 0,
            items:null,//[{title:'', content:'', href: ''}] href可以用来设置连接，表示为ajax内容, 需要引入tabs.ajax插件
            transition: 'slide',//目前只支持slide动画，或无动画
            activate: null,// events
            beforeActivate: null, //event
            animateComplete: null//如果用了transtion，这个事件将在动画执行完成后触发.
        },

        _prepareDom:function (mode, data) {
            var me = this, content, $el = me._el, items, nav, contents, id;
            switch (mode) {
                case 'fullsetup':
                case 'setup':
                    data._nav =  me._findElement('ul').first();
                    if(data._nav) {
                        data._content = me._findElement('div.ui-tabs-content');
                        data._content = ((data._content && data._content.first()) || $('<div></div>').appendTo($el)).addClass('ui-viewport ui-tabs-content');
                        items = [];
                        data._nav.addClass('ui-tabs-nav').children().each(function(){
                            var $a = me._findElement('a', this), href = $a?$a.attr('href'):$(this).attr('data-url'), id, $content;
                            id = idRE.test(href)? RegExp.$1: 'tabs_'+uid();
                            ($content = me._findElement('#'+id) || $('<div id="'+id+'"></div>'))
                                .addClass('ui-panel ui-tabs-panel'+(data.transition?' '+data.transition:''))
                                .appendTo(data._content);
                            items.push({
                                id: id,
                                href: href,
                                title: $a?$a.attr('href', 'javascript:;').text():$(this).text(),//如果href不删除的话，地址栏会出现，然后一会又消失。
                                content: $content
                            });
                        });
                        data.items = items;
                        data.active = Math.max(0, Math.min(items.length-1, data.active || $('.ui-state-active', data._nav).index()||0));
                        me._getPanel().add(data._nav.children().eq(data.active)).addClass('ui-state-active');
                        break;
                    } //if cannot find the ul, switch this to create mode. Doing this by remove the break centence.
                default:
                    items = data.items = data.items || [];
                    nav = [];
                    contents = [];
                    data.active = Math.max(0, Math.min(items.length-1, data.active));
                    $.each(items, function(key, val){
                        id = 'tabs_'+uid();
                        nav.push({
                            href: val.href || '#'+id,
                            title: val.title
                        });
                        contents.push({
                            content: val.content || '',
                            id: id
                        });
                        items[key].id = id;
                    });
                    data._nav = $($.parseTpl(tpl.nav, {items: nav, active: data.active})).prependTo($el);
                    data._content = $($.parseTpl(tpl.content, {items: contents, active: data.active, transition: data.transition})).appendTo($el);
                    data.container = data.container || ($el.parent().length ? null : 'body');
            }
            data.container && $el.appendTo(data.container);
            me._fitToContent(me._getPanel());
        },

        _getPanel: function(index){
            var data = this._data;
            return $('#'+data.items[index===undefined?data.active:index].id);
        },

        _findElement:function (selector, el) {
            var ret = $(el || this._el).find(selector);
            return ret.length ? ret : null;
        },

        _create:function () {
            var me = this, data = me._data;
            me._el = me._el || $('<div></div>');
            me._prepareDom('create', data);
        },

        _setup:function (mode) {
            var me = this, data = me._data;
            me._prepareDom(mode ? 'fullsetup' : 'setup', data);
        },

        _init:function () {
            var me = this, data = me._data, $el = me.root(), eventHandler = $.proxy(me._eventHandler, me);
            $el.addClass('ui-tabs');
            data._nav.on('tap', eventHandler).children().highlight('ui-state-hover');
            $(window).on('ortchange', eventHandler);
        },

        _eventHandler:function (e) {
            var match, data = this._data;
            switch(e.type) {
                case 'ortchange':
                    this.refresh();
                    break;
                default:
                    if((match = $(e.target).closest('li', data._nav.get(0))) && match.length) {
                        e.preventDefault();
                        this.switchTo(match.index());
                    }
            }
        },

        _fitToContent: function(div) {
            var data = this._data, $content = data._content;
            data._plus === undefined && (data._plus = parseFloat($content.css('border-top-width'))+parseFloat($content.css('border-bottom-width')))
            $content.height( div.height() + data._plus);
            return this;
        },

        /**
         * @name switchTo
         * @grammar switchTo(index)  ⇒ instance
         * @desc 切换到tab。
         */
        switchTo: function(index) {
            var me = this, data = me._data, items = data.items, eventData, to, from, reverse, endEvent;
            if(!data._buzy && data.active != (index = Math.max(0, Math.min(items.length-1, index)))) {
                to = $.extend({}, items[index]);//copy it.
                to.div = me._getPanel(index);
                to.index = index;

                from = $.extend({}, items[data.active]);//copy it.
                from.div = me._getPanel();
                from.index = data.active;

                eventData = $.Event('beforeActivate');
                me.trigger(eventData, [to, from]);
                if(eventData.defaultPrevented) return me;

                data._content.children().removeClass('ui-state-active');
                to.div.addClass('ui-state-active');
                data._nav.children().removeClass('ui-state-active').eq(to.index).addClass('ui-state-active');
                if(data.transition) { //use transition
                    data._buzy = true;
                    endEvent = $.fx.animationEnd + '.tabs';
                    reverse = index>data.active?'':' reverse';
                    data._content.addClass('ui-viewport-transitioning');
                    from.div.addClass('out'+reverse);
                    to.div.addClass('in'+reverse).on(endEvent, function(e){
                        if (e.target != e.currentTarget) return //如果是冒泡上来的，则不操作
                        to.div.off(endEvent, arguments.callee);//解除绑定
                        data._buzy = false;
                        from.div.removeClass('out reverse');
                        to.div.removeClass('in reverse');
                        data._content.removeClass('ui-viewport-transitioning');
                        me.trigger('animateComplete', [to, from]);
                        me._fitToContent(to.div);
                    });
                }
                data.active = index;
                me.trigger('activate', [to, from]);
                data.transition ||  me._fitToContent(to.div);
            }
            return me;
        },

        /**
         * @name refresh
         * @grammar refresh() => instance
         * @desc 当外部修改tabs内容好，需要调用refresh让tabs自动更新高度。
         * @return instance
         */
        refresh: function(){
            return this._fitToContent(this._getPanel());
        },

        /**
         * @desc 销毁组件。
         * @name destroy
         * @grammar destroy()  ⇒ instance
         */
        destroy:function () {
            var data = this._data, eventHandler = this._eventHandler;
            data._nav.off('tap', eventHandler).children().highlight();
            data.swipe && data._content.off('swipeLeft swipeRight', eventHandler);
            return this.$super('destroy');
        }

        /**
         * @name Trigger Events
         * @theme event
         * @desc 组件内部触发的事件
         *
         * ^ 名称 ^ 处理函数参数 ^ 描述 ^
         * | init | event | 组件初始化的时候触发，不管是render模式还是setup模式都会触发 |
         * | activate | event, to, from | 内容切换后触发, to和from为Object, 成员有: div(内容div), index(位置), title(标题), content(内容),href(链接) |
         * | beforeActivate | event, to, from | 内容切换之前触发，可以通过e.preventDefault()来阻止 |
         * | animateComplete | event, to, from | 动画完成后执行，如果没有设置动画，此时间不会触发 |
         * | destroy | event | 组件在销毁的时候触发 |
         */
    });
})(Zepto);
/*!Widget tabs.ajax.js*/
/**
 * @file Tabs - ajax插件
 * @name Tabs - ajax插件
 * @short Tabs.ajax
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/tabs/tabs_ajax.html</qrcode>
 * tabs插件, 有了此插件,tabs支持ajax功能
 *
 * 在a上面href设置的是地址，而不是id，则组件认为这个为ajax类型的。
 * 在options上传入ajax对象可以配置[ajax选项](#$.ajax)。如
 * <code>
 * $('#tabs').tabs({ajax: {
 *     dataType: 'json'
 *     //....
 * }});
 * </code>
 *
 * **Demo**
 * <codepreview href="../gmu/_examples/widget/tabs/tabs_ajax.html">
 * ../gmu/_examples/widget/tabs/tabs_ajax.html
 * ../gmu/_examples/widget/tabs/tabs_json.html
 * </codepreview>
 *
 * @import widget/tabs.js
 */
(function ($, undefined) {
    var idRE = /^#.+$/,
        loaded = {},
        tpl = {
            loading: '<div class="ui-loading">Loading</div>',
            error: '<p class="ui-load-error">内容加载失败!</p>'
        };

    $.ui.tabs.register(function () {
        return {
            _init:function () {
                var data = this._data, items = data.items, i, length;
                this._initOrg();
                for (i = 0, length = items.length; i < length; i++) {
                    items[i].href && !idRE.test(items[i].href) && (items[i].isAjax = true);
                }
                this.on('activate', this._onActivate);
                items[data.active].isAjax && this.load(data.active);//如果当前是ajax
            },

            destroy:function () {
                this.off('activate', this._onActivate);
                this.xhr && this.xhr.abort();
                return this.destroyOrg();
            },

            _fitToContent: function(div) {
                var data = this._data;
                if(!data._fitLock)return this._fitToContentOrg(div);
            },

            _onActivate:function (e, to) {
                to.isAjax && this.load(to.index);
            },


            /**
             * @name load
             * @grammar load(index[, force])  ⇒ instance
             * @desc 加载内容，指定的tab必须是ajax类型。加载的内容会缓存起来，如果要强行再次加载，第二个参数传入true
             */
            load:function (index, force) {
                var me = this, data = me._data, items = data.items, item, $panel, prevXHR;
                if (index < 0 ||
                    index > items.length - 1 ||
                    !(item = items[index]) || //如果范围错误
                    !item.isAjax || //如果不是ajax类型的
                    ( ( $panel = me._getPanel(index)).text() && !force && loaded[index] ) //如果没有加载过，并且tab内容为空
                    )return this;

                (prevXHR = me.xhr) && $.later(function(){//把切出去没有加载玩的xhr abort了
                    prevXHR.abort();
                }, 400);

                data._loadingTimer = $.later(function () {//如果加载在50ms内完成了，就没必要再去显示 loading了
                    $panel.html(tpl.loading);
                }, 50);

                data._fitLock = true;

                me.xhr = $.ajax($.extend(data.ajax || {}, {
                    url:item.href,
                    context:me._el.get(0),
                    beforeSend:function (xhr, settings) {
                        var eventData = $.Event('beforeLoad');
                        me.trigger(eventData, [xhr, settings]);
                        if (eventData.defaultPrevented)return false;
                    },
                    success:function (response, xhr) {
                        var eventData = $.Event('beforeRender');
                        clearTimeout(data._loadingTimer);//清除显示loading的计时器
                        me.trigger(eventData, [response, $panel, index, xhr])//外部可以修改data，或者直接把pannel修改了
                        if (!eventData.defaultPrevented) {
                            $panel.html(response);
                        }
                        data._fitLock = false;
                        loaded[index] = true;
                        me.trigger('load', $panel);
                        delete me.xhr;
                        me._fitToContent($panel);
                    },
                    error:function () {
                        var eventData = $.Event('loadError');
                        clearTimeout(data._loadingTimer);//清除显示loading的计时器
                        loaded[index] = false;
                        me.trigger(eventData, $panel);
                        if(!eventData.defaultPrevented){
                            $panel.html(tpl.error);
                        }
                        delete me.xhr;
                    }
                }));
            }
            /**
             * @name Trigger Events
             * @theme event
             * @desc 组件内部触发的事件
             *
             * ^ 名称 ^ 处理函数参数 ^ 描述 ^
             * | beforeLoad | event, xhr, settings | 在请求前触发，可以通过e.preventDefault()来取消此次ajax请求。 |
             * | beforeRender | event, response, panel, index, xhr | ajax请求进来数据，在render到div上之前触发，对于json数据，可以通过此方来自行写render，然后通过e.preventDefault()来阻止，将response输出在div上。 |
             * | load | event, panel | 当ajax请求到的内容过来后，平已经Render到div上了后触发 |
             * | loadError | event, panel | 当ajax请求内容失败时触发，如果此事件被preventDefault了，则不会把自带的错误信息Render到div上 |
             */
        }
    });
})(Zepto);

/*!Widget tabs.swipe.js*/
/**
 * @file Tabs - 左右滑动手势插件
 * @name Tabs - 左右滑动手势插件
 * @short Tabs.swipe
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/tabs/tabs.html</qrcode>
 * @import widget/tabs.js
 */
(function ($, undefined) {
    var durationThreshold = 1000, // 时间大于1s就不算。
        horizontalDistanceThreshold = 30, // x方向必须大于30
        verticalDistanceThreshold = 70, // y方向上只要大于70就不算
        scrollSupressionThreshold = 30, //如果x方向移动大于这个直就禁掉滚动
        tabs = [],
        eventBinded = false,
        isFromTabs = function (target) {
            for (var i = tabs.length; i--;) {
                if ($.contains(tabs[i], target)) return true;
            }
            return false;
        }

    function tabsSwipeEvents() {
        $(document).on('touchstart.tabs', function (e) {
            var point = e.touches ? e.touches[0] : e, start, stop;

            start = {
                x:point.clientX,
                y:point.clientY,
                time:Date.now(),
                el:$(e.target)
            }

            $(document).on('touchmove.tabs',function (e) {
                var point = e.touches ? e.touches[0] : e, xDelta;
                if (!start)return;
                stop = {
                    x:point.clientX,
                    y:point.clientY,
                    time:Date.now()
                }
                if ((xDelta = Math.abs(start.x - stop.x)) > scrollSupressionThreshold ||
                    xDelta > Math.abs(start.y - stop.y)) {
                    isFromTabs(e.target) && e.preventDefault();
                } else {//如果系统滚动开始了，就不触发swipe事件
                    $(document).off('touchmove.tabs touchend.tabs');
                }
            }).one('touchend.tabs', function () {
                    $(document).off('touchmove.tabs');
                    if (start && stop) {
                        if (stop.time - start.time < durationThreshold &&
                            Math.abs(start.x - stop.x) > horizontalDistanceThreshold &&
                            Math.abs(start.y - stop.y) < verticalDistanceThreshold) {
                            start.el.trigger(start.x > stop.x ? "tabsSwipeLeft" : "tabsSwipeRight");
                        }
                    }
                    start = stop = undefined;
                });
        });
    }

    /**
     * @name tabs
     * @desc
     * **在Tabs基础上新增的Options**
     * @desc tabs插件, 添加 swipe功能，zepto的swipeLeft, swipeRight不太准，所以在这另外实现了一套。
     */
    $.ui.tabs.register(function () {
        return {
            name:'swipe',
            _init:function () {
                var data = this._data;
                this._initOrg();
                tabs.push(data._content.get(0));
                eventBinded =  eventBinded || (tabsSwipeEvents(), true);
                this._el.on('tabsSwipeLeft tabsSwipeRight', $.proxy(this._eventHandler, this));
            },
            _eventHandler:function (e) {
                var data = this._data, items, index;
                switch (e.type) {
                    case 'tabsSwipeLeft':
                    case 'tabsSwipeRight':
                        items = data.items;
                        if (e.type == 'tabsSwipeLeft' && data.active < items.length - 1) {
                            index = data.active + 1;
                        } else if (e.type == 'tabsSwipeRight' && data.active > 0) {
                            index = data.active - 1;
                        }
                        index !== undefined && (e.stopPropagation(), this.switchTo(index));
                        break;
                    default://tap
                        return this._eventHandlerOrg(e);
                }
            },
            destroy: function(){
                var data = this._data, idx;
                ~(idx = $.inArray(data._content.get(0), tabs)) && tabs.splice(idx, 1);
                this._el.off('tabsSwipeLeft tabsSwipeRight', this._eventHandler);
                tabs.length || ($(document).off('touchstart.tabs'), eventBinded = false);
                return this.destroyOrg();
            }
        }
    });
})(Zepto);
/*!Widget navigator.js*/

/**
 * @file 导航栏组件
 * @name Navigator
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/webapp/navigator/tab.html</qrcode>
 * 导航栏组件
 * @import core/zepto.ui.js
 */

(function ($, undefined) {
    /**
     * @name navigator
     * @grammar navigator(options)  ⇒ self
     * @grammar $.ui.navigator([el [,options]])  ⇒ self
     * @desc
     * **Options**
     * - ''container''       {Selector|Zepto}:    (可选)父容器，渲染的元素，默认值：document.body
     * - ''content''         {Array}:             (必选)导航tab项的内容，支持fix的元素(设置pos)及自定义属性(设置attr){text:\'\',url:\'\',pos:\'\',attr:{a:\'\',b:\'\'}}
     * - ''defTab''          {Number}:            (可选, 默认:0)默认选中的导航tab项的索引，若为默认选中固定tab，则索引值在原来tabs.length上加1，默认值：0
     * - ''beforetabselect'' {Function}:          (可选)tab选中前的事件，可阻止tab选中
     * - ''tabselect''       {Function}:          (可选)tab选中时的事件
     *
     * **setup方式html规则**
     * <code type="html">
     * <div>
     *     <ul>
     *         <li><a href="#test1">首页</a></li>
     *         <li><a href="javascript:;">电影</a></li>
     *         <li><a class="cur" href="javascript:;">电视剧</a></li>
     *     </ul>
     * </div>
     * </code>
     * **full setup方式html规则**
     * <code type="html">
     * <div class="ui-navigator">     <!--需将所有的class都写全，在网速较慢时先展示-->
     *     <ul class="ui-navigator-list">
     *         <li><a href="#test1">首页</a></li>
     *         <li><a href="javascript:;">电影</a></li>
     *         <li><a class="cur" href="javascript:;">电视剧</a></li>
     *     </ul>
     * </div>
     * </code>
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/navigator/tab.html">
     * ../gmu/_examples/widget/navigator/tab.html
     * </codepreview>
     */
    var tmpl = '<% for (var i=0, len=left.length; i<len; i++) { %>'
        + '<a href="<%=left[i].url%>" class="ui-navigator-fix ui-navigator-fixleft"><%=left[i].text%></a>'
        + '<% } %>'
        + '<ul class="ui-navigator-list">'
        + '<% for (var i=0, len=mid.length; i<len; i++) { %>'
        + '<li><a href="<%=mid[i].url%>"><%=mid[i].text%></a></li>'
        + '<% } %></ul>'
        + '<% for (var i=0, len=right.length; i<len; i++) { %>'
        + '<a href="<%=right[i].url%>" class="ui-navigator-fix ui-navigator-fixright"><%=right[i].text%></a>'
        + '<% } %>';

    $.ui.define("navigator", {
        _data: {
            container: "",
            content: [],
            defTab: 0,
            beforetabselect: null,
            tabselect: null
        },
        _create: function () {
            var me = this,
                data = me._data,
                $el = me.root(),
                container = $(data.container || document.body).get(0),
                tabObj = {left: [],mid: [],right: []},html;

            $.each(data.content, function () {      //组合数据
                tabObj[this.pos ? this.pos : 'mid'].push(this);
            });

            html = $.parseTpl(tmpl, tabObj)       //解析数据模板
            if ($el) {
                $el.append(html);
                (!$el.parent().length || container !== document.body) && $el.appendTo(container);
            } else {
                me.root($("<div></div>").append(html)).appendTo(container);
            }
        },
        _setup: function (fullMode) {
            var me = this,
                data = me._data,
                defTab = data.defTab,
                $el = me.root();
            if (!fullMode) {
                $el.children('a').addClass('ui-navigator-fix');     //smart模式针对内容添加样式
                $el.children('ul').addClass('ui-navigator-list');
            }
            $el.find('a').each(function (i) {
                defTab === 0 ? $(this).hasClass('cur') && (data.defTab = i) : $(this).removeClass('cur');    //处理同时defTab和写cur class的情况
            });
        },
        _init: function () {
            var me = this,
                data = me._data,
                $el = me.root(),
                content = data.content,
                $tabList = $el.find('a');    //包括fix的tab和可滑动的tab

            $tabList.each(function (i) {
                this.index = i;
                content.length && content[i].attr && $(this).attr(content[i].attr);     //添加自己定义属性
            });
            data._$tabList = $tabList;
            data._lastIndex = -1;

            $el.addClass('ui-navigator').on('click', $.proxy(me._switchTabHandler, me));
            me.switchTo(data.defTab, true);    //设置默认选中的tab
        },
        _switchTabHandler: function (e) {
            var me = this,
                target = e.target;

            $(target).closest('a').get(0) && me.switchTo(target.index, false, e);
            return me;
        },
        /**
         * @name switchTo
         * @desc 切换到某个tab
         * @grammar switchTo()  ⇒ self
         * @example
         * $('#nav').navigator('switchTo', 1);      //setup模式
         * var nav = $.ui.navigator(opts);      //render模式
         * nav.switchTo(1);
         */
        switchTo: function (index, isDef, e) {
            var me = this,
                data = me._data,
                lastIndex = data._lastIndex,
                $tabList = data._$tabList,
                beforeSelectEvent = $.Event('beforetabselect');

            me.trigger(beforeSelectEvent, [$tabList[index]]);
            if (beforeSelectEvent.defaultPrevented) {     //阻止默认事件
                e && e.preventDefault();     //若是程序调switchTo，则直接return，若点击调用则preventDefault
                return me;
            };

            //点击同一个tab，若是程序调switchTo，则直接return，若点击调用则preventDefault
            if (lastIndex == index) {
                e && e.preventDefault();
                return me;
            }          //当选中的是同一个tab时，直接返回
            lastIndex >= 0 && $tabList.eq(lastIndex).removeClass("cur");      //修改样式放在跳转后边
            $tabList.eq(index).addClass("cur");
            data._lastIndex = index;

            return me.trigger('tabselect', [$tabList.get(index), index]);
        },
        /**
         * @name getCurTab
         * @desc 切换到某个tab
         * @grammar getCurTab()  ⇒ tab obj
         * @example
         * $('#nav').navigator('getCurTab');      //setup模式
         * var nav = $.ui.navigator(opts);      //render模式
         * nav.getCurTab();     //返回当前tab信息，包括index和当前tab elem
         */
        getCurTab: function () {
            var me = this,
                data = me._data,
                lastIndex = data._lastIndex;

            return {
                index: lastIndex,
                info: data._$tabList[lastIndex]
            }
        }
    });

})(Zepto);

/*!Widget navigator.iscroll.js*/
/**
 * @file 导航栏组件 － iScroll插件
 * @name Navigator.iscroll
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/webapp/naivgator/navigator.html</qrcode>
 * navigator iscroll插件，可滚动导航栏
 * @import core/zepto.iscroll.js, widget/navigator.js
 */

(function ($, undefined) {
    /**
     * @name navigator
     * @grammar navigator(options)  ⇒ self
     * @grammar $.ui.navigator([el [,options]])  ⇒ instance
     * @desc
     * **Options**
     * navigator iscroll插件在原来options基础上增加以下参数
     * - ''disablePlugin''    {Boolean|String}:    (可选, 默认false)是否禁用插件，加载了该插件，若需要禁用，可直接设为true
     * - ''isScrollToNext''   {Boolean}:           (必选, 默认true)是否启用点击可视范围内第一个或最后一个跳动
     * - ''isShowShadow''     {Boolean}:           (可选, 默认true)是否启用阴影
     * - ''iScrollOpts''      {Object}:            (可选)配置iScroll中的参数，其中scrollstart,scrollmove,scrollend做为单独事件在组件中派生，可直接绑相应事件
     * - ''scrollstart''      {Function}:          (可选)滑动前触发的事件，对应iScroll中的onScrollStart
     * - ''scrollmove''       {Function}:          (可选)滑动中触发的事件，对应iScroll中的onScrollMove
     * - ''scrollend''        {Function}:          (可选)滑动后触发的事件，对应iScroll中的onScrollEnd
     *
     * **setup方式html规则**
     * <code type="html">
     * <div id="nav-smartSetup">
     *     <a class="ui-navigator-fixleft" href="#test1">fixleft</a>       <!--固定元素，若没有，则不写，可写多个，左边加class="ui-navigator-fixleft"-->
     *     <ul>                                              <!--中间非固定tab-->
     *         <li><a href="#test1">首页</a></li>
     *         <li><a href="javascript:;">电影</a></li>
     *         <li><a class="cur" href="javascript:;">电视剧</a></li>
     *     </ul>
     *     <a class="ui-navigator-fixleft" href="#test1">fixleft</a>    <!--固定元素，若没有，则不写，可写多个，右边加class="ui-navigator-fixright"-->
     * </div>
     * </code>
     * **full setup方式html规则**
     * <code type="html">        <!--需将所有的class都写全-->
     * <div id="nav-smartSetup">
     *     <a class="ui-navigator-fixleft ui-navigator-fix" href="#test1">fixleft</a>       <!--固定元素，若没有，则不写，可写多个，左边加class="ui-navigator-fixleft"-->
     *     <div class="ui-navigator-wrapper" style="overflow:hidden;">
     *         <ul class="ui-navigator-list">                                             <!--中间非固定tab-->
     *             <li><a href="#test1">首页</a></li>
     *             <li><a href="javascript:;">电影</a></li>
     *             <li><a class="cur" href="javascript:;">电视剧</a></li>
     *         </ul>
     *     </div>
     *     <a class="ui-navigator-fixleft ui-navigator-fix" href="#test1">fixleft</a>    <!--固定元素，若没有，则不写，可写多个，右边加class="ui-navigator-fixright"-->
     * </div>
     * </code>
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/navigator/navigator.html">
     * ../gmu/_examples/widget/navigator/navigator.html
     * ../gmu/_examples/widget/navigator/navigator_fix.html
     * </codepreview>
     */

    $.ui.navigator.register(function () {
        return {
            pluginName: 'iscroll',
            _init: function () {
                return this._adjustHtml()._reBindEvent()._initOrg();
            },
            _reBindEvent: function () {
                var me = this,
                    data = me._data;

                data.isScrollToNext = data.isScrollToNext === undefined ? true : data.isScrollToNext ;
                data.isShowShadow = data.isShowShadow === undefined ? true : data.isShowShadow;
                me._loadIscroll();
                $(window).on('ortchange', $.proxy(me._ortChangeHandler, me));
                me.on('destroy', function () {
                    $(window).off('ortchange', me._ortChangeHandler);
                    data.iScroll.destroy();
                });
                return me;
            },
            _adjustHtml: function () {
                var me = this,
                    data = me._data,
                    $el = me.root().addClass('ui-navigator'),
                    $navScroller = $el.find('ul'),
                    $navWrapper = $el.find('.ui-navigator-wrapper'),
                    $navList = $navScroller.find('li'),
                    scrollerSumWidth = [0];

                !$navWrapper.length && $navScroller.wrap('<div class="ui-navigator-wrapper"></div>');    //smart模式
                $navScroller.find('li').each(function (index) {     //记录每个tab长度的累加和，为半个tab滑动用
                    scrollerSumWidth[index] = index ? (scrollerSumWidth[index -1] + this.offsetWidth) :
                        (scrollerSumWidth[index] + this.offsetLeft - $navScroller[0].offsetLeft + this.offsetWidth);
                });
                $.extend(data, {
                    _$navWrapper: $el.find('.ui-navigator-wrapper'),
                    _$navScroller: $navScroller.width(scrollerSumWidth[$navList.length - 1]),
                    _$navList: $navList,
                    _scrollerNum: $navList.length,
                    _scrollerSumWidth: scrollerSumWidth,
                    _$fixElemLeft: $el.find('.ui-navigator-fixleft'),
                    _$fixElemRight: $el.find('.ui-navigator-fixright')
                });

                return me;
            },
            _loadIscroll:function () {
                var me = this,
                    data = me._data;

                data.iScroll = iScroll(data._$navWrapper.get(0), data.iScrollOpts = $.extend({
                    hScroll:true,
                    vScroll:false,
                    hScrollbar:false,
                    vScrollbar:false
                }, data.iScrollOpts, {
                    onScrollStart:function (e) {
                        me.trigger('scrollstart', e);
                    },
                    onScrollMove:function (e) {
                        me.trigger('scrollmove', e);
                    },
                    onScrollEnd:function (e) {
                        data.isShowShadow && me._setShadow();
                        me.trigger('scrollend', e);
                    }
                }));
                return me;
            },
            _setShadow:function () {
                var me = this,
                    data = me._data,
                    $navWrapper = data._$navWrapper,
                    shadowClass = {
                        left: 'ui-navigator-shadowl',
                        right: 'ui-navigator-shadowr',
                        all: 'ui-navigator-shadowall'
                    },
                    iScroll = data.iScroll,
                    movedX = iScroll.x;

                if (movedX < 0) {
                    $navWrapper.removeClass(shadowClass['left'] + ' ' + shadowClass['right']).addClass(shadowClass['all']);     //开始滑动时
                    if (movedX <= iScroll.maxScrollX) {       //向右滑动到最大
                        $navWrapper.removeClass(shadowClass['all'] + ' ' + shadowClass['right']).addClass(shadowClass['left']);
                    }
                } else {      //向左滑动到最大
                    $navWrapper.removeClass(shadowClass['all'] + ' ' + shadowClass['left']);
                    //转屏后是否可滑动
                    iScroll.hScroll ? $navWrapper.addClass(shadowClass['right']) : $navWrapper.removeClass(shadowClass['all'] + ' ' + shadowClass['left'] + ' ' +shadowClass['right']);
                }

                return me;
            },
            _scrollToNext: function (index, pos) {
                var me = this,
                    data = me._data,
                    scrollerSumWidth = data._scrollerSumWidth,
                    iScroll = data.iScroll;      //iscroll滚动的时间

                iScroll.scrollTo(pos == 'last' ? iScroll.wrapperW - (scrollerSumWidth[index + 1] || scrollerSumWidth[scrollerSumWidth.length - 1]) : pos == 'first' ? (-scrollerSumWidth[index - 2] || 0) : iScroll.x, 0, 400);
                return me;
            },
            _getPos:function (index) {
                var me = this,
                    data = me._data,
                    iScroll = data.iScroll,
                    movedXDis = Math.abs(iScroll.x) || 0,
                    scrollerSumWidth = data._scrollerSumWidth,
                    $navList = data._$navList,
                    thisOffsetDis = scrollerSumWidth[index] - movedXDis,
                    preOffsetDis = scrollerSumWidth[(index - 1) || 0]  - movedXDis,
                    nextOffsetDis = (scrollerSumWidth[index + 1] || scrollerSumWidth[scrollerSumWidth.length - 1]) - movedXDis,
                    wrapperWidth = iScroll.wrapperW;

                return (thisOffsetDis >= wrapperWidth || nextOffsetDis > wrapperWidth) ?   //当前tab为半个tab或者其下一个tab为半个，则视为可显示区的最后一个
                    'last' : (thisOffsetDis <= $navList[index].offsetWidth || preOffsetDis < $navList[index - 1].offsetWidth) ?  //当前tab为半个或者其前面的tab是半个，则视为可显示区的第一个
                    'first' : 'middle';
            },
            _ortChangeHandler:function () {
                var me = this,
                    data = me._data,
                    iScroll = data.iScroll;

                iScroll.refresh();
                me._setShadow();    //增加阴影的转屏处理 traceid:FEBASE-663
                data._$navWrapper.width(iScroll.wrapperW - iScroll.wrapperOffsetLeft);
            },
            switchTo: function (index, isDef, e) {
                var me = this,
                    data = me._data;

                me.switchToOrg(index, isDef, e);
                if (!data._$tabList.eq(index).hasClass('ui-navigator-fix')) {
                    var $fixElemLeft = data._$fixElemLeft,
                        index = index - ($fixElemLeft.length ? $fixElemLeft.length : 0),    //若存在左fix的元素，则滑动的tab的index需相应减去fix tab数量
                        pos = me._getPos(index);

                    isDef && data.isShowShadow && me._setShadow();      //默认defTab设置阴影
                    data.isScrollToNext && me._scrollToNext(index, pos);
                }
                return me;
            }
        }
    });
})(Zepto);

/*!Widget refresh.js*/
/**
 * @file 加载更多组件
 * @name Refresh
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/refresh/refresh.html</qrcode>
 * 加载更多组件
 * @import core/zepto.ui.js
 * @importCSS loading.css
 */

(function($, undefined) {
    /**
     * @name $.ui.refresh
     * @grammar $.ui.refresh(options) ⇒ self
     * @grammar refresh(options) ⇒ self
     * @desc **Options**
     * - ''ready'' {Function}: (必选) 当点击按钮，或者滑动达到可加载内容条件时，此方法会被调用。需要在此方法里面进行ajax内容请求，并在请求完后，调用afterDataLoading()，通知refresh组件，改变状态。
     * - ''statechange'' {Function}: (可选) 样式改变时触发，该事件可以被阻止，阻止后可以自定义加载样式，回调参数：event(事件对象), elem(refresh按钮元素), state(状态), dir(方向)
     * - ''events'' 所有[Trigger Events](#refresh_triggerevents)中提及的事件都可以在此设置Hander, 如init: function(e){}。
     *
     * **setup方式html规则**
     * <code type="html">
     * <div>
     *     <!--如果需要在头部放更多按钮-->
     *     <div class="ui-refresh-up"></div>
     *     ......
     *     <!--如果需要在底部放更多按钮-->
     *     <div class="ui-refresh-down"></div>
     * </div>
     * </code>
     * @notice 此组件不支持render模式，只支持setup模式
     * @desc **Demo**
     * <codepreview href="../gmu/_examples/widget/refresh/refresh.html">
     * ../gmu/_examples/widget/refresh/refresh.html
     * </codepreview>
     */
    $.ui.define('refresh', {
        _data: {
            ready: null,
            statechange: null
        },

        _setup: function () {
            var me = this,
                data = me._data,
                $el = me.root();

            data.$upElem = $el.find('.ui-refresh-up');
            data.$downElem = $el.find('.ui-refresh-down');
            $el.addClass('ui-refresh');
            return me;
        },

        _init: function() {
            var me = this,
                data = me._data;
            $.each(['up', 'down'], function (i, dir) {
                var $elem = data['$' + dir + 'Elem'],
                    elem = $elem.get(0);
                if ($elem.length) {
                    me._status(dir, true);    //初始设置加载状态为可用
                    if (!elem.childNodes.length || ($elem.find('.ui-refresh-icon').length && $elem.find('.ui-refresh-label').length)) {    //若内容为空则创建，若不满足icon和label的要求，则不做处理
                        !elem.childNodes.length && me._createBtn(dir);
                        data.refreshInfo || (data.refreshInfo = {});
                        data.refreshInfo[dir] = {
                            $icon: $elem.find('.ui-refresh-icon'),
                            $label: $elem.find('.ui-refresh-label'),
                            text: $elem.find('.ui-refresh-label').html()
                        }
                    }
                    $elem.on('click', function () {
                        if (!me._status(dir) || data._actDir) return;         //检查是否处于可用状态，同一方向上的仍在加载中，或者不同方向的还未加载完成 traceID:FEBASE-569
                        me._setStyle(dir, 'loading');
                        me._loadingAction(dir, 'click');
                    });
                }
            });
            return me;
        },

        _createBtn: function (dir) {
            this._data['$' + dir + 'Elem'].html('<span class="ui-refresh-icon"></span><span class="ui-refresh-label">加载更多</span>');
            return this;
        },

        _setStyle: function (dir, state) {
            var me = this,
                stateChange = $.Event('statechange');

            me.trigger(stateChange, [me._data['$' + dir + 'Elem'], state, dir]);
            if (stateChange.defaultPrevented) return me;

            return me._changeStyle(dir, state);
        },

        _changeStyle: function (dir, state) {
            var data = this._data,
                refreshInfo = data.refreshInfo[dir];

            switch (state) {
                case 'loaded':
                    refreshInfo['$label'].html(refreshInfo['text']);
                    refreshInfo['$icon'].removeClass();
                    data._actDir = '';
                    break;
                case 'loading':
                    refreshInfo['$label'].html('加载中...');
                    refreshInfo['$icon'].addClass('ui-loading');
                    data._actDir = dir;
                    break;
                case 'disable':
                    refreshInfo['$label'].html('没有更多内容了');
                    break;
            }
            return this;
        },

        _loadingAction: function (dir, type) {
            var me = this,
                data = me._data,
                readyFn = data.ready;

            $.isFunction(readyFn) && readyFn.call(me, dir, type);
            me._status(dir, false);
            return me;
        },

        /**
         * @name afterDataLoading
         * @grammar afterDataLoading(dir)  ⇒ instance
         * @desc - ''dir'' \'up\' 或者 \'down\'
         *
         * 当组件调用ready，在ready中通过ajax请求内容回来后，需要调用此方法，来改变refresh状态。
         */
        afterDataLoading: function (dir) {
            var me = this,
                dir = dir || me._data._actDir;
            me._setStyle(dir, 'loaded');
            me._status(dir, true);
            return me;
        },

        /**
         * @name status
         * @grammar status(dir， status)  ⇒ instance
         * @desc 用来设置加载是否可用，分方向的。
         * - ''dir'' \'up\' 或者 \'down\'
         * - ''status'' ''true'' 或者 ''false''。
         *
         * 当组件调用reday，在ready中通过ajax请求内容回来后，需要调用此方法，来改变refresh状态。
         */
        _status: function(dir, status) {
            var data = this._data;
            return status === undefined ? data['_' + dir + 'Open'] : data['_' + dir + 'Open'] = !!status;
        },

        _setable: function (able, dir, hide) {
            var me = this,
                data = me._data,
                dirArr = dir ? [dir] : ['up', 'down'];
            $.each(dirArr, function (i, dir) {
                var $elem = data['$' + dir + 'Elem'];
                if (!$elem.length) return;
                //若是enable操作，直接显示，disable则根据text是否是true来确定是否隐藏
                able ? $elem.show() : (hide ?  $elem.hide() : me._setStyle(dir, 'disable'));
                me._status(dir, able);
            });
            return me;
        },

        /**
         * @name disable
         * @grammar disable(dir)  ⇒ instance
         * @desc 如果已无类容可加载时，可以调用此方法来，禁用Refresh。
         * - ''dir'' \'up\' 或者 \'down\'
         * - ''hide'' {Boolean} 是否隐藏按钮。如果此属性为false，将只有文字变化。
         */
        disable: function (dir, hide) {
            return this._setable(false, dir, hide);
        },

        /**
         * @name enable
         * @grammar enable(dir)  ⇒ instance
         * @desc 用来启用组件。
         * - ''dir'' \'up\' 或者 \'down\'
         */
        enable: function (dir) {
            return this._setable(true, dir);
        }

        /**
         * @name Trigger Events
         * @theme event
         * @desc 组件内部触发的事件
         *
         * ^ 名称 ^ 处理函数参数 ^ 描述 ^
         * | init | event | 组件初始化的时候触发，不管是render模式还是setup模式都会触发 |
         * | statechange | event, elem, state, dir | 组件发生状态变化时会触发 |
         * | destroy | event | 组件在销毁的时候触发 |
         *
         * **组件状态说明**
         * - ''loaded'' 默认状态
         * - ''loading'' 加载中状态。
         * - ''disabled'' 禁用状态，表示无内容加载了！
         * - ''beforeload'' 在手没有松开前满足加载的条件状态。 需要引入插件才有此状态，lite，iscroll，或者iOS5。
         *
         * statechnage事件可以用来DIY按钮样式，包括各种状态。组件内部通过了一套，如果statechange事件被阻止了，组件内部的将不会执行。
         * 如:
         * <codepreview href="../gmu/_examples/widget/refresh/refresh_iscroll_custom.html">
         * ../gmu/_examples/widget/refresh/refresh_iscroll_custom.html
         * </codepreview>
         */

    });
})(Zepto);
/*!Widget refresh.lite.js*/
/**
 * @file 加载更多组件 － lite版本
 * @name Refresh.lite
 * @short Refresh.lite
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/refresh/refresh_lite.html</qrcode>
 * 上拉加载更多，利用原生滚动，不使用iscroll
 * @import widget/refresh.js
 */

(function($, undefined) {
    /**
     * @name refresh.lite
     * @desc Refresh lite插件，支持拉动加载。
     * @desc **Options** 在refresh的基础上增加参数
     * - ''threshold'' {Number}: (可选) 加载的阀值，默认手指在屏幕的一半，并且拉动距离超过10px即可触发加载操作，配置该值后，可以将手指在屏幕位置进行修重情重改，若需要实现连续加载效果，可将该值配置很大，如1000等
     * - ''seamless''  {Boolean}: (可选) 是否连续加载，解决设置threshold在部分手机上惯性滚动，或滚动较快时不触发touchmove的问题
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/refresh/refresh_lite.html">
     * ../gmu/_examples/widget/refresh/refresh_lite.html
     * </codepreview>
     */
    $.ui.refresh.register(function () {
        return {
            pluginName: 'lite',
            _init: function () {
                var me = this,
                    data = me._data,
                    $el = me.root();

                me._initOrg();
                data.seamless && $(document).on('scrollStop', $.proxy(me._eventHandler, me));
                $el.on('touchstart touchmove touchend touchcancel', $.proxy(me._eventHandler, me));
                data.wrapperH = me.root().height();
                data.wrapperTop = me.root().offset().top;
                data._win = window;
                data._body = document.body;
                return me;
            },
            _changeStyle: function (dir, state) {
                var me = this,
                    refreshInfo = me._data.refreshInfo[dir];

                if (state == 'beforeload') {
                    refreshInfo['$icon'].removeClass('ui-loading');
                    refreshInfo['$label'].html('松开立即加载');
                }
                return me._changeStyleOrg(dir, state);
            },
            _startHandler: function (e) {
                this._data._startY = e.touches[0].pageY;
            },
            _moveHandler: function (e) {
                var me = this,
                    data = me._data,
                    startY = data._startY,
                    movedY = startY - e.touches[0].pageY,
                    winHeight = data._win.innerHeight,
                    threshold = data.threshold || (data.wrapperH < winHeight ? (data.wrapperH / 2 + data.wrapperTop || 0) : winHeight / 2);     //默认值为可视区域高度的一半，若wrapper高度不足屏幕一半时，则为list的一半

                if (!me._status('down') || movedY < 0) return;
                if (!data['_refreshing'] && (startY >= data._body.scrollHeight - winHeight + threshold) && movedY > 10) {    //下边按钮，上拉加载
                    me._setStyle('down', 'beforeload');
                    data['_refreshing'] = true;
                }
                return me;
            },

            _endHandler: function () {
                var me = this,
                    data = me._data;
                me._setStyle('down', 'loading');
                me._loadingAction('down', 'pull');
                data['_refreshing'] = false;
                return me;
            },

            _eventHandler: function (e) {
                var me = this,
                    data = me._data;

                switch (e.type) {
                    case 'touchstart':
                        me._startHandler(e);
                        break;
                    case 'touchmove':
                        clearTimeout(data._endTimer);        //解决部分android上，touchmove未禁用时，touchend不触发问题
                        data._endTimer = $.later(function () {
                            me._endHandler();
                        }, 300);
                        me._moveHandler(e);
                        break;
                    case 'touchend':
                    case 'touchcancel':
                        clearTimeout(data._endTimer);
                        data._refreshing && me._endHandler();
                        break;
                    case 'scrollStop':
                        (!data._refreshing && data._win.pageYOffset >= data._body.scrollHeight - data._win.innerHeight + (data.threshold || -1)) && me._endHandler();
                        break;
                }
                return me;
            }
        }
    });
})(Zepto);
/*!Widget refresh.iscroll.js*/
/**
 * @file 加载更多组件 － iScroll版
 * @name Refresh.iscroll
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/refresh/refresh_iscroll.html</qrcode>
 * 拉动加载更多iscroll插件
 * @short Refresh.iscroll
 * @import core/zepto.iscroll.js, widget/refresh.js
 */

(function($, undefined) {
    /**
     * @name refresh.iscroll
     * @desc Refresh iscroll插件，支持拉动加载，内滚采用iscroll方式，体验更加贴近native。
     * @desc **Options** 在refresh的基础上增加参数
     * - ''threshold''   {Number}: (可选) 加载的阀值，默认向上或向下拉动距离超过5px，即可触发拉动操作，该值只能为正值，若该值是10，则需要拉动距离大于15px才可触发加载操作
     * - ''iScrollOpts'' {Object}: (可选) iScroll的配置项
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/refresh/refresh_iscroll.html">
     * ../gmu/_examples/widget/refresh/refresh_iscroll.html
     * </codepreview>
     */
    $.ui.refresh.register(function () {
        return {
            pluginName: 'iscroll',
            _init: function () {
                var me = this,
                    data = me._data,
                    $el = me.root(),
                    wrapperH = $el.height();

                me._initOrg();
                $.extend(data, {
                    useTransition: true,
                    speedScale: 1,
                    topOffset: data['$upElem'] ? data['$upElem'].height() : 0
                });
                data.threshold = data.threshold || 5;

                $el.wrapAll($('<div class="ui-refresh-wrapper"></div>').height(wrapperH)).css('height', 'auto');
                me._loadIscroll();
            },
            _changeStyle: function (dir, state) {
                var me = this,
                    data = me._data,
                    refreshInfo = data.refreshInfo[dir];

                me._changeStyleOrg(dir, state);
                switch (state) {
                    case 'loaded':
                        refreshInfo['$icon'].addClass('ui-refresh-icon');
                        break;
                    case 'beforeload':
                        refreshInfo['$label'].html('松开立即加载');
                        refreshInfo['$icon'].addClass('ui-refresh-flip');
                        break;
                    case 'loading':
                        refreshInfo['$icon'].removeClass().addClass('ui-loading');
                        break;
                }
                return me;
            },
            _loadIscroll: function () {
                var me = this,
                    data = me._data,
                    threshold = data.threshold;

                data.iScroll = new iScroll(me.root().parent().get(0), data.iScrollOpts = $.extend({
                    useTransition: data.useTransition,
                    speedScale: data.speedScale,
                    topOffset: data.topOffset
                }, data.iScrollOpts, {
                    onScrollStart: function (e) {
                        me.trigger('scrollstart', e);
                    },
                    onScrollMove: (function () {
                        var up = data.$upElem && data.$upElem.length ,
                            down = data.$downElem && data.$downElem.length;

                        return function (e) {
                            var upRefreshed = data['_upRefreshed'],
                                downRefreshed = data['_downRefreshed'],
                                upStatus = me._status('up'),
                                downStatus = me._status('down');

                            if (up && !upStatus || down && !downStatus || this.maxScrollY >= 0) return;    //上下不能同时加载 trace:FEBASE-775，当wrapper > scroller时，不进行加载 trace:FEBASE-774
                            if (downStatus && down && !downRefreshed && this.y < (this.maxScrollY - threshold)) {    //下边按钮，上拉加载
                                me._setMoveState('down', 'beforeload', 'pull');
                            } else if (upStatus && up && !upRefreshed && this.y > threshold) {     //上边按钮，下拉加载
                                me._setMoveState('up', 'beforeload', 'pull');
                                this.minScrollY = 0;
                            } else if (downStatus && downRefreshed && this.y > (this.maxScrollY + threshold)) {      //下边按钮，上拉恢复
                                me._setMoveState('down', 'loaded', 'restore');
                            } else if (upStatus && upRefreshed && this.y < threshold) {      //上边按钮，下拉恢复
                                me._setMoveState('up', 'loaded', 'restore');
                                this.minScrollY = -data.topOffset;
                            }
                            me.trigger('scrollmove', e);
                        };
                    })(),
                    onScrollEnd: function (e) {
                        var actDir = data._actDir;
                        if (actDir && me._status(actDir)) {   //trace FEBASE-716
                            me._setStyle(actDir, 'loading');
                            me._loadingAction(actDir, 'pull');
                        }
                        me.trigger('scrollend', e);
                    }
                }));
            },
            _setMoveState: function (dir, state, actType) {
                var me = this,
                    data = me._data;

                me._setStyle(dir, state);
                data['_' + dir + 'Refreshed'] = actType == 'pull';
                data['_actDir'] = actType == 'pull' ? dir : '';

                return me;
            },
            afterDataLoading: function (dir) {
                var me = this,
                    data = me._data,
                    dir = dir || data._actDir;

                data.iScroll.refresh();
                data['_' + dir + 'Refreshed'] = false;
                return me.afterDataLoadingOrg(dir);
            }
        }
    });
})(Zepto);
/*!Widget refresh.iOS5.js*/

/**
 * @file 加载更多组件 － iOS5版，采用overflow:''scroll''实现
 * @name Refresh.iOS5
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/refresh/refresh_iOS5.html</qrcode>
 * 拉动加载更多iOS5插件，适用于iOS5及以上
 * @short Refresh.iOS5
 * @import widget/refresh.js
 */

(function($, undefined) {
    /**
     * @name refresh.iOS5
     * @desc Refresh iOS5插件，支持iOS5和以上设备，使用系统自带的内滚功能。
     * @desc **Options** 在refresh的基础上增加参数
     * - ''threshold'' {Number}: (可选) 加载的阀值，默认向上或向下拉动距离超过5px，即可触发拉动操作，该值只能为正值，若该值是10，则需要拉动距离大于15px才可触发加载操作
     * - ''topOffset'' {Number}: (可选) 上边缩进的距离，默认为refresh按钮的高度，建议不要修改
     */
    $.ui.refresh.register(function () {
        return {
            pluginName: 'iOS5',
            _init: function () {
                var me = this,
                    data = me._data,
                    $el = me.root();

                me._initOrg();
                $el.css({
                    'overflow': 'scroll',
                    '-webkit-overflow-scrolling': 'touch'
                });
                data.topOffset = data['$upElem'] ? data['$upElem'].height() : 0;
                data.iScroll = me._getiScroll();
                $el.get(0).scrollTop = data.topOffset;
                $el.on('touchstart touchmove touchend', $.proxy(me._eventHandler, me));
            },
            _changeStyle: function (dir, state) {
                var me = this,
                    data = me._data,
                    refreshInfo = data.refreshInfo[dir];

                me._changeStyleOrg(dir, state);
                switch (state) {
                    case 'loaded':
                        refreshInfo['$icon'].addClass('ui-refresh-icon');
                        data._actDir = '';
                        break;
                    case 'beforeload':
                        refreshInfo['$label'].html('松开立即加载');
                        refreshInfo['$icon'].addClass('ui-refresh-flip');
                        break;
                    case 'loading':
                        refreshInfo['$icon'].removeClass().addClass('ui-loading');
                        break;
                }
                return me;
            },

            _scrollStart: function (e) {
                var me = this,
                    data = me._data,
                    topOffset = data.topOffset,
                    $upElem = data.$upElem,
                    wrapper = me.root().get(0),
                    _scrollFn = function () {
                        clearTimeout(me.data('topOffsetTimer'));
                        if ($upElem && $upElem.length && wrapper.scrollTop <= topOffset && !data['_upRefreshed']) {

                            wrapper.scrollTop = topOffset;
                        }
                    };

                me.trigger('scrollstart', e);
                me._enableScroll()._bindScrollStop(wrapper, _scrollFn);      //保证wrapper不会滑到最底部或最顶部，使其处于可滑动状态
                data.maxScrollY = wrapper.offsetHeight - wrapper.scrollHeight;
                data._scrollFn = _scrollFn;

                return me;
            },

            _scrollMove: function () {
                var me = this,
                    data = me._data,
                    up = data.$upElem && data.$upElem.length ,
                    down = data.$downElem && data.$downElem.length,
                    wrapper = me.root().get(0),
                    threshold = data.threshold || 5;

                me._scrollMove = function (e) {
                    var maxScrollY = data.maxScrollY,
                        scrollY = wrapper.scrollTop,
                        lastMoveY = data.lastMoveY || scrollY,
                        upRefreshed = data['_upRefreshed'],
                        downRefreshed = data['_downRefreshed'],
                        upStatus = me._status('up'),
                        downStatus = me._status('down');

                    if (up && !upStatus || down && !downStatus) return;    //处于数据正在加载中，即上次加载还未完成，直接返回, 增加上下按钮的同时加载处理 traceID:FEBASE-569, trace:FEBASE-775
                    data.iScroll.deltaY = scrollY - lastMoveY;    //每次在touchmove时更新偏移量的值
                    if (downStatus && down && !downRefreshed && -scrollY < (maxScrollY - threshold)) {      //下边按钮，上拉加载
                        me._setMoveState('down', 'beforeload', 'pull');
                    } else if (downStatus && down && downRefreshed && -scrollY > (maxScrollY - threshold) && -scrollY !== maxScrollY) {   //下边按钮，上拉恢复  -scrollY !== maxScrollY for trace784
                        me._setMoveState('down', 'loaded', 'restore');
                    } else if (upStatus && up && !upRefreshed && -scrollY > threshold ) {      //上边按钮，下拉加载
                        me._setMoveState('up', 'beforeload', 'pull');
                    } else if (upStatus && up && upRefreshed && -scrollY < threshold && scrollY) {       //上边按钮，下拉恢复，scrollY !== 0  for trace784
                        me._setMoveState('up', 'loaded', 'restore');
                    }

                    data.lastMoveY = scrollY;
                    data._moved = true;
                    return me.trigger('scrollmove', e, scrollY, scrollY - lastMoveY);
                };
                me._scrollMove.apply(me, arguments);
            },

            _scrollEnd: function (e) {
                var me = this,
                    data = me._data,
                    wrapper = me.root().get(0),
                    topOffset = data.topOffset,
                    actDir = data._actDir,
                    restoreDir = data._restoreDir;

                /*上边的铵钮隐藏，隐藏条件分以下几种
                 1.上边按钮复原操作: restoreDir == 'up'，延迟200ms
                 2.上边按钮向下拉，小距离，未触发加载: scrollTop <= topOffset，延迟800ms
                 3.上边按钮向下拉，小距离，未触发加载，惯性回弹：scrollTop <= topOffset，延迟800ms
                 4.上边按钮向下拉，大距离，再回向上拉，惯性回弹scrollTop <= topOffset不触发，走touchstart时的绑定的scroll事件
                 5.上边按钮向下拉，触发加载，走action中的回弹
                 */
                if ((restoreDir == 'up' || wrapper.scrollTop <= topOffset) && !actDir && data._moved) {
                    me.data('topOffsetTimer', $.later(function () {
                        $(wrapper).off('scroll', data._scrollFn);     //scroll事件不需要再触发
                        wrapper.scrollTop = topOffset;
                    }, 800));
                }

                if (actDir && me._status(actDir)) {
                    me._setStyle(actDir, 'loading');
                    me._loadingAction(actDir, 'pull');
                }

                data._moved = false;
                return me.trigger('scrollend', e);
            },

            _enableScroll: function () {
                var me = this,
                    wrapper = me.root().get(0),
                    scrollY = wrapper.scrollTop;

                scrollY <= 0 && (wrapper.scrollTop = 1);       //滑动到最上方
                if (scrollY + wrapper.offsetHeight >= wrapper.scrollHeight) {    //滑动到最下方
                    wrapper.scrollTop = wrapper.scrollHeight - wrapper.offsetHeight - 1;
                }

                return me;
            },

            _bindScrollStop: function (elem, fn) {
                var me = this,
                    $elem = $(elem);

                $elem.off('scroll', me._data._scrollFn).on('scroll', $.debounce(100, function(){
                    $elem.off('scroll', arguments.callee).one('scroll', fn);
                }, false));

                return me;
            },

            _getiScroll: function () {
                var me = this,
                    $wrapper = me.root(),
                    wrapper = $wrapper[0];
                return {
                    el: wrapper,
                    deltaY: 0,
                    scrollTo: function (y, time, relative) {
                        if (relative) {
                            y = wrapper.scrollTop + y;
                        }
                        $wrapper.css({
                            '-webkit-transition-property':'scrollTop',
                            '-webkit-transition-duration':y + 'ms'
                        });
                        wrapper.scrollTop = y;
                    },

                    disable: function (destroy) {
                        destroy && me.destroy();
                        $wrapper.css('overflow', 'hidden');
                    },

                    enable:function () {
                        $wrapper.css('overflow', 'scroll');
                    }
                }
            },

            _setMoveState: function (dir, state, actType) {
                var me = this,
                    data = me._data;

                me._setStyle(dir, state);
                data['_' + dir + 'Refreshed'] = actType == 'pull';
                data['_actDir'] = actType == 'pull' ? dir : '';
                data['_restoreDir'] = dir == 'up' && actType == 'restore' ? dir : ''
                return me;
            },

            _eventHandler: function (e) {
                var me = this;
                switch(e.type) {
                    case 'touchstart':
                        me._scrollStart(e);
                        break;
                    case 'touchmove':
                        me._scrollMove(e);
                        break;
                    case 'touchend':
                        me._scrollEnd(e);
                        break;
                }
            },
            afterDataLoading: function (dir) {
                var me = this,
                    data = me._data,
                    dir = dir || data._actDir;

                data['_' + dir + 'Refreshed'] = false;
                dir == 'up' && (me.root().get(0).scrollTop = data.topOffset);
                return me.afterDataLoadingOrg(dir);
            }
        }
    });
})(Zepto);
/*!Widget toolbar.js*/

/**
 * @file 工具栏组件
 * @name Toolbar
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/toolbar/toolbar.html</qrcode>
 * 工具栏组件
 * @import core/zepto.extend.js, core/zepto.ui.js, core/zepto.fix.js, core/zepto.highlight.js
 */
(function($) {
    /**
     * @name     $.ui.toolbar
     * @grammar  $(el).toolbar(options) ⇒ self
     * @grammar  $.ui.toolbar([el [,options]]) =>instance
     * @desc **el**
     * css选择器, 或者zepto对象
     * **Options**
     * - ''container'' {selector}: (可选，默认：body) 组件容器
     * - ''title'' {String}: (可选)标题文字
     * - ''backButtonText'' {String}:(可选)返回按钮文字
     * - ''backButtonHref'' {String}: (可选)返回按钮的链接
     * - ''btns'' {Array}: (可选)右侧要添加的按钮(Dom节点)
     * - ''useFix'' {Boolean}: (可选)是否使用固顶效果(toolbar 不在页面顶端)
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/toolbar/toolbar.html">
     * ../gmu/_examples/widget/toolbar/toolbar.html
     * ../gmu/_examples/widget/toolbar/toolbar_demo.css
     * </codepreview>
     */
    $.ui.define("toolbar", {
        _data: {
            title:              '',
            backButtonText:     '返回',
            backButtonHref:     '',
            btns:               '',
            useFix:             false,
            backButtonClick:    function() { history.back(1) },
            _isShow:            false
        },

        _create: function() {
            var me = this,
                o = me._data;
            (me.root() || me.root($('<div></div>'))).addClass('ui-toolbar').appendTo(me.data('container') || (me.root().parent().length ? '' : document.body))
                .html((function() {
                    var html = '<div class="ui-toolbar-wrap"><div class="ui-toolbar-left">';
                    if(o.backButtonHref) html += '<a class="ui-toolbar-backbtn" href="' + o.backButtonHref + '">' + o.backButtonText + '</a></div>';
                    else html += '<span class="ui-toolbar-backbtn">' + o.backButtonText + '</span></div>';
                    html += o.title ? '<h2 class="ui-toolbar-title">' + o.title + '</h2>' : '';
                    html += '<div class="ui-toolbar-right"></div></div>';
                    return html;
                }()));
            if(o.btns) {
                var right = me.root().find('.ui-toolbar-right');
                $(o.btns).each(function(i, item) { right.append(item) });
            }
        },

        _setup: function(mode) {
            var me = this,
                root = me.root().addClass('ui-toolbar');
            if(!mode) {
                var childern = root.children(),
                    title = root.find('h1,h2,h3,h4'),
                    index = title.index(),
                    left = $('<div class="ui-toolbar-left"></div>'),
                    right = $('<div class="ui-toolbar-right"></div>'),
                    wrap = $('<div class="ui-toolbar-wrap"></div>');
                root.empty().append(wrap.append(left).append(right));
                if(index == -1){
                    childern.each(function(i, item) { $(item).appendTo(i == 0 ? left : right) });
                } else {
                    childern.each(function(i, item) {
                        if(i < index) left.append(item);
                        else if(i == index) wrap.append($(item).addClass('ui-toolbar-title'));
                        else right.append(item);
                    });
                }
                left.children().first().addClass('ui-toolbar-backbtn');
                me.data('btns') && $(me.data('btns')).each(function(i, item) { right.append(item) });
                me.data('container') && root.appendTo(me.data('container'));
            }
        },

        _init: function() {
            var me = this,
                root = me.root(),
                backbtn = root.find('.ui-toolbar-backbtn');
            if(me.data('useFix')){
                var placeholder = $('<div class="ui-toolbar-placeholder"></div>').height(root.offset().height).
                        insertBefore(root).append(root).append(root.clone().css({'z-index': 1, position: 'absolute',top: 0})),
                    top = root.offset().top,
                    check = function() {
                        document.body.scrollTop > top ? root.css({position:'fixed', top: 0}) : root.css('position', 'absolute');
                    },
                    offHandle;
                $(window).on('touchmove touchend touchcancel scroll scrollStop', check);
                $(document).on('touchend touchcancel', function() {
                    offHandle = arguments.callee;
                    $.later(check, 200);
                });
                me.on('destroy', function() {
                    $(window).off('touchmove touchend touchcancel scroll scrollStop', check);
                    $(document).off('touchend touchcancel', offHandle);
                    placeholder.off().remove();
                }).on('init', check);
            }
            backbtn.highlight('ui-state-hover').is('a') || backbtn.click(me.data('backButtonClick'));
            return me;
        },

        /**
         * @desc 添加工具按钮
         * @name addButton
         * @grammar addButton() => self
         * @param {Array}  [btn1, btn2...]  参数为数组, btn必须为组件实例,通过这种方式添加进来的按钮,会在toolbar销毁时一同销毁
         *  @example
         * //setup mode
         * $('#toolbar').toolbar('addButton', btns);
         *
         * //render mode
         * var demo = $.ui.toolbar();
         * demo.addButton(btns);
         */
        addButton: function(btns) {
            var me = this,
                right = me.root().find('.ui-toolbar-right');
            $.each(btns, function(i, btn) {
                right.append(btn.root());
                me.component(btn);
            });
            return me;
        },

        /**
         * @desc 打开工具栏面板
         * @name show
         * @grammar show() => self
         *  @example
         * //setup mode
         * $('#toolbar').toolbar('show');
         *
         * //render mode
         * var demo = $.ui.toolbar();
         * demo.show();
         */
        show: function() {
            var me = this;
            me.data('_isShow', true);
            me.root().show();
            me.trigger('show');
            return me;
        },

        /**
         * @desc 隐藏工具栏面板
         * @name hide
         * @grammar hide() => self
         *  @example
         * //setup mode
         * $('#toolbar').toolbar('hide');
         *
         * //render mode
         * var demo = $.ui.toolbar();
         * demo.hide();
         */
        hide: function() {
            var me = this;
            me.data('_isShow', false);
            me.root().hide();
            me.trigger('hide');
            return me;
        },

        /**
         * @desc 切换工具栏面板的显隐
         * @name toggle
         * @grammar toggle() => self
         *  @example
         * //setup mode
         * $('#toolbar').toolbar('toggle');
         *
         * //render mode
         * var demo = $.ui.toolbar();
         * demo.toggle();
         */
        toggle: function() {
            var me = this;
            me.data('_isShow') ? me.hide() : me.show();
            return me;
        }
        /**
         * @name Trigger Events
         * @theme event
         * @desc 组件内部触发的事件
         * ^ 名称 ^ 处理函数参数 ^ 描述 ^
         * | init | event | 组件初始化的时候触发，不管是render模式还是setup模式都会触发 |
         * | show | event | 显示时触发的事件 |
         * | hide | event | 隐藏时触发的事件 |
         * | destroy | event | 组件在销毁的时候触发 |
         */
    });
})(Zepto);

/*!Widget add2desktop.js*/

/**
 * @file 生成桌面图标组件
 * @name Add2desktop
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/add2desktop/add2desktop.html</qrcode>
 * 在iOS中将页面添加为桌面图标(不支持Android系统)
 * @import core/zepto.extend.js, core/zepto.ui.js, core/zepto.fix.js
 */

(function($, undefined) {
    /**
     * @name     $.ui.add2desktop
     * @grammar  $(el).add2desktop(options) ⇒ self
     * @grammar  $.ui.add2desktop([el [,options]]) =>instance
     * @desc **el**
     * css选择器, 或者zepto对象
     * **Options**
     * - ''icon'' {String}: (必选) 产品线ICON'S URL
     * - ''container'' {selector}: (可选，默认：body) 组件容器
     * - ''key'' {String}: (可选，默认：_gmu_adddesktop_key) LocalStorage的key值
     * - ''useFix'' {Boolean}: (可选，默认：true) 是否使用fix固顶效果
     * - ''position'' {Object}: (可选，默认：{bottom:12, left: 50%}) 固顶时使用的位置参数
     * - ''beforeshow'' {Function}: (可选) 显示前触发的事件，调用e.preventDefault()可以阻止显示
     * - ''afterhide'' {Function}: (可选) 隐藏后触发的事件，可以在这里写LocalStorage的值
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/add2desktop/add2desktop.html">
     * ../gmu/_examples/widget/add2desktop/add2desktop.html
     * </codepreview>
     */
    $.ui.define('add2desktop', {
        _data: {
            icon: '',
            container:  '',
            key:'_gmu_adddesktop_key',
            useFix: true,
            position: {
                bottom: 12,
                left: '50%'
            },
            beforeshow : function(e){
                this.key() && e.preventDefault()
            },
            afterhide : function(){
                this.key(1)
            },
            _isShow:false
        },

        _create: function() {
            var me = this,
                $elem = (me.root() || me.root($('<div></div>'))).addClass('ui-add2desktop').appendTo(me.data('container') || (me.root().parent().length ? '' : document.body)),
                version = ($.os.version && $.os.version.substr(0, 3) > 4.1 ? 'new' :'old');
            $elem.html('<img src="' + me.data('icon') + '"/><p>先点击<span class="ui-add2desktop-icon-' + version +'"></span>，<br />再"添加至主屏幕"</p><span class="ui-add2desktop-close"><b></b></span><div class="ui-add2desktop-arrow"><b></b></div>');
        },

        _setup: function(mode) {
            var me = this,
                $elem = me.root();
            if(!mode) {
                var src = $elem.children('img').attr('src');
                src && me.data('icon', src);
                me._create();
            }
            return me;
        },

        _init: function() {
            var me = this;
            me.root().find('.ui-add2desktop-close').on('click',function () {
                me.hide();
            });
            me.data('useFix') && me.root().fix(me.data('position'));
            return me.show();
        },

        /**
         * @desc 存储/获取LocalStorage的键值
         * @name key
         * @grammar key()  ⇒ value
         * @example
         * //setup mode
         * $('#add2desktop').add2desktop('key','1'); //设置键值为1
         *
         * //render mode
         * var demo = $.ui.add2desktop();
         * demo.key();  //获取键值
         */
        key : function(value){
            var ls = window.localStorage;
            return value !== undefined ? ls.setItem(this.data('key'),value) : ls.getItem(this.data('key'))
        },

        /**
         * @desc 显示add2desktop
         * @name show
         * @grammar show()  ⇒ self
         */
        show: function() {
            var me = this;
            if(!me.data('_isShow')){
                if(!$.os.ios || $.browser.uc || $.browser.qq || $.browser.chrome) return me; //todo 添加iOS原生浏览器的判断
                var event = $.Event('beforeshow');
                me.trigger(event);
                if(event.defaultPrevented) return me;
                me.root().css('display', 'block');
                me.data('_isShow', true);
            }
            return me;
        },

        /**
         * @desc 隐藏add2desktop
         * @name hide
         * @grammar hide()  ⇒ self
         */
        hide: function() {
            var me = this;
            if(me.data('_isShow')) {
                me.root().css('display', 'none');
                me.data('_isShow', false);
                me.trigger('afterhide');
            }
            return me;
        }
        /**
         * @name Trigger Events
         * @theme event
         * @desc 组件内部触发的事件
         * ^ 名称 ^ 处理函数参数 ^ 描述 ^
         * | init | event | 组件初始化的时候触发，不管是render模式还是setup模式都会触发 |
         * | beforeshow | event | 显示前触发的事件 |
         * | afterhide | event | 隐藏后触发的事件 |
         * | destroy | event | 组件在销毁的时候触发 |
         */
    });

})(Zepto);

/*!Widget gotop.js*/

/**
 * @file 返回顶部组件
 * @name Gotop
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/gotop/gotop.html</qrcode>
 * 提供一个快速回到页面顶部的按钮
 * @import core/zepto.extend.js, core/zepto.ui.js,core/zepto.fix.js
 */
(function($, undefined) {
    /**
     * @name     $.ui.gotop
     * @grammar  $(el).gotop(options) ⇒ self
     * @grammar  $.ui.gotop([el [,options]]) =>instance
     * @desc **el**
     * css选择器, 或者zepto对象
     * **Options**
     * - ''container'' {selector}: (可选,默认：body) 组件容器
     * - ''useFix'' {Boolean}: (可选, 默认为true), 是否使用固顶效果
     * - ''useHide'' {Boolean}: (可选, 默认为true), 是否在touchmove的时候隐藏gotop图标
     * - ''useAnimation'' {Boolean}: (可选, 默认为true), 返回顶部时是否使用动画,在使用iScroll时,返回顶部的动作由iScroll实例执行,此参数无效
     * - ''position'' {Object}: (可选, 默认为{bottom:10, right:10}), 使用fix效果时，要用的位置参数
     * - ''afterScroll'' {function}: (可选,默认：null) 返回顶部后执行的回调函数
     * - ''iScrollInstance'' {Object}: (可选) 使用iscroll时需要传入iScroll实例，用来判定显示与隐藏
     * - ''disablePlugin'' {Boolean}: (可选,默认：false) 是否禁用插件，当加载了gotop.iscroll.js插件但又不想用该插件时，可传入这个参数来禁用插件
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/gotop/gotop.html">
     * ../gmu/_examples/widget/gotop/gotop.html
     * ../gmu/_examples/widget/gotop/gotop_demo.css
     * </codepreview>
     */
    $.ui.define('gotop', {
        _data: {
            container:          '',
            useFix:             true,
            useHide:            true,
            useAnimation:       false,
            position:           {bottom: 10, right: 10},
            afterScroll:        null,
            iScrollInstance:    null,
            disablePlugin:      false
        },

        _create: function() {
            var me = this;
            (me.root() || me.root($('<div></div>'))).addClass('ui-gotop').append('<div></div>').appendTo(me.data('container') || (me.root().parent().length ? '' : document.body));
            return me;
        },

        _setup: function(mode) {
            var me = this;
            me._create();
            return me;
        },

        _init: function() {
            var me = this,
                root = me.root(),
                _eventHandler = $.proxy(me._eventHandler, me);
            me.data('useHide') && $(document).on('touchmove', _eventHandler);
            $(document).on('touchend touchcancel scrollStop', _eventHandler);
            $(window).on('scroll ortchange', _eventHandler);
            root.on('click', _eventHandler);
            me.on('destroy', function() {
                $(document).off('touchmove touchend touchcancel scrollStop', _eventHandler);
                $(window).off('scroll ortchange', _eventHandler);
            });
            me.data('useFix') && root.fix(me.data('position'));
            me.data('root', root[0]);
            return me;
        },

        /**
         * 事件处理中心
         */
        _eventHandler: function(e) {
            var me = this;
            switch (e.type) {
                case 'touchmove':
                    me.hide();
                    break;
                case 'scroll':
                    clearTimeout(me.data('_TID'));
                    break;
                case 'touchend':
                case 'touchcancel':
                    clearTimeout(me.data('_TID'));
                    me.data('_TID', $.later(function(){
                        me._check.call(me);
                    }, 300));
                    break;
                case 'scrollStop':
                    me._check();
                    break;
                case 'ortchange':
                    me._check.call(me);
                    break;
                case 'click':
                    me._scrollTo();
                    break;
            }
        },

        /**
         * 判断是否显示gotop
         */
        _check: function(position) {
            var me = this;
            (position !== undefined ? position : window.pageYOffset) > document.documentElement.clientHeight ? me.show() : me.hide();
            return  me;
        },

        /**
         * 滚动到顶部或指定节点位置
         */
        _scrollTo: function() {
            var me = this,
                from = window.pageYOffset;
            me.hide();
            clearTimeout(me.data('_TID'));
            if (!me.data('useAnimation')) {
                window.scrollTo(0, 1);
                me.trigger('afterScroll');
            } else {
                me.data('moveToTop', $.later(function() {
                    if (from > 1) {
                        window.scrollBy(0, -Math.min(150,from - 1));
                        from -= 150;
                    } else {
                        clearInterval(me.data('moveToTop'));
                        me.trigger('afterScroll');
                    }
                }, 25, true));
            }
            return me;
        },

        /**
         * @desc 显示gotop
         * @name show
         * @grammar show() => self
         *  @example
         * //setup mode
         * $('#gotop').gotop('show');
         *
         * //render mode
         * var demo = $.ui.gotop();
         * demo.show();
         */

        show: function() {
            this._data.root.style.display = 'block';
            return this;
        },

        /**
         * @desc 隐藏gotop
         * @name hide
         * @grammar hide() => self
         * @example
         * //setup mode
         * $('#gotop').gotop('hide');
         *
         * //render mode
         * var demo = $.ui.gotop();
         * demo.hide();
         */
        hide: function() {
            this._data.root.style.display = 'none';
            return this;
        }
        /**
         * @name Trigger Events
         * @theme event
         * @desc 组件内部触发的事件
         * ^ 名称 ^ 处理函数参数 ^ 描述 ^
         * | init | event | 组件初始化的时候触发，不管是render模式还是setup模式都会触发 |
         * | afterScroll | event | 返回顶部后触发的事件 |
         * | destroy | event | 组件在销毁的时候触发 |
         */
    });

})(Zepto);

/*!Widget gotop.iscroll.js*/

/**
 * @file Gotop - 内滚插件
 * @name Gotop － iscroll插件
 * @short Gotop.iscroll
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/gotop/gotop_iscroll.html</qrcode>
 * @import core/zepto.iscroll.js, widget/gotop.js
 */
(function($, undefined) {
    /**
     * @name gotop.iscroll
     * @desc 在使用iScroll的页面上使用gotop组件时，需要加入该插件
     * @desc 使用iscroll后useAnimation参数不起作用
     * **Options**
     * - ''iScrollInstance'' {Object}: (必选)创建好的iScroll实例,使用iscroll时需要传入iScroll实例,用来判定显示与隐藏【useAnimation参数会失效】
     *
     * <code>
     * $('#gotop').gotop({
     *     iScrollInstance: iscroll //创建好的iScroll实例
     * });
     * </code>
     * @desc
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/gotop/gotop_iscroll.html">
     * ../gmu/_examples/widget/gotop/gotop_iscroll.html
     * ../gmu/_examples/widget/gotop/gotop_demo.css
     * </codepreview>
     */
    $.ui.gotop.register(function(){
        return {
            pluginName: 'iscroll',
            _init: function () {
                var me = this,
                    o = me._data,
                    root = me.root(),
                    iscroll = o.iScrollInstance;
                var _move = iscroll.options.onScrollMove,       //防止覆写
                    _end = iscroll.options.onScrollEnd;
                iscroll.options.onScrollMove = function() {
                    _move && _move.call(iscroll, arguments);
                    o.useHide && me.hide();
                };
                iscroll.options.onScrollEnd = function() {
                    _end && _end.call(iscroll, arguments);
                    me._check(Math.abs(iscroll.y));
                    if(o._scrollClick) {    //只在click之后的scrollEnd触发afterScroll事件
                        me.trigger('afterScroll');
                        o._scrollClick = false;
                    }
                };
                root.on('click', function() {
                    o._scrollClick = true;
                    iscroll.scrollTo(0, 0);
                });
                me.on('destroy', function() {
                    iscroll.options.onScrollMove = _move;       //恢复引用
                    iscroll.options.onScrollEnd = _end;
                });
                o.useFix && root.fix(o.position);
                o.root = root[0];
                return me;
            }
        }
    });
})(Zepto);
/*!Widget button.js*/
/**
 * @file 按钮组件
 * @name Button
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/button/button.html</qrcode>
 * 按钮组件
 * @import core/zepto.extend.js, core/zepto.ui.js, core/zepto.highlight.js
 * @importCSS icons.css
 */
(function ($, undefined) {
    var iconRE = /\bui\-icon\-(\w+)\b/ig,
        iconposRE = /\bui\-button\-icon\-pos\-(\w+)\b/ig;

    /**
     * @name $.ui.button
     * @grammar $.ui.button(el, options) ⇒ instance
     * @grammar $.ui.button(options) ⇒ instance
     * @grammar button(options) ⇒ self
     * @desc **el**
     *
     * css选择器, 或者zepto对象
     *
     * **Options**
     * - ''disabled'' {Boolean}: (可选，默认：false)禁用与否
     * - ''selected'' {Boolean}: (可选，默认：false)选中与否
     * - ''label'' {String}: (可选)按钮文字
     * - ''icon'' {String}: (可选) 设置图标，可以是：
     *   home | delete | plus | arrow-u | arrow-d | check | gear | grid | star | arrow-r | arrow-l | minus | refresh | forward | back | alert | info | search | custom
     * - ''alttext'' {String}: (可选)当只设置icon,没有设置label的时候，组件会认为这是个只有icon的按钮，里面不会放任何文字，如果这个值设定了，icon按钮也会有文字内容，但不可见。
     * - ''iconpos'' {String}: (可选，默认：left) 设置图标位置，可以设置4种：left, top, right, bottom
     * - ''attributes'' {Object}: (可选) 在render模式下可以用来设置href， title， 等等
     * - ''container'' {Zepto}: (可选)设置父节点。
     * - ''events'' 所有[Trigger Events](#button_triggerevents)中提及的事件都可以在此设置Hander, 如init: function(e){}。
     *
     * **如果是setup模式，部分参数是直接从DOM上读取**
     * - ''label'' 读取element中文本类容
     * - ''icon'' 读取elment的data-icon属性
     * - ''iconpos'' 读取elment的data-iconpos属性
     * **比如**
     * <code>//<a id="btn" data-icon="home">按钮文字</a>
     * console.log($('#btn').button('data', 'label')); // => 按钮文字
     * console.log($('#btn').button('data', 'icon')); // => home
     * </code>
     *
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/button/button.html">
     * ../gmu/_examples/widget/button/button.html
     * ../gmu/_examples/widget/button/button_demo.css
     * </codepreview>
     */
    $.ui.define('button', {
        _data:{
            disabled: false, // true | false
            selected: false, //true | false
            label: '',
            alttext: '', //当只设置icon,没有设置label的时候，组件会认为这是个只有icon的按钮，里面不会放任何文字，如果这个值设定，icon按钮也会有文字内容，但不可见。
            type: 'button', // button | checkbox | radio | input 在无插件的情况下只有button才能用。
            icon: '',//home | delete | plus | arrow-u | arrow-d | check | gear | grid | star | arrow-r | arrow-l | minus | refresh | forward | back | alert | info | search | custom
            iconpos: '',//left, top, right, bottom 只有在文字和图片都有的情况下才有用
            attributes: null,
            container: null
        },

        _createDefEL: function(){
            return $('<button>');
        },

        _prepareBtnEL: function(mode){
            return this.root();
        },

        _prepareDom : function(mode){
            var data = this._data, $el = this.root(), key;
            if(mode=='create'){
                (data.label || data.alttext) && (data._textSpan = $('<span class="ui-button-text">'+(data.label || data.alttext)+'</span>').appendTo(data._buttonElement));
                data.icon && (data._iconSpan = $('<span class="ui-icon ui-icon-'+data.icon+'"></span>').appendTo(data._buttonElement));
            } else if(mode == 'fullsetup') {
                data._textSpan = $('.ui-button-text', data._buttonElement);
                key = data._buttonElement.hasClass('ui-button-icon-only')?'alttext':'label';
                data[key] = data[key] || data._textSpan.text();
                data._iconSpan = $('.ui-icon', data._buttonElement);
                data.icon = data.icon || data._iconSpan.attr('class').match(iconRE) && RegExp.$1;
                data.iconpos = data.iconpos || data._buttonElement.attr('class').match(iconposRE) && RegExp.$1;
            } else {
                data.label = data.label || data._buttonElement.text() || $el.val();
                data.alttext = data.alttext || $el.attr('data-alttext');
                data.icon = data.icon || $el.attr('data-icon');
                data.iconpos = data.iconpos || $el.attr('data-iconpos');

                data._buttonElement.empty();
                data.icon && (data._iconSpan = $('<span class="ui-icon ui-icon-'+data.icon+'"></span>').appendTo(data._buttonElement));
                (data.label || data.alttext) && (data._textSpan = $('<span class="ui-button-text">'+(data.label || data.alttext)+'</span>').appendTo(data._buttonElement));
            }
        },

        _create: function () {
            var me = this, $el, data = me._data;

            !data.icon && !data.label && (data.label = '按钮');//如果既没有设置icon, 又没有设置label，则设置label为'按钮'

            $el = me._el || (me.root(me._createDefEL()));
            data._buttonElement = me._prepareBtnEL('create');
            me._prepareDom('create');
            $el.appendTo(data._container = $(data.container||'body'));
            data._buttonElement !== $el && data._buttonElement.insertAfter($el);
        },

        _detectType: function(){
            return 'button';
        },

        _setup: function( mode ){
            var me = this, data = me._data;
            mode = mode?'fullsetup':'setup';
            data.type = me._detectType();
            data._buttonElement = me._prepareBtnEL(mode);
            me._prepareDom( mode );
        },

        _prepareClassName: function(){
            var me = this,
                data = me._data,
                className = 'ui-button';

            className += data.label && data.icon ? ' ui-button-text-icon ui-button-icon-pos-'+(data.iconpos||'left') :
                data.label ? ' ui-button-text-only' : ' ui-button-icon-only';
            className += data.disabled?' ui-state-disable':'';
            className += data.selected?' ui-state-active':'';
            return className;
        },

        _init: function(){
            var me = this,
                $el = me.root(),
                data = me._data,
                className = me._prepareClassName();

            data.attributes && $el.attr(data.attributes);
            $el.prop('disabled', !!data.disabled);
            data._buttonElement.addClass(className).highlight(data.disabled?'':'ui-state-hover');

            //绑定事件
            data._buttonElement.on('click', $.proxy(me._eventHandler, me));
            $.each(['click', 'change'], function(){ //绑定在data中的事件， 这里只需要绑定系统事件
                data[this] && me.on(this, data[this]);
                delete data[this];
            });
        },

        /**
         * 事件管理器
         * @private
         */
        _eventHandler:function (event) {
            var data = this._data;
            if(data.disabled) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        },

        /**
         * 设置按钮状态，传入true，设置成可用，传入false设置成不可用
         * @param enable
         * @private
         */
        _setState:function (enable) {
            var data = this._data, change = data.disabled != !enable;
            if(change){
                data.disabled = !enable;
                data._buttonElement[enable?'removeClass':'addClass']('ui-state-disable').highlight(enable?'ui-state-hover':'');;
                this.trigger('statechange', enable);
            }
            return this;
        },

        /**
         * @desc 设置成可用状态。
         * @name enable
         * @grammar enable()  ⇒ instance
         * @example
         * //setup mode
         * $('#btn').button('enable');
         *
         * //render mode
         * var btn = $.ui.button();
         * btn.enable();
         */
        enable:function () {
            return this._setState(true);
        },

        /**
         * @desc 设置成不可用状态。
         * @name disable
         * @grammar disable()  ⇒ instance
         * @example
         * //setup mode
         * $('#btn').button('disable');
         *
         * //render mode
         * var btn = $.ui.button();
         * btn.disable();
         */
        disable:function () {
            return this._setState(false);
        },

        /**
         * @desc 切换可用和不可用状态。
         * @name toggleEnable
         * @grammar toggleEnable()  ⇒ instance
         * @example
         * //setup mode
         * $('#btn').button('toggleEnable');
         *
         * //render mode
         * var btn = $.ui.button();
         * btn.toggleEnable();
         */
        toggleEnable:function () {
            var data = this._data;
            return this._setState(data.disabled);
        },

        _setSelected: function(val){
            var data = this._data;
            if(data.selected != val){
                data._buttonElement[ (data.selected = val) ? 'addClass':'removeClass' ]('ui-state-active');
                this.trigger('change');
            }
            return this;
        },

        /**
         * @desc 设置成选中状态
         * @name select
         * @grammar select()  ⇒ instance
         * @example
         * //setup mode
         * $('#btn').button('select');
         *
         * //render mode
         * var btn = $.ui.button();
         * btn.select();
         */
        select: function(){
            return this._setSelected(true);
        },

        /**
         * @desc 设置成非选中状态
         * @name unselect
         * @grammar unselect()  ⇒ instance
         * @example
         * //setup mode
         * $('#btn').button('unselect');
         *
         * //render mode
         * var btn = $.ui.button();
         * btn.unselect();
         */
        unselect: function(){
            return this._setSelected(false);
        },

        /**
         * @desc 切换选中于非选中状态。
         * @name toggleSelect
         * @grammar toggleSelect()  ⇒ instance
         * @example
         * //setup mode
         * $('#btn').button('toggleSelect');
         *
         * //render mode
         * var btn = $.ui.button();
         * btn.toggleSelect();
         */
        toggleSelect: function(){
            return this._setSelected(!this._data.selected);
        },

        /**
         * @desc 销毁组件。
         * @name destroy
         * @grammar destroy()  ⇒ instance
         * @example
         * //setup mode
         * $('#btn').button('destroy');
         *
         * //render mode
         * var btn = $.ui.button();
         * btn.destroy();
         */
        destroy: function(){
            var me = this, data = this._data;
            data._buttonElement.off('click', me._eventHandler).highlight();
            data._buttonElement.remove();
            me.$super('destroy');
        }

        /**
         * @name Trigger Events
         * @theme event
         * @desc 组件内部触发的事件
         *
         * ^ 名称 ^ 处理函数参数 ^ 描述 ^
         * | init | event | 组件初始化的时候触发，不管是render模式还是setup模式都会触发 |
         * | click | event | 当按钮点击时触发，当按钮为disabled状态时，不会触发 |
         * | statechange | event, state(disabled的值) | 当按钮disabled状态发生变化时触发 |
         * | change | event | 当按钮类型为''checkbox''或者''radio''时，选中状态发生变化时触发 |
         * | destroy | event | 组件在销毁的时候触发 |
         */
    });
})(Zepto);
/*!Widget button.input.js*/
/**
 * @file Button － 表单插件
 * @name Button － 表单插件
 * @short Button.input
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/button/button_input.html</qrcode>
 * button组件下的表单插件，用来扩展按钮类型，在没有插件的情况，只支持button，加此插件后，可以支持以下类型
 * - ''checkbox'' 复选按钮
 * - ''radio'' 单选按钮
 * - ''input'' input按钮（包括type为input, button, submit, reset的input）
 *
 * **使用方法**
 * <code type="javascript">
 * $.ui.button({
 *   type: 'radio'
 * });
 * </code>
 *
 * **如果使用setup模式，类型将自动识别, 规则为: **
 * <tabs>
 * | button | checkbox | radio | input |
 * <code type="html">
 *     <a class="button">按钮</a>
 *     <button class="button">按钮</button>
 * </code>
 * -----
 * <code type="html">
 *     <input class="button" type="checkbox" id="input1" />
 *     <label for="input1">复选按钮</label>
 * </code>
 * -----
 * <code type="html">
 *     <input class="button" type="radio" id="input1" />
 *     <label for="input1">单选按钮</label>
 * </code>
 * -----
 * <code type="html">
 *     <input class="button" type="button" />
 *     <input class="button" type="submit" />
 *     <input class="button" type="reset" />
 * </code>
 * </tabs>
 *
 * **如果是setup模式，且类型为radio或者checkbox某些参数的读取如下**
 * - ''selected'' 读取input的checked属性
 * - ''disabled'' 读取input的selected属性
 * - ''label'' 读取input对应的label的文本内容。
 * **比如**
 * <code>//<input id="btn" name="input1" checked="checked" type="checkbox" /><label for="btn" >复选按钮</label>
 * console.log($('#btn').button('data', 'label')); // => 复选按钮
 * console.log($('#btn').button('data', 'selected')); // => true
 * </code>
 *
 * **Demo**
 * <codepreview href="../gmu/_examples/widget/button/button_input.html">
 * ../gmu/_examples/widget/button/button_input.html
 * ../gmu/_examples/widget/button/button_demo.css
 * </codepreview>
 *
 *
 * @import widget/button.js
 */
(function($, undefined){
    var _uid = 1,
        uid = function(){
            return _uid++;
        },
        defaultElement = {
            button: '<button>',
            checkbox: '<input type="checkbox" />',
            radio: '<input type="radio" />',
            input: '<input type="button" />'
        },
        radioGroup = function( radio ) {
            var name = radio.name,
                form = radio.form,
                radios = $( [] );
            if ( name ) {
                if ( form ) {
                    radios = $( form ).find( "[name='" + name + "']" );
                } else {
                    radios = $( "[name='" + name + "']", radio.ownerDocument );
                }
            }
            return radios;
        };

    $.ui.button.register(function(){
        return {
            pluginName: 'input',
            _init: function(){
                var data = this._data;
                this._initOrg();
                (data.type == 'checkbox' || data.type =='radio') && this.root().prop('checked', !!data.selected);
            },

            _createDefEL: function(){
                return $(defaultElement[this._data.type]) || this._createDefELOrg();
            },

            _detectType: function(){
                var $el = this.root();
                return $el.is('[type=checkbox]')?'checkbox': $el.is('[type=radio]') ? 'radio' : $el.is("input")? 'input': this._detectTypeOrg();
            },

            _prepareBtnEL: function(mode){
                var data = this._data, _id, btnEl, $el, labelSelector;
                if(data.type == 'checkbox' || data.type == 'radio') {
                    $el = this.root();
                    $el.addClass('ui-helper-hidden');
                    if(mode == 'create') {
                        if(!(_id = data.attributes && data.attributes.id)){
                            _id = 'input_'+uid();
                            $.extend(data.attributes || (data.attributes = {}), {id: _id});
                        }
                        btnEl =  $('<label for="'+_id+'"></label>');
                    } else {
                        labelSelector = "label[for='" + $el.attr("id") + "']";
                        btnEl = $el.siblings(labelSelector);//todo 如果没有label，是不是应该创建一个label?
                        if(!btnEl.length){
                            btnEl = $el.parent().find(labelSelector);
                        }
                        data.selected = data.selected || $el.prop('checked');
                    }
                }
                return btnEl?btnEl:this._prepareBtnELOrg(mode);
            },
            _prepareDom: function(mode){
                var data = this._data, $el;
                if(data.type == 'input'){
                    $el = this.root();
                    data.label && $el.val(data.label);
                    if(mode != 'create'){
                        data.label = $el.val();
                    }
                } else return this._prepareDomOrg(mode);
            },

            _setSelected: function(val){
                var data = this._data, type = data.type;
                data.selected != val && (type == 'checkbox' || type == 'radio') && this._el.prop('checked', val);
                return this._setSelectedOrg(val);
            },

            _eventHandler: function(e){
                var data = this._data, radio;
                if(!data.disabled) {
                    if(data.type == 'checkbox'){
                        data._buttonElement.toggleClass( "ui-state-active" );
                        data.selected = !data.selected;
                    } else if(data.type == 'radio'){
                        data._buttonElement.addClass( "ui-state-active" );
                        data.selected = true;
                        radio = this._el[0];
                        $.each(radioGroup( radio )
                            .not( radio )
                            .map(function() {
                                return $( this ).button( "this" );
                            }), function(){
                            if(!this instanceof $.ui.button)return ;
                            this.unselect();
                        });
                    }
                }
                return this._eventHandlerOrg(e);
            },
            /**
             * @name setIcon
             * @grammar setIcon(icon) ⇒ instance
             * @desc 设置按钮图标
             * @example $('a').button('setIcon', 'home'); // 将所有a实例化成button，然后设置icon为home
             */
            setIcon: function(icon) {
                var data = this._data, text = data.label;
                if(data.icon != icon && data.type!= 'input'){
                    if(data.icon){
                        if(!icon){
                            data._iconSpan.remove();
                            data._iconSpan = null;
                            data._buttonElement.removeClass(text?'ui-button-text-icon':'ui-button-icon-only').addClass('ui-button-text-only');
                        } else {
                            data._iconSpan.removeClass('ui-icon-'+data.icon).addClass('ui-icon-'+icon);
                        }
                    }else {
                        data._iconSpan = $('<span class="ui-icon ui-icon-'+icon+'"></span>').appendTo(this._buttonElement);
                        data._buttonElement.removeClass('ui-button-text-only').addClass(text?'ui-button-text-icon':'ui-button-icon-only');
                    }
                    data.icon = icon;
                }
                return this;
            }
        };
    });
})(Zepto);

/*!Widget progressbar.js*/

/**
 * @file 进度条组件
 * @name Progressbar
 * @desc <qrcode align="right" title="Live Demo">../gmu/_examples/widget/progresssbar/progresssbar.html</qrcode>
 * 提供一个可调整百分比的进度条
 * @import core/touch.js, core/zepto.extend.js, core/zepto.ui.js
 */

(function($, undefined) {
    /**
     * @name     $.ui.progressbar
     * @grammar  $(el).progressbar(options) ⇒ self
     * @grammar  $.ui.progressbar([el [,options]]) =>instance
     * @desc **el**
     * css选择器, 或者zepto对象
     * **Options**
     * - ''container'' {selector}: (可选，默认：body) 组件容器
     * - ''initValue'' {Number}: (可选，默认：0) 初始值（百分比）
     * - ''horizontal'' {Boolean}: (可选，默认：true) 组件是否为横向(若设为false,则为竖向)
     * - ''transitionDuration'' {Number}: (可选，默认：300) 按钮滑动时动画效果持续的时间,单位为ms,设为0则无动画
     * **Demo**
     * <codepreview href="../gmu/_examples/widget/progressbar/progressbar.html">
     * ../gmu/_examples/widget/progressbar/progressbar.html
     * ../gmu/_examples/widget/progressbar/progressbar_demo.css
     * </codepreview>
     */
    $.ui.define('progressbar', {
        _data: {
            initValue:          0,
            horizontal:         true,
            transitionDuration: 300,
            _isShow:            true,
            _current:           0,
            _percent:           0
        },

        _create: function() {
            var me = this,
                direction = me.data('horizontal') ? 'h' : 'v';
            (me.root() || me.root($('<div></div>'))).addClass('ui-progressbar-' + direction).appendTo(me.data('container') || (me.root().parent().length ? '' : document.body)).html(
                ('<div class="ui-progressbar-bg"><div class="ui-progressbar-filled"></div><div class="ui-progressbar-button"><div><b></b></div></div></div>'));
        },

        _setup: function(mode) {
            mode || this._create();
        },

        _init: function() {
            var me = this,
                root = me.root(),
                _eventHandler = $.proxy(me._eventHandler, me),
                _button = root.find('.ui-progressbar-button'),
                _background = root.find('.ui-progressbar-bg'),
                _offset = root.offset();
            _button.on('touchstart touchmove touchend touchcancel', _eventHandler);
            _background.on('touchstart', _eventHandler);
            me.data({
                _button:        _button[0],
                $_background:    _background,
                _filled:        root.find('.ui-progressbar-filled')[0],
                _width:         _offset.width,
                _height:        _offset.height
            });
            me.data('horizontal') && _offset.width && root.width(_offset.width);
            me.data('initValue') > 0 && me.value( me.data('initValue'));
        },

        _eventHandler: function(e) {
            var me = this;
            switch (e.type) {
                case 'touchmove':
                    me._touchMove(e);
                    break;
                case 'touchstart':
                    $(e.target).hasClass('ui-progressbar-bg') ? me._click(e) : me._touchStart(e);
                    break;
                case 'touchcancel':
                case 'touchend':
                    me._touchEnd();
                    break;
                case 'tap':
                    me._click(e);
                    break;
            }
        },

        _touchStart: function(e) {
            var me = this,
                o = me._data;
            me.data({
                pageX:      e.touches[0].pageX,
                pageY:      e.touches[0].pageY,
                S:          false,      //isScrolling
                T:          false,      //isTested
                X:          0,          //horizontal moved
                Y:          0           //vertical moved
            });
            o._button.style.webkitTransitionDuration = '0ms';
            o._filled.style.webkitTransitionDuration = '0ms';
            $(o._button).addClass('ui-progressbar-button-pressed');
            me.trigger('dragStart');
        },

        _touchMove: function(e) {
            var me = this,
                o = me._data,
                touch = e.touches[0],
                X = touch.pageX - o.pageX,
                Y = touch.pageY - o.pageY,
                _percent;
            if(!o.T) {
                var S = Math.abs(X) < Math.abs(touch.pageY - o.pageY);
                o.T = true;
                o.S = S;
            }
            if(o.horizontal) {
                if(!o.S) {
                    e.stopPropagation();
                    e.preventDefault();
                    _percent =  (X + o._current) / o._width * 100;
                    if(_percent <= 100 && _percent >= 0) {
                        o._percent = _percent;
                        o.X = X;
                        o._button.style.webkitTransform = 'translate3d(' + (o.X + o._current) + 'px,0,0)';
                        o._filled.style.width = _percent + '%';
                        me.trigger('valueChange');
                    }
                    me.trigger('dragMove');
                }
            } else {
                if(o.S) {
                    e.stopPropagation();
                    e.preventDefault();
                    _percent = -(o._current + Y) / o._height * 100;
                    if(_percent <= 100 && _percent >= 0) {
                        o._percent = _percent;
                        o.Y = Y;
                        o._button.style.webkitTransform = 'translate3d(0,' + (Y + o._current) + 'px,0)';
                        o._filled.style.cssText += 'height:' + _percent + '%;top:' + (o._height + Y + o._current) + 'px';
                        me.trigger('valueChange');
                    }
                    me.trigger('dragMove');
                }
            }
        },

        _touchEnd: function() {
            var me = this,
                o = me._data;
            o._current += o.horizontal ? o.X : o.Y;
            $(o._button).removeClass('ui-progressbar-button-pressed');
            me.trigger('dragEnd');
        },

        _click: function(e) {
            var me = this,
                o = me._data,
                rect = o.$_background.offset(),
                touch = e.touches[0];
            o.horizontal ?
                me.value((touch.pageX - rect.left) / o._width * 100) :
                me.value((o._height - touch.pageY + rect.top) / o._height * 100);
        },

        /**
         * @desc 获取/设置progressbar的值
         * @name value
         * @grammar value() => value   /  value(value) => self
         * @example
         * //setup mode
         * $('#progressbar').progressbar('value');
         * $('#progressbar').progressbar('value', 30);
         *
         * //render mode
         * var demo = $.ui.progressbar();
         * demo.value();
         * demo.value(30);
         */
        value: function(value) {
            var me = this,
                o = me._data,
                _current, duration;
            if(value === undefined) {
                return o._percent;
            } else {
                value = parseFloat(value);
                if(isNaN(value)) return me;
                value = value > 100 ? 100 : value < 0 ? 0 : value;
                o._percent = value;
                duration = ';-webkit-transition-duration:' + o.transitionDuration + 'ms';
                if(o.horizontal) {
                    _current = o._current = o._width * value / 100;
                    o._button.style.cssText += '-webkit-transform:translate3d(' + _current + 'px,0,0)' + duration;
                    o._filled.style.cssText += 'width:'+ value + '%' + duration;
                } else {
                    _current = o._current = o._height * value / -100;
                    o._button.style.cssText += '-webkit-transform:translate3d(0,' + _current + 'px,0)' + duration;
                    o._filled.style.cssText += 'height:' + value + '%;top:' + (o._height + _current) + 'px' + duration;
                }
                me.trigger('valueChange');
                return me;
            }
        },
        /**
         * @desc 显示progressbar
         * @name show
         * @grammar show()  ⇒ self
         */
        show: function() {
            var me = this;
            if(!me.data('_isShow')){
                me.root().css('display', 'block');
                me.data('_isShow', true);
            }
            return me;
        },

        /**
         * @desc 隐藏progressbar
         * @name hide
         * @grammar hide()  ⇒ self
         */
        hide: function() {
            var me = this;
            if(me.data('_isShow')) {
                me.root().css('display', 'none');
                me.data('_isShow', false);
            }
            return me;
        }
        /**
         * @name Trigger Events
         * @theme event
         * @desc 组件内部触发的事件
         * ^ 名称 ^ 处理函数参数 ^ 描述 ^
         * | init | event | 组件初始化的时候触发，不管是render模式还是setup模式都会触发 |
         * | dragStart | event | 拖动进度条开始时触发的事件 |
         * | dragMove | event | 拖动进度条过程中触发的事件 |
         * | dragEnd | event | 拖动进度条结束时触发的事件 |
         * | valueChange | event | 隐藏后触发的事件 |
         * | destroy | event | 组件在销毁的时候触发 |
         */
    });

})(Zepto);


