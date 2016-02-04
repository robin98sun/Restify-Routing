'use strict'

let legalMethods = ['get', 'put', 'post', 'del', 'patch', 'head', 'delete'];

let routerPrototype = {
    legalMethods: legalMethods,

    all(path){
        let fp = path || '/';
        if(fp === '*') fp = '/'
        if(!this.superActions) this.superActions = {};
        if(!this.superActions[fp])this.superActions[fp] = [];
        let cbList = Array.prototype.slice.call(arguments, 1);
        if(cbList && cbList.length > 0){
            for(let cb of cbList){
                if(typeof cb === 'function')
                    this.superActions[fp].push(cb)
            }
        }
        return this;
    },
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
        return this;
    },
    setServer(server){
        this.server = server;
        this.setChildrenServer(server);
        if(this.server){
            this.activeAll();
        }
        return this;
    },
    setChildrenServer(server){
        if(!this.children)return this;
        for(let i = 0; i<this.children.length; i++){
           let child = this.children[i];
           child.server = server;
           child.setChildrenServer(server);
        }
        return this;
    },
    activeAll(){
        this.activeAllPaths();
        if(!this.children)return this;
        for(let i = 0; i<this.children.length; i++){
           let child = this.children[i];
            child.activeAll();
        }
        return this;
    },
    activeAllPaths(){
        if(!this.server) return this;
        if(this.actions){
            //for(let i=0; i<this.actions.length; i++) {
            //    let param = this.actions[i];
            //    this.active(param.method, param.path, param.callback);
            //}

            // Merge superActions to actions
            if(this.superActions)
                for(let path in this.superActions){
                    let cbList = this.superActions[path];
                    if(cbList.length > 0)
                        for(let method of this.legalMethods){
                            if(method === 'delete') continue;
                            if(!this.actions) continue;
                            if(!this.actions[method]) continue;
                            if(!this.actions[method][path]) continue;
                            for(let i = cbList.length - 1; i>=0; i--)
                                this.actions[method][path].unshift(cbList[i]);
                        }
                }
            delete this.superActions;
            // Apply routes
            for(let method in this.actions)
                for(let path in this.actions[method]){
                    let actions = this.actions[method][path];
                    if(actions.length > 1) {
                        this.active(method, path, actions);
                    }else if(actions.length === 1){
                        this.active(method, path, actions[0]);
                    }
                }
        }
        return this;
    },
    active(method, path, cb){
        if(!this.server || !path || !cb) return this;
        let p = this.fullPath(path);
        if(typeof cb === 'function')
            this.server[method](p, cb);
        else if(Array.isArray(cb)){
            let args = [p];
            args.push.apply(args, cb);
            this.server[method].apply(this.server, args);
        }

        let m = method.toUpperCase();
        if(m === 'DEL') m =  'DELETE';
        console.log('[Route] method: '+m+', path: '+p)
        return this;
    },
    fullPath(subPath){
        let fp = this.path;
        let x = this.parent;
        while(x){
            fp = x.path + fp;
            x= x.parent;
        }
        if(fp) fp = fp.replace(/\/\//g, '/');
        if(subPath){
            fp = (fp+subPath).replace(/\/\//g, '/');
            if(fp.length > 1 && fp.substr(fp.length-1) === '/') fp= fp.substr(0, fp.length-1)
        }
        return fp;
    },
    translateMethod(m){
        if(m!=='delete') return m;
        else return 'del';
    }
};

for(let i=0; i< legalMethods.length; i++){
    let method = legalMethods[i]; 
    setMethod(method);
}

function setMethod(method){
    let restifyMethod = method;
    if(method==='delete') restifyMethod = 'del';
    routerPrototype[method] = function(path, cb){
        //if(!this.actions) this.actions = [];
        //this.actions.push({
        //    method: restifyMethod,
        //    path: path,
        //    callback: cb
        //});
        const m = this.translateMethod(method);
        if(!this.actions) this.actions = {};
        if(!this.actions[m]) this.actions[m] = {};
        if(!this.actions[m][path]) this.actions[m][path] = [];
        this.actions[m][path].push(cb);
        if(this.server){
            this.active(this.translateMethod(restifyMethod), path, cb);
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
    let treePath = path || '/';
    let router = new Router();
    if(tree.all){
        if(typeof tree.all === 'function'){
            router.all(treePath, tree.all);
        }else if(Array.isArray(tree.all)){
            let args = [treePath];
            args.push.apply(args, tree.all);
            router.all.apply(router, args);
        }
    }
    if(tree.allowedMethods){
        for(let method in tree.allowedMethods){
            if(typeof tree.allowedMethods[method] === 'function')
                router[method](treePath, tree.allowedMethods[method]);
        }
    }
    if(tree.subPaths){
        for(let subPath in tree.subPaths){
            let subRouter = climbPathTree(tree.subPaths[subPath]);
            if(subRouter) router.use('/'+subPath, subRouter);
        }
    }
    return router;
}

module.exports = Router;
