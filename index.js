'use strict'

var legalMethods = ['get', 'put', 'post', 'del', 'patch', 'head', 'delete'];

var routerPrototype = {
    legalMethods: legalMethods,
    use(path, subRouter){
        subRouter.path = path;
        subRouter.server = this.server;
        subRouter.setChildrenServer(this.server);
        subRouter.parent = this;
        if(!this.children) this.children = [];
        this.children.push(subRouter);
        if(this.server){
            subRouter.activeAll();
        }
    },
    setServer(server){
        this.server = server;
        this.setChildrenServer(server);
        if(this.server){
            this.activeAll();
        }
    },
    setChildrenServer(server){
        if(!this.children)return;
        for(var i = 0; i<this.children.length; i++){
           var child = this.children[i];
           child.server = server;
           child.setChildrenServer(server);
        }
    },
    activeAll(){
        this.activeAllPaths();
        if(!this.children)return;
        for(var i = 0; i<this.children.length; i++){
           var child = this.children[i];
            child.activeAll();
        }
    },
    activeAllPaths(){
        if(!this.server) return;
        if(this.actions){
            for(var i=0; i<this.actions.length; i++) {
                var param = this.actions[i];
                this.active(param.method, param.path, param.callback);
            }
        }
    },
    active(method, path, cb){
        if(!this.server || !path || !cb) return;
        var p = (this.fullPath()+path).replace(/\/\//g, '/');
        if(p.length > 1 && p.substr(p.length-1) === '/') p= p.substr(0, p.length-1)
        this.server[method](p, cb);

        var m = method.toUpperCase();
        if(m === 'DEL') m =  'DELETE';
        console.log('[Route] method: '+m+', path: '+p)
    },
    fullPath(){
        var fp = this.path;
        var x = this.parent;
        while(x){
            fp = x.path + fp;
            x= x.parent;
        }
        if(fp) fp = fp.replace(/\/\//g, '/');
        return fp;
    }
};

for(var i=0; i< legalMethods.length; i++){
    var method = legalMethods[i]; 
    setMethod(method);
}

function setMethod(method){
    var restifyMethod = method;
    if(method==='delete') restifyMethod = 'del';
    routerPrototype[method] = function(path, cb){
        if(!this.actions) this.actions = [];
        this.actions.push({
            method: restifyMethod,
            path: path,
            callback: cb
        });
        if(this.server){
            this.active(restifyMethod, path, cb);
        }
    }
}

function Router(serverInstance) {
    if(serverInstance) this.server = serverInstance;
    this.path = '/';
    this.parent = null;
}

Router.prototype = routerPrototype;

Router.climbPathTree = function climbPathTree (tree, path){
    if(!tree)return null;
    var treePath = path || '/';
    var router = new Router();
    if(tree.allowedMethods){
        for(var method in tree.allowedMethods){
            if(typeof tree.allowedMethods[method] === 'function')
                router[method](treePath, tree.allowedMethods[method]);
        }
    }
    if(tree.subPaths){
        for(var subPath in tree.subPaths){
            var subRouter = climbPathTree(tree.subPaths[subPath]);
            if(subRouter) router.use('/'+subPath, subRouter);
        }
    }
    return router;
}

module.exports = Router;
