//=========================================
// 动画模块v5
//==========================================
define("fx", ["$css"],function( $ ){
    var types = {
        color:/color/i,
        scroll:/scroll/i
    },
    rfxnum = /^([+\-/*]=)?([\d+.\-]+)([a-z%]*)$/i;

    $.mix({//缓动公式
        easing : {
            linear: function( pos ) {
                return pos;
            },
            swing: function( pos ) {
                return (-Math.cos(pos*Math.PI)/2) + 0.5;
            }
        },
        fps: 30,
        "@queue": [],//主列队
        //由于构建更高级的基于元素节点的复合动画
        fx: function ( nodes, duration, hash, effects ){
            nodes = nodes.mass ? nodes : $(nodes);
            var props =  hash || duration ;
            props = typeof props === "object" ? props : {}

            if(typeof duration === "function"){// fx(obj fn)
                hash = duration;               // fx(obj, 500, fn)
                duration = 500;
            }
            if(typeof hash === "function"){   //  fx(obj, num, fn)
                props.after = hash;           //  fx(obj, num, {after: fn})
            }
            if( effects ){
                for(var i in effects){
                    if(typeof effects[i] === "function"){
                        var old = props[i];
                        props[i] = function(node, fx ){
                            effects[i].call(node, node, fx);
                            if(typeof old === "function"){
                                old.call(node, node, fx);
                            }
                        }
                    }else{
                        props[i] = effects[i]
                    }
                }
            }
            return nodes.fx(duration || 500, props);
        }
    })
    //用于向主列队或元素的子列队插入动画实例，并会让停走了的定时器再次动起来
    function tick(fx){
        var gotoQueue = true;
        for(var i = 0, el; el = $["@queue"][i++];){
            if(el.node == fx.node){//★★★第一步
                el.positive.push(fx);//子列队
                gotoQueue = false
                break;
            }
        }
        if(gotoQueue){//★★★第二步
            fx.positive = fx.positive || [];
            $["@queue"].unshift( fx );
        }
        if (tick.id === null) {
            tick.id = setInterval( nextTick, 1000/ $.fps );//原始的setInterval id并执行动画
        }
    }
    tick.id = null;
    //用于从主列队中剔除已经完成或被强制完成的动画实例，一旦主列队被清空，还负责中止定时器，节省内存
    function nextTick() {
        var fxs = $["@queue"], i = fxs.length;
        while(--i >= 0){
            if ( !(fxs[i].node && animate(fxs[i], i)) ) {
                fxs.splice(i, 1);
            }
        }
        fxs.length || (clearInterval( tick.id), tick.id = null);
    }
    function isHidden( elem ) {
        return elem.sourceIndex === 0 || $.css( elem, "display" ) === "none"
        || !$.contains( elem.ownerDocument.documentElement, elem );
    }
    $.fn.fx = function( duration, hash, /*internal*/ p  ){
        if(typeof duration === "number" ){
            hash = hash || {};
            for( var name in hash){
                p = $.cssName(name) || name;
                if( name != p ){
                    hash[ p ] = hash[ name ];//收集用于渐变的属性
                    delete hash[ name ];
                }
            }
            if(typeof hash.easing !== "function"){//转换easing属性为缓动公式
                var easing = (hash.easing || "swing").toLowerCase() ;
                hash.easing = $.easing[ easing ] || $.easing.swing;
            }
            for(var i = 0, node; node = this[i++];){
                var fx = {};
                $.mix(fx, hash)
                fx.method = "noop"
                fx.duration = duration
                fx.node = node;
                tick( fx );
            }
            return this;
        }else{
            throw "First argument must be number "
        }
    }
    $.fx.updateHooks = {
        _default: function(node, per, end, obj){
            $.css(node, obj.name, (end ? obj.to :  obj.from + obj.easing(per) * (obj.to - obj.from)  ) + obj.unit)
        },
        color: function(node, per, end, obj){
            var pos = obj.easing( per ),
            rgb = end ? obj.to : obj.from.map(function(from, i){
                return Math.max(Math.min( parseInt( from + (obj.to[i] - from) * pos, 10), 255), 0);
            });
            node.style[obj.name] = "rgb(" + rgb + ")";
        }
    }
    $.fx.parseHooks = {
        color:function(node, from, to){
            return [ color2array(from), color2array(to) ]
        }
    }
    $.fx._default = $.css,//getter
    $.fx.scroll =  function(el, prop){//getter
        return el[ prop ];
    }
    var keyworks = $.oneObject("orig,overflow,before,frame,after,easing,revert,record,duration,method,node,positive,negative");
    var Animation = {
        noop: function(){},
        type: function (attr){//  用于取得适配器的类型
            for(var i in types){
                if(types[i].test(attr)){
                    return i;
                }
            }
            return "_default";
        },
        //show 开始时计算其width1 height1 保存原来的width height display改为inline-block或block overflow处理 赋值（width1，height1）
        //hide 保存原来的width height 赋值为(0,0) overflow处理 结束时display改为none;
        //toggle 开始时判定其是否隐藏，使用再决定使用何种策略
        show: function(node, fx){
            if(node.nodeType == 1 && isHidden(node)) {
                var display =  $._data(node, "olddisplay");
                if(!display || display == "none"){
                    display = $.parseDisplay(node.nodeName)
                    $._data(node, "olddisplay", display);
                }
                node.style.display = display;
                if(fx && ("width" in fx || "height" in fx)){//如果是缩放操作
                    //修正内联元素的display为inline-block，以让其可以进行width/height的动画渐变
                    if ( display === "inline" && $.css( node, "float" ) === "none" ) {
                        if ( !$.support.inlineBlockNeedsLayout ) {//w3c
                            node.style.display = "inline-block";
                        } else {//IE
                            if ( display === "inline" ) {
                                node.style.display = "inline-block";
                            }else {
                                node.style.display = "inline";
                                node.style.zoom = 1;
                            }
                        }
                    }
                }
            }
        },
        hide: function(node, fx){
            if(node.nodeType == 1 && !isHidden(node)){
                var display = $.css( node, "display" ), s = node.style;
                if ( display !== "none" && !$._data( node, "olddisplay" ) ) {
                    $._data( node, "olddisplay", display );
                }
                if( fx ){//缩小
                    if("width" in fx || "height" in fx){//如果是缩放操作
                        //确保内容不会溢出,记录原来的overflow属性，因为IE在改变overflowX与overflowY时，overflow不会发生改变
                        fx.overflow = [ s.overflow, s.overflowX, s.overflowY ];
                        s.overflow = "hidden";
                    }
                    var after = fx.after;
                    fx.after = function( node, fx ){
                        s.display = "none";
                        if ( fx.overflow != null && !$.support.keepSize  ) {
                            [ "", "X", "Y" ].forEach(function (postfix,index) {
                                s[ "overflow" + postfix ] = fx.overflow[index]
                            });
                        }
                        if(typeof after == "function"){
                            after.call( node, node, fx );
                        }
                    };
                }else{
                    s.display = "none";
                }
            }
        },
        toggle: function( node ){
            $[ isHidden(node) ? "show" : "hide" ]( node );
        },
        //用于生成动画实例的关键帧（第一帧与最后一帧）所需要的计算数值与单位，并将回放用的动画放到negative子列队中去
        create: function (node, fx, index ){
            var to, parts, unit, op, props = [], revertProps = [],orig = {},
            hidden = isHidden(node) , parser
            for(var name in fx){
                if(!fx.hasOwnProperty(name) ||  keyworks[name]){
                    continue
                }
                var val = fx[name] //取得结束值
                var easing = fx.easing;//公共缓动公式
                var type = Animation.type(name);//取得类型
                var from = ($.fx[ type ] || $.fx._default)(node, name);//取得起始值
                //用于分解属性包中的样式或属性,变成可以计算的因子
                if( val === "show" || (val === "toggle" && hidden)){
                    val = $._data(node,"old"+name) || from;
                    fx.method = "show";
                    from = 0;
                    $.css(node, name, 0 );
                }else if(val === "hide" || val === "toggle" ){//hide
                    orig[name] = $._data(node,"old"+name, from );
                    fx.method = "hide";
                    val = 0;
                }else if($.isArray( val )){// array
                    parts = val;
                    val = parts[0];//取得第一个值
                    easing = typeof parts[1] == "function" ? parts[1]: easing;//取得第二个值或默认值
                }

                if((parser = $.fx.parseHooks[ type ])){
                    parts = parser(node, from, val );
                }else{
                    from = !from || from == "auto" ? 0 : parseFloat(from)//确保from为数字
                    if( (parts = rfxnum.exec( val )) ){
                        to = parseFloat( parts[2] ),//确保to为数字
                        unit = $.cssNumber[ name ] ? 0 : (parts[3] || "px");
                        if(parts[1]){
                            op = parts[1].charAt(0);//操作符
                            if (unit && unit !== "px" && (op == "+" || op == "-")  ) {
                                $.css(node, name, (to || 1) + unit);
                                from = ((to || 1) / parseFloat( $.css(node,name) )) * from;
                                $.css( node, name, from + unit);
                            }
                            if(op){//处理+=,-= \= *=
                                to = eval(from+op+to);
                            }
                        }
                        parts = [from, to]
                    }else{
                        parts = [0, 0]
                    }
                }
                from = parts[0];
                to = parts[1];
                if( from +"" === to +"" ){//不处理初止值都一样的样式与属性
                    continue
                }
                var prop = {
                    name: name,
                    from: from ,
                    to: to,
                    type: type,
                    easing: easing,
                    unit: unit
                }
                props.push( prop );
                revertProps.push($.mix({}, prop,{
                    to: from,
                    from: to
                }))
            }
            fx.props = props;
            fx.orig = orig;
            if ( fx.record || fx.revert ) {
                var fx2 = {};//回滚到最初状态
                for( name in fx ){
                    fx2[ name ] = fx[ name ];
                }
                fx2.record = fx2.revert = void 0
                fx2.props = revertProps;
                var el = $["@queue"][ index ];
                el.negative = el.negative || [];
                el.negative.push(fx2);//添加已存负向列队中
            }
        }
    }
    //驱动主列队的动画实例进行补间动画(update)，执行各种回调（before, frame, after），
    //并在动画结束后，从子列队选取下一个动画实例取替自身
    function animate( fx, index ) {
        var node = fx.node, now =  +new Date, mix;
        if(!fx.startTime){//第一帧
            mix = fx.before;//位于动画的最前面
            mix && ( mix.call( node, node, fx ), fx.before = 0 );
            if(!fx.props){//from这个值必须在此个时间点才能侦察正确
                Animation.create( fx.node, fx, index ); //添加props属性与设置负向列队
            }
            Animation[ fx.method ].call(node, node, fx );//这里用于设置node.style.display
            fx.startTime = now;
        }else{
            var per = (now - fx.startTime) / fx.duration;
            var end = fx.gotoEnd || per >= 1;
            var hooks = $.fx.updateHooks
            // 处理渐变
            for(var i = 0, obj; obj = fx.props[i++];){
                ;(hooks[obj.type] || hooks._default)(node, per, end, obj);
            }
            if( (mix = fx.frame ) && !end ){
                mix.call(node, node, fx ) ;
            }
            if ( end ) {//最后一帧
                if(fx.method == "hide"){
                    for(var i in fx.orig){//还原为初始状态
                        $.css( node, i, fx.orig[i] );
                    }
                }
                mix = fx.after;//执行动画完成后的回调
                mix && mix.call( node, node, fx ) ;
                if( fx.revert && fx.negative.length){
                    Array.prototype.unshift.apply( fx.positive, fx.negative.reverse());
                    fx.negative = []; // 清空负向列队
                }
                var neo = fx.positive.shift();
                if ( !neo ) {
                    return false;
                }
                $["@queue"][ index ] = neo;
                neo.positive = fx.positive;
                neo.negative = fx.negative;
            }
        }
        return true;
    }
    $.fn.delay = function( ms ){
        return this.fx( ms );
    }
    //如果clearQueue为true，是否清空列队
    //如果gotoEnd 为true，是否跳到此动画最后一帧
    $.fn.stop = function( clearQueue, gotoEnd  ){
        clearQueue = clearQueue ? "1" : ""
        gotoEnd  = gotoEnd  ? "1" : "0"
        var stopCode = parseInt( clearQueue+gotoEnd ,2 );//返回0 1 2 3
        var array = $["@queue"];
        return this.each(function(node){
            for(var i = 0, fx ; fx = array[i];i++){
                if(fx.node === node){
                    switch(stopCode){//如果此时调用了stop方法
                        case 0:  //中断当前动画，继续下一个动画
                            fx.update = fx.after = fx.frame = $.noop
                            fx.revert && fx.negative.shift();
                            fx.gotoEnd = true;
                            break;
                        case 1://立即跳到最后一帧，继续下一个动画
                            fx.gotoEnd = true;
                            break;
                        case 2://清空该元素的所有动画
                            delete fx.node
                            break;
                        case 3:
                            Array.prototype.unshift.apply( fx.positive,fx.negative.reverse());
                            fx.negative = []; // 清空负向列队
                            for(var j =0; fx = fx.positive[j++]; ){
                                fx.before = fx.after = fx.frame = $.noop
                                fx.gotoEnd = true;//立即完成该元素的所有动画
                            }
                            break;
                    }
                }
            }
        });
    }

    var fxAttrs = [ [ "height", "marginTop", "marginBottom", "paddingTop", "paddingBottom" ],
    [ "width", "marginLeft", "marginRight", "paddingLeft", "paddingRight" ], ["opacity"]]
    function genFx( type, num ) {//生成属性包
        var obj = {};
        fxAttrs.concat.apply([], fxAttrs.slice(0,num)).forEach(function(name) {
            obj[ name ] = type;
            if(~name.indexOf("margin")){
                $.fx.updateHooks[name] = function(node, per, end, obj){
                    var val = (end ? obj.to :  obj.from + ( obj.from - obj.to) * obj.easing(per) ) ;
                    node.style[name] = Math.max(val,0) + obj.unit;
                }
            }
        });
        return obj;
    }

    var effects = {
        slideDown: genFx( "show", 1 ),
        slideUp: genFx( "hide", 1 ),
        slideToggle: genFx( "toggle", 1 ),
        fadeIn: {
            opacity: "show"
        },
        fadeOut: {
            opacity: "hide"
        },
        fadeToggle: {
            opacity: "toggle"
        }
    }

    Object.keys(effects).forEach(function( method ){
        $.fn[ method ] = function( duration, hash ){
            return $.fx( this, duration, hash, effects[method] );
        }
    });

    [ "toggle", "show", "hide" ].forEach(function(  name, i ) {
        var pre = $.fn[ name ];
        $.fn[ name ] = function( duration, hash ) {
            if(!arguments.length ){
                return  pre.call(this)
            }else{
                return $.fx( this, duration, hash, genFx( name , 3) );
            }
        };
    });

    function beforePuff( node, fx ) {
        var position = $.css(node,"position"),
        width = $.css(node,"width"),
        height = $.css(node,"height"),
        left = $.css(node,"left"),
        top = $.css(node,"top");
        node.style.position = "relative";
        $.mix(fx, {
            width: "*=1.5",
            height: "*=1.5",
            opacity: "hide",
            left: "-=" + parseInt(width) * 0.25,
            top: "-=" + parseInt(height) * 0.25
        });
        var after = fx.after;
        fx.after = function( node, fx ){
            node.style.position = position;
            node.style.width = width;
            node.style.height = height;
            node.style.left = left;
            node.style.top = top;
            if(typeof after === "function"){
                after.call( node, node, fx );
            }
        }
    }
    //扩大1.5倍并淡去
    $.fn.puff = function(duration, hash) {
        return $.fx( this, duration, hash, {
            before: beforePuff
        });
    }
    var colorMap = {
        "black":[0,0,0],
        "gray":[128,128,128],
        "white":[255,255,255],
        "orange":[255, 165, 0],
        "red":[255,0,0],
        "green":[0,128,0],
        "yellow":[255,255,0],
        "blue":[0,0,255]
    };
    function parseColor(color) {
        var value;
        $.callSandbox( $.html, function(doc){
            var range = doc.body.createTextRange();
            doc.body.style.color = color;
            value = range.queryCommandValue("ForeColor");
        });
        return [value & 0xff, (value & 0xff00) >> 8,  (value & 0xff0000) >> 16];
    }
    function color2array(val) {//将字符串变成数组
        var color = val.toLowerCase(),ret = [];
        if (colorMap[color]) {
            return colorMap[color];
        }
        if (color.indexOf("rgb") == 0) {
            var match = color.match(/(\d+%?)/g),
            factor = match[0].indexOf("%") !== -1 ? 2.55 : 1
            return (colorMap[color] = [ parseInt(match[0]) * factor , parseInt(match[1]) * factor, parseInt(match[2]) * factor ]);
        } else if (color.charAt(0) == '#') {
            if (color.length == 4)
                color = color.replace(/([^#])/g, '$1$1');
            color.replace(/\w{2}/g,function(a){
                ret.push( parseInt(a, 16))
            });
            return (colorMap[color] = ret);
        }
        if(window.VBArray){
            return (colorMap[color] = parseColor(color));
        }
        return colorMap.white;
    }
    $.parseColor = color2array
    if($.query && $.query.pseudoHooks){
        $.query.pseudoHooks.animated = function( el ) {
            for(var i = 0, fxs = $["@queue"], fx; fx = fxs[i++];){
                if(el == fx.node){
                    return true
                }
            }
        }
    }
    return $;
})
/**
2011.10.10 改进$.fn.stop
2011.10.20 改进所有特效函数，让传参更加灵活
2011.10.21 改进内部的normalizer函数
2012.2.19 normalizer暴露为$.fx 改进绑定回调的机制
2012.5.17 升级到  v4
2012.5.19 $.fx.parse.transform FIX BUG
2012.6.1 优化show hide toggle方法
2012.11.25 升级到 v5 去掉transform的支持,只支持旋转效果
http://caniuse.com/
http://gitcp.com/sorenbs/jsgames-articles/resources
http://www.kesiev.com/akihabara/
http://www.effectgames.com/effect/
http://www.effectgames.com/effect/#Article/joe/My_HTML5_CSS3_Browser_Wish_List
http://www.effectgames.com/games/absorb-hd/
http://shanabrian.com/web/library/cycle.php
http://slodive.com/freebies/jquery-animate/
http://wonderfl.net/search?page=2&q=DoTweener
http://www.phoboslab.org/ztype/
http://kangax.github.com/fabric.js/kitchensink/
http://canvimation.github.com/
https://github.com/sole/tween.js/blob/master/src/Tween.js
http://lab.soledadpenades.com/js/webgl_vga/
http://tmlife.net/tag/enchant-js
GSAP JS, 出自GreenSock的JS动效库，绝对不能错过。包括TweenLite，TweenMax，TimelineLite和TimelineMax，号称比jQuery快20倍！
http://www.greensock.com/gsap-js/
 */