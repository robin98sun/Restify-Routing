Introduction
============
This is a module for restify.js to build nested routers.
Nested routers can help us to separate a big routing map into well structured pieces according to there coresponding modules.

Quick Start
-----------
```javascript
var restify = require('restify'),
    server = restify.createServer({serverName: "Test restify-routing", serverVersion: "0.1.0"})

server.use(restify.queryParser())
server.use(restify.bodyParser())

var RestifyRouter = require('restify-routing')
var rootRouter = new RestifyRouter()
rootRouter.get('/', function(req, res){
    res.send(200, 'Hello world!')
})
    
// Sub Routers
var subRouter = new RestifyRouter()
subRouter.get('/:username', function(req, res){
    res.send(200, 'Hello ' + req.params.username)
})

// Build subRouter under sub-path '/user'
// this will add restify native route map '/user/:username'
rootRouter.use('/user', subRouter)

// From version 0.3.3, endpoints will not get applied until explicitly call **applyRoutes**
// and CAN NOT be modified anymore.
rootRouter.applyRoutes(server)

server.listen(3000)
```

You can also try the `climbPathTree` method to define and generate the whole routing map in one pass,
which is illustrated in `version 0.2.*`, also can be find in the file `tests/index.js`

This module is used in `Goyoo OEM` project right now, please feel free to post issues and merge requests. 
Enjoy.

Middleware
----------
```javascript
// For things need to be done before end points, typially middlewares
// From version 0.3.*, chained handlers is supported
// This will insert two middlewares in sequence before every end points 
subRouter.all('/user/*', function(req, res, next){
    // something to do ...
    next();     // remember to invoke next(), or send a response to break the callback chain
}, function( req, res, next){
    // some other interesting things to do ...
    next();
});
```

What's new
==========

version 0.3.*
-------------
1. Use `.all(path, callback, ... )` to set middlewares as Express style, all middleware will be invoked in sequence before the end points, just like the `.all` syntax in *Express*
2. Actions can be chained like: `router.all('/user', middleware1, middleware2, middleware3).get('/user', cb1, cb2).post('/service', cb) ....`
3. Support chained handlers like this: `router.get('/path', cb1, cb2, cb3)`
4. Support `*` syntax when setting middleware: `router.all('/user/*', cb1, cb2)`

version 0.2.*
-------------
1. Test is ready
2. `.climbPathTree()` function is added, to parse a routing path tree, which defined as the example shown below:

```javascript
let pathTree = {
    subPaths:{
        user: {
            subPaths:{
                ':username': {
                    allowedMethods: {
                        get : fakeController,  // the value is a function to handle restify routing requests
                        put : fakeController,
                        del : fakeController,
                        patch : fakeController,
                        post : fakeController
                    }
                }
            }
        },
        service: {
            subPaths: {
                orderSeat: {
                    allowedMethods: {
                        put : fakeController
                    },
                    all : [ preCheckForAllMethods ],
                    subPaths: {
                        ':orderId' :{
                            allowedMethods: {
                                get: fakeController,
                                delete: fakeController,
                                patch: fakeController
                            }
                        }
                    }
                },
                orderMeal: {
                    allowedMethods: {
                        put: fakeController
                    },
                    subPaths: {
                        ':orderId' :{
                            allowedMethods: {
                                get: fakeController,
                                delete: fakeController,
                                patch: fakeController
                            }
                        }
                    }
                }
            }
        },
        login: {
            allowedMethods: {
                get: fakeController,
                post: fakeController
            }
        },
        register: {
            allowedMethods: {
                get: fakeController,
                post: fakeController
            }
        }
    },
    allowedMethods: {
        get: fakeController
    }
}

function preCheckForAllMethods(req, res, next){
    req.count = 1;
    return next()
}

function fakeController (req, res){
    req.count = (req.count)?req.count+1:1;
    res.send(200, {count: req.count, path: req.route.path})
}
```

version 0.1.*
-------------
Nested routing use syntax `.use()` like *Express*