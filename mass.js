(function(){
    //��˲��֡�2012.7.11 by ˾ͽ����
    function $(){}
    var class2type = {  //����ӳ��
        "[object global]" : "Global" ,
        "null" : "Null" ,
        "NaN"  : "NaN"  ,
        "undefined" : "Undefined"
    }
    , rmodule =  /([^(\s]+)\(?([^)]*)\)?/   //���ڴ��ַ������и��ģ��������··��
    , loadings = []                         //���ڼ����е�ģ���б�
    , returns  = {}                         //ģ��ķ���ֵ
    , cbi      = 1e5                        //�������ɻص�����������
    , uuid     = 1
    , toString = returns.toString
    //Ϊ[[class]] --> type ӳ�������Ӹ����Ա,����$.type����
    "Boolean,Number,String,Function,Array,Date,RegExp,Arguments".replace(/\w+/g,function(name){
        class2type[ "[object " + name + "]" ] = name;
    });
    //��һ����������ϲ�����һ����������Ҳ�����Ƕ����У�
    //���ֻ��һ����������ϲ���mix�ĵ������ϣ�������һ�������ǲ������������ж��Ƿ񸲸���������
    function mix( receiver, supplier ){
        var args = Array.apply([], arguments ),i = 1, key,//����������ǲ������ж��Ƿ�дͬ������
        ride = typeof args[args.length - 1] == "boolean" ? args.pop() : true;
        if(args.length === 1){//����$.mix(hash)������
            receiver = !this.window ? this : {} ;
            i = 0;
        }
        while((supplier = args[i++])){
            for ( key in supplier ) {//����������ӣ��û���֤���Ƕ���
                if (supplier.hasOwnProperty(key) && (ride || !(key in receiver))) {
                    receiver[ key ] = supplier[ key ];
                }
            }
        }
        return receiver;
    };

    mix( $, {//Ϊ�˰汾�������ռ������ӳ�Ա
        rword: /[^, ]+/g,
        mix:  mix,
        "@debug" : true,
        isWindows: process.platform === 'win32',//�ж���ǰƽ̨�Ƿ�Ϊwindow
        //�����������ת�������������飬��������Ƭ����(����ڶ������������ڵ������)
        slice: function ( nodes, start, end ) {
            var ret = [], n = nodes.length
            if(end === void 0 || typeof end == "number" && isFinite(end)){
                start = parseInt(start,10) || 0
                end = end == void 0 ? n : parseInt(end, 10)
                if(start < 0){
                    start += n
                }
                if(end > n){
                    end = n
                }
                if(end < 0){
                    end += n
                }
                for (var i = start; i < end; ++i) {
                    ret[i - start] = nodes[i];
                }
            }
            return ret;
        },
        getUid:  function( node ){
            return node.uniqueNumber || ( node.uniqueNumber = uuid++ );
        },
        // ����һ���������ֵ��Ϊ1(���û��ָ��)��ڶ����������������ڸ��ٻ��ж�
        oneObject: function(array, val){
            if(typeof array == "string"){
                array = array.match($.rword) || [];
            }
            var result = {},value = val !== void 0 ? val :1;
            for(var i=0, n=array.length;i < n; i++){
                result[ array[i] ] = value;
            }
            return result;
        },
        // ����ȡ�����ݵ����ͣ�һ������������£����ж����ݵ����ͣ���������������£�
        type: function (obj, str){
            var result = class2type[ (obj == null || obj !== obj )? obj : toString.call(obj) ] || "#";
            if( result.charAt(0) === "#"){
                if(Buffer.isBuffer(obj)){
                    result = 'Buffer'; //���ع���������
                }else{
                    result = toString.call(obj).slice(8,-1);
                }
            }
            if(str){
                return str === result;
            }
            return result;
        },
        md5: function(str, encoding){
            return require('crypto').createHash('md5').update(str).digest(encoding || 'hex');
        },
        path: require("path"),//��ԭ��pathģ��ٳֵ������ռ���
        //����������app/configsģ���ṩ
        configs: {
            intercepters:[]
        },
        //ģ����صĶ��庯��
        define: function( name, deps, factory ){//ģ����,�����б�,ģ�鱾��
        //����ֻ��һ���սӿ�
        },
        //ģ����ص�������
        require: function( deps, factory, errback ){
            var _deps = {}, args = [], dn = 0, cn = 0;
            factory = typeof factory == "function" ? factory : $.noop;
            String(deps +"").replace( $.rword, function( str ){
                if(str.indexOf("./") === 0){
                    str = str.replace(/^\.\//, "" );
                }
                dn++;
                var match = str.match( rmodule );
                var id  = "@"+ match[1];//ģ���ID
                var filename = match[2];//ģ���URL
                if(!filename){
                    id = id.replace(/\.js$/,"")
                    filename = $.path.join( factory.parent || $.require.root, match[1] ); //path.join���Զ�����../�����
                    filename = /\.js$/.test(filename) ? filename : filename +".js";
                }
                var input = id;
                try{//�Ȱ�������ԭ��ģ����м���
                    returns[ id ] = require( match[1] );//require�����ǻ��������
                    mapper[ id ] = {
                        state : 2
                    }
                    process.nextTick( $._checkDeps );//ÿ�ɹ�����һ��ģ��ͽ����������
                }catch(e){
                    input = filename
                }
                if( !_deps[ input ] ){
                    args.push( input );
                    _deps[ input ] = "˾ͽ����";
                }
                if( input === filename &&  !mapper[ input ] ){ //��ֹ�ظ����ɽڵ�������
                    mapper[ input ] = {};//state: undefined, δ��װ; 1 ���ڰ�װ; 2 : �Ѱ�װ
                    loadJS( filename );
                }else if( mapper[ input ].state === 2  ){
                    cn++;
                }
            });
            var id = factory.id || "@cb"+ ( cbi++ ).toString(32);
            if( typeof errback == "function" ){
                errorStack.push( errback );//ѹ������ջ
            }
            mapper[ id ] = mapper[ id ] || {}
            $.mix( mapper[ id ], {//���������ģ���״̬
                callback: factory,
                id:       id,
                deps:     _deps,
                args:     args,
                state:    1
            }, false);
            //�����������ģ��ֻ��ͨ��_checkDepsִ��
            loadings.unshift( id );
            process.nextTick( $._checkDeps );
        },

        //  ģ����صļ����������,���һ��ģ��������������ģ���״̬����2��,��ô����Ҳ�ĳ�2,��ִ�лص�
        _checkDeps: function (){
            loop:
            for ( var i = loadings.length, filename; filename = loadings[ --i ]; ) {
                var obj = mapper[ filename ], deps = obj.deps || {};
                for( var key in deps ){
                    if( deps.hasOwnProperty( key ) && mapper[ key ].state != 2 ){
                        continue loop;
                    }
                }
                //���deps�ǿն��������������ģ���״̬����2
                if( obj.state !== 2){
                    loadings.splice( i, 1 );//�������Ƴ��ٰ�װ����ֹ��IE��DOM��������ֶ�ˢ��ҳ�棬����ִ����
                    obj.state = 2 ;
                    var  id = obj.id;
                    var  ret = collect_rets( id, obj.args ||[], obj.callback );
                    if( id.indexOf("@cb") === -1 ){
                        returns[ id ] = ret;
                        //   $.log('<code style="color:cyan;">�Ѽ���', id, 'ģ��</code>', true);
                        $._checkDeps();
                    }
                }
            }
        }
    });
    //��ģ���й���Ϣ�����������
    var mapper = $.require.cache = {}
    //ģ����صĸ�·��,Ĭ����mass.js����ģ�����ڵ�Ŀ¼
    $.require.root = process.cwd();
    //��returns����ȡ�������б��еĸ�ģ��ķ���ֵ
    function collect_rets( name, args, fn ){
        for(var i = 0, argv = []; i < args.length ; i++){
            argv.push( returns[ args[i] ] );
        }
        var ret = fn.apply( null, argv );//ִ��ģ�鹤����Ȼ��ѷ���ֵ�ŵ�returns������
        $.debug( name );//��취ȡ�ú����е�exports����
        return ret;
    }
    $.parseQuery = require("querystring").parse;
    $.parseUrl = require("url").parse; //��ԭ��URLģ���parse�ٳ�����
    $.noop = $.error = $.debug = function(){};//error, debug���ڻ��ǿսӿ�

    //ģ����صļ��غ���
    function loadJS(  filename ){
        try{
            $.define = function(){//����$.define
                var args = Array.apply([],arguments);
                if( typeof args[1] === "function" ){//����ֻ���������������
                    [].splice.call( args, 1, 0, "" );
                }
                args[2].id = filename; //ģ����
                args[2].parent =  filename.slice(0, filename.lastIndexOf( $.path.sep ) + 1) //ȡ�ø�ģ����ļ���
                mapper[ filename ].state = 1;
                process.nextTick( $._checkDeps );//ÿ�ɹ�����һ��ģ��ͽ����������
                $.require( args[1], args[2] );
            }
            require( filename );
        }catch( e ){
            $.log("<code style='color:red'>",e , "</code>", true);
            for(var fn; fn = errorStack.shift(); ){
                fn();//��ӡ�����ջ
            }
        }
    }

    //����ģ�����ʧ��ʱ�Ĵ���ص�
    var errorStack = [];
    //ʵ��Ư����������ɫ����־��ӡ
    new function(){
        var rformat = /<code\s+style=(['"])(.*?)\1\s*>([\d\D]+?)<\/code>/ig
        , colors = {}
        , index  = 0
        , formats = {
            bold      : [1, 22],
            italic    : [3, 23],
            underline : [4, 24],
            inverse   : [7, 27],
            strike    : [9, 29]
        };
        "black,red,green,yellow,blue,magenta,cyan,white".replace($.rword, function(word){
            colors[word] = index++;
        });
        colors.gray = 99;
        function format (arr, str) {
            return '\x1b[' + arr[0] + 'm' + str + '\x1b[' + arr[1] + 'm';
        }
        /**
         * ���ڵ���
         * @param {String} s Ҫ��ӡ������
         * @param {Boolean} color ���и�����ɫ�ĸ�����ʹ��<code style="format:blod;color:red;background:green">
         * format��ֵ����Ϊformats�����֮һ�����ǵ���ϣ��Կո������������ɫ������ɫֻ��Ϊcolors֮һ
         */
        $.log = function (s, color){
            var args = Array.apply([],arguments);
            if(arguments.length === 1){
                return  console.log( s );
            }
            if( args.pop() === true){
                s = args.join("").replace( rformat, function( a, b, style,ret){
                    style.toLowerCase().split(";").forEach(function(arr){
                        arr = arr.split(":");
                        var type = arr[0].trim(),val = (arr[1]||"").trim();
                        switch(type){
                            case "format":
                                val.replace(/\w+/g,function(word){
                                    if(formats[word]){
                                        ret = format(formats[word],ret)
                                    }
                                });
                                break;
                            case "background":
                            case "color":
                                var array = type == "color" ? [30,39] : [40,49]
                                if( colors[val]){
                                    array[0] += colors[val]
                                    ret = format(array,ret)
                                }
                        }
                    });
                    return ret;
                });
            }else{
                s  = [].join.call(arguments,"")
            }
            console.log( s );
        }
    }

    //��¶��ȫ����������,����ģ��ɼ�!!
    exports.$ = global.$ = $;
    $.log("<code style='color:green'>���mass���</code>",true);

    //����mass framework����Ҫ��ҳ��
    $.require("system/page_generate");
    
 $.require("system/deploy,system/mvc", function(deploy){
        deploy(  process.cwd() );//����appĿ¼���ļ��ı仯,ʵ��������
    });

//��װ����:
//��װ���ݿ� http://www.mongodb.org/downloads,���ػ����ŵ�C�̽�ѹ,����Ϊmongodb
//��C���½�dataĿ¼,�����ٽ�dbĿ¼
//����mongo���ݿ�  C:\mongodb\bin\mongod.exe
//�ڿ��mass.js������Ŀ¼��װmongodb��node.js���ӿ�npm install mongodb
//���npm��װʧ�ܿ����Ǳ�ǽ,����@Python������ �ṩ�Ĵ��� npm --registry http://42.121.86.107:1984 install mongodb
//������� node mass

//�����ҵ���Ҫ���������������ǵĺ�̲�Ͻ���һ��С���


})();

//https://github.com/codeparty/derby/blob/master/lib/View.js ������ͼ��ģ��
//2011.12.17 $.define��Ҳ����ָ��ģ�����ڵ�Ŀ¼��,
//2012.7.12 ���¿�ʼ���˿��
//2012.8.9  ���parseUrl, parseQuery API
//�����ļ��۲���https://github.com/andrewdavey/vogue/blob/master/src/Watcher.js https://github.com/mikeal/watch/blob/master/main.js
//һ���ܺõ�ǰ�˹��� https://github.com/colorhook/att
//http://blog.csdn.net/dojotoolkit/article/details/7820321
