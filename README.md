Introduction
============
This is a module for restify.js to build nested routers.
Nested routers can help us to separate a big routing map into well structured pieces according to there coresponding modules.

Quick Start
-----------
    var server = require('restify').createServer({})
    var RestifyRouter = require('restify-routing')
    var rootRouter = new RestifyRouter(server)
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

This module is used in `Goyoo OEM` project right now, please feel free to post issues and merge requests. 
Enjoy.
