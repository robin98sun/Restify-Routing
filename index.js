'use strict'

let legalMethods = ['get', 'put', 'post', 'del', 'patch', 'head', 'delete'];

let routerPrototype = {
    legalMethods: legalMethods,
    debugLog (mesg){
        if(!this.debug) return;
        console.log(mesg);
    },
    // Setup midware for all methods
    all(pattern, ...cbList){
        if(! cbList || cbList.length === 0) return this;
        let fp = pattern || '*';
        fp = fp.replace( /[\*]+/g, '*');
        if(!this.middlewares) this.middlewares = [];
        //let cbList = Array.prototype.slice.call(arguments, 1);
        let targetAction = null;
        this.middlewares.map( action => {
            if(action.pattern === fp) targetAction = action;
            return action;
        } );
        if(!targetAction){
            targetAction = {
                pattern: fp,
                callbacks: []
            };
            this.middlewares.push(targetAction);
        }
        Array.prototype.push.apply(targetAction.callbacks, cbList);
        return this;
    },
    use(path, subRouter, ...midwares){
        subRouter.path = path;
        subRouter.server = this.server;
        subRouter.setChildrenServer(this.server);
        subRouter.parent = this;
        if(!this.children) this.children = [];
        this.children.push(subRouter);

        //if(this.server){
        //    subRouter.activeAll();
        //}

        // Set middlewares for subRouter
        if(midwares && midwares.length>0){
            subRouter.all('*', midwares);
        }

        return this;
    },
    setServer(server){
        console.error("[Restify-routing] method 'setServer' is deprecated, but still valid. " +
            "Please use 'applyRoutes' instead, to make code more readable");
        return this.applyRoutes(server);
    },
    applyRoutes(server){
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
            // Apply routes
            for(let method in this.actions)
                for(let path in this.actions[method]){
                    this.active(method, path);
                }
        }
        return this;
    },
    allMiddlewares(){
        let r = this;
        let mwlist = [];
        if(this.middlewares) {
            mwlist.push.apply(mwlist, this.middlewares);
            mwlist.forEach((action)=>{
               action.absolutePattern = this.absolutePath(action.pattern);
            });
        }
        while(r.parent) {
            r = r.parent;
            if(!r.middlewares) {
                continue;
            }
            for(let i = r.middlewares.length - 1; i>=0; i--){
                //if(this.isPatternCoverSubRoutes(r.middlewares[i].pattern)) {
                let action = r.middlewares[i];
                action.absolutePattern = r.absolutePattern(action.pattern);
                mwlist.unshift(action);
                //}
            }
        }
        return mwlist;
    },
    actionsForMethodAtPath(method, path){
        if(!method || !path) return null;
        if(!this.actions || !this.actions[method] || !this.actions[method][path]) return null;
        let cbList = this.actions[method][path];

        // Get compatible middlewares
        let mwlist = this.allMiddlewares();
        for(let i = mwlist.length-1; i>=0; i--){
            let action = mwlist[i];
            if(this.isPathCompatibleWithPattern(this.absolutePath(path), action.absolutePattern)){
                Array.prototype.unshift.apply(cbList, action.callbacks);
            }
        }

        return cbList;
    },
    active(method, path, cb){
        if(!this.server || !path ) return this;
        let p = this.absolutePath(path);
        if(typeof cb === 'function')
            this.server[method](p, cb);
        else if(Array.isArray(cb)){
            let args = [p];
            args.push.apply(args, cb);
            this.server[method].apply(this.server, args);
        }else{
            let cbList = this.actionsForMethodAtPath(method, path);
            if(!cbList || !Array.isArray(cbList) || cbList.length == 0) return this;
            return this.active(method, path, cbList);
        }

        let m = method.toUpperCase();
        if(m === 'DEL') m =  'DELETE';
        this.debugLog('[Route] method: '+m+', path: '+p)
        return this;
    },
    absolutePath(subPath){
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
    absolutePattern(pattern){
        let p = pattern || '*';
        let fp = this.absolutePath();
        p = (fp +'/'+p).replace(/\/\//g, '/');
        return p;

    },
    translateMethod(m){
        if(m!=='delete') return m;
        else return 'del';
    },
    isPathCompatibleWithPattern(path, pattern){
        if(!path || !pattern)return false;
        const parts = pattern.split('*');
        let eatenPath = path;
        let isEndWithStarSyntax = false;
        for(let part of parts){
            if(part.length > 0){
                if(eatenPath.indexOf(part)>=0){
                    eatenPath = eatenPath.substr(eatenPath.indexOf(part) + part.length)
                }else{
                    return false;
                }
                isEndWithStarSyntax = false;
            }else{
                isEndWithStarSyntax = true;
            }
        }
        if(eatenPath.length > 0 && !isEndWithStarSyntax) return false;

        return true;
    },
    isPatternCoverSubRoutes(pattern){
        if(!pattern || pattern.length === 0) return false;
        if(pattern.substr(pattern.length-1, 1) === '*') return true;
        return false;
    }
};

for(let i=0; i< legalMethods.length; i++){
    let method = legalMethods[i]; 
    setMethod(method);
}

function setMethod(method){
    routerPrototype[method] = function(path){
        const m = this.translateMethod(method);
        if(!this.actions) this.actions = {};
        if(!this.actions[m]) this.actions[m] = {};
        if(!this.actions[m][path]) this.actions[m][path] = [];
        let cbList = Array.prototype.slice.call(arguments, 1);
        if(cbList && cbList.length > 0){
            Array.prototype.push.apply(this.actions[m][path], cbList);
        }
        //if(this.server){
        //    this.active(m, path);
        //}
    }
}

function Router(params) {
    this.server = null;
    this.path = '/';
    this.parent = null;
    this.debug = false;
    if(params && !params.server) {
        this.server = params;
    } else if(params){
        for(let prop in params){
            this[prop] = params[prop];
        }
    }
}

Router.prototype = routerPrototype;

Router.climbPathTree = function climbPathTree (tree, path){
    if(!tree)return null;
    let treePath = path || '/';
    let router = new Router();
    if(tree.middlewares){
        for(let action of tree.middlewares){
            let args = [action.pattern];
            if(action.callbacks && Array.isArray(action.callbacks)){
                args.push.apply(args, action.callbacks);
            }else if(typeof action.callbacks === 'function'){
                args.push(action.callbacks);
            }
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
