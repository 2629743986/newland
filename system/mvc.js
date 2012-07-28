$.define("mvc", "httpflow, http, system",function( Flow,http ){
    $.log("�Ѽ���MVCģ��");
    //http://guides.rubyonrails.org/action_controller_overview.html
    //�ṩ�����(component)��ģ��(layout)��������(filter)��·��(router)�����Զ�����(class autoload)��
    ////http://code.google.com/p/raremvc/
    //��̬��Դ������ء���ܺ��ĺ�������(hook)���ô�������׹��ã�ʹ�ø��ӷ���!
    var  flash = function(type, msg) {
        var arr, msgs;
        msgs = this.session.flash = this.session.flash || {};
        if (type && msg) {
            return msgs[type] = String(msg);
        } else if (type) {
            arr = msgs[type];
            delete msgs[type];
            return String(arr || "");
        } else {
            this.session.flash = {};
            return msgs;
        }
    }

    function router(flow, method, url){
        var go = $.router.routeWithQuery( method, url );
        if( go ){
            flow.params = go.params || {};
            var value = go.value;
            if(typeof value === "string"){
                var match = value.split("#");
                var cname = match[0];
                var aname = match[1];
                var instance = $.controllers[cname];//ȡ�ö�Ӧ������ʵ��
                if( instance ){
                    $.log("���ÿ�����")
                    instance[aname]( flow );//����ָ��action
                }else{
                    $.log( "�����ڴ˿�����" );
                }
            }
        }else{ //ֱ�Ӷ�ȡ
            flow.params = $.path.parse(url, true).query
            flow.fire("no_action")
        }
    }

    //�����п�����������������������Ϻ󣬿�ʼ����HTTP����
    function resource_ready(intercepters){
        http.createServer(function(req, res) {
            var flow = new Flow()//����һ�����̶��󣬴��������첽����������ͼ�ļ��Ķ�ȡ�����ݿ�����
            flow.res =  res;
            flow.req =  req;
            flow.params = {};
            intercepters.forEach(function(fn){
                fn(flow);//����������������
            });
            if(req.method == "POST"){
                var buf = ""
                req.setEncoding('utf8');
                function buildBuffer(chunk){
                    buf += chunk
                }
                req.on('data', buildBuffer);
                req.once('end',function(){
                    var url = req.url
                    if(buf !== ""){
                        url += (/\?/.test( req.url ) ? "&" : "?")  + buf;
                    }
                    router(flow, "POST", url)
                })
            }else{
                router(flow, "GET", req.url)
            }
        }).listen( $.configs.port );

    }
    var defaults = ["send_file","no_action","get_page","get_view","cache_page",
    "get_layout","500","send_error", "timeout"]
    var inter = $.Array.union(defaults, $.configs.intercepters)
    $.walk("app/controllers", function(files){//������Դ
        inter.forEach(function(str){
            files.unshift( "system/intercepters/"+str)
        });
        $.require(files, function(){
            var intercepters = [].slice.call(arguments,0, inter.length);
            resource_ready( intercepters )
        });
    })
//�ҵ�·��ϵͳ����·������·��ӳ�䣬·�ɹ�������ģ�����

//   Ĭ��·��
//   match '/:controller(/:action(/:id))'

//����·��
//match 'products/:id', :to => 'catalog#view'
//����·��
//match 'logout', :to => 'sessions#destroy', :as => 'logout'
   

})
    /*
 ��cookie�ڱ��ش�������

������о���β�����ҳ�ļ����ٶȣ�������һ��html5��һ����performance������Ի�ȡ���������ӳ٣�ҳ������Լ�onload event����ʱ�����Ϣ��
Ϊ���Զ���������ԣ�����Ҫ����javascript��ȡ��Щ��Ϣ֮�����������߰�����¼�������Ҳ����Լ��һ��webserver��javascript��web server�������ݡ�һ���Ƚϼ򵥵İ취���ǰ���Щ��Ϣ��cookie����ʽ��¼������Ȼ�������������ȡcookie��Ϣ���ɡ�
������Javascript����cookie�Ĵ��룺

function createCookie(name, value, days)
{
  if (days) {
    var date = new Date();
    date.setTime(date.getTime()+(days*24*60*60*1000));
    var expires = "; expires="+date.toGMTString();
    }
  else var expires = "";
  document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name)
{
  var ca = document.cookie.split(';');
  var nameEQ = name + "=";
  for(var i=0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1, c.length); //delete spaces
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
  return null;
}

function eraseCookie(name)
{
  createCookie(name, "", -1);
}

IE�¶�ȡcookie��wininet API�е�InternetGetCookie���ɡ���Ҫע����ǵ�һ������lpszUrl���������Ե�ʱ�����ڱ�������д��һ�� htmlҳ�棬�����ҳ��������javascript������cookie����ie��ʱ�ļ��п��Կ�����cookie�ļ������ֽ�cookie:zhijun.peizj@~~local~~/����������վ��cookie�ļ�����cookie:zhijun.peizj@163.com/�� ����ͼ��ʾ��

�����Ҳ²����url����Ӧ��ʹ��~~local~~�� ���Ƿ��ֺ�������ʧ�ܣ�����ֵ��12006��Ҳ����ERROR_INTERNET_UNRECOGNIZED_SCHEME������ʹ����local, 127.0.0.1����Ч������������ƪ����http://www.cnblogs.com/huqingyu/archive/2008/11/27/1342256.html�� ֪����Ҫ����httpͷ�������Թ�http:// ~~local~~, http://local, http://local.com, http://127.0.0.1 ��������Ч������ٴζ�������ƪ���£�����������һ��΢���Ա���Ļش�that the URL field is the url that the user navigates to when browsing to a site. ���������ٴ���ieȥ���Ǹ�html�ļ������ֵ�ַ����file:///C:/Users/zhijun.peizj/Desktop/performance.html�� ����ʹ��file:///��ΪURL�����ֺ������óɹ���
http://www.mikealrogers.com/

https://github.com/substack/tilemap

http://substack.net/
http://vertx.io/ һ��Ư������վ
     *
     */