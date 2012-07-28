$.define("system","hfs,more/mapper, hfs, controller, ../app/configs", function(){
    var libs = "mass,lang,lang_fix,support,class,node,query,data,css,css_fix,event,event_fix,attr,flow,ajax"
    var files = [];
    $.mix({
        pagesCache: {}, //���ڱ��澲̬ҳ��,��������ʱƴװ������
        viewsCache: {}, //���ڱ���ģ�庯��
        staticCache: {}, //���ڱ��澲̬��Դ,
        controllers: {}  //���ڱ��������,
    });

    libs.replace($.rword, function( name ){
        try{
            var url =  $.path.join( __dirname, name +".js" );
            var text = $.readFileSync( url, "utf-8")
            files.push(text)
         //   $.log("�ϲ�"+name+"ģ��")
           //$.writeFile( $.path.join( "app/public/scripts/", name +".js" ), text )
        }catch(e){
            $.log(e);
            $.log(url)
        }
    });
    //���õĲ�����body
    var merge = function(){
        var module_value = {
            state: 2
        };
        var __core__ =  "@@@@@".match(/\w+/g)
        for(var i = 0, n ; n = __core__[i++];){
            if(n !== "mass"){
                modules["@"+n] = module_value;
            }
        }
    }
    var first = files.shift();
    var rbody = /[^{]*\{([\d\D]*)\}$/;
    var rcomments = /\/\*\*([\s\S]+?)\*\//g;
    var replaced = merge.toString()
    .replace(rbody, '$1')
    .replace(/^\s*|\s*$/g, '')
    .replace("@@@@@",libs);
    replaced = replaced + files.join("\n")
    replaced = first.replace("/*combine modules*/", replaced ).replace(rcomments,"");
    //��ʼ�ϲ�
    $.writeFile("app/public/scripts/mass_merge.js", replaced,"utf8",function(e){//�����µ�js�ļ���
        if(e) {
            console.log("������ "+e);
        }else{
            console.log("�ϲ��ɹ�")
        }
    })
})

