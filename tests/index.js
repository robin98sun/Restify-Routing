'use strict'
var request = require('supertest'),
    Router = require('../index'),
    restify = require('restify'),
    server = restify.createServer({serverName: "Test restify-routing", serverVersion: "0.1.0"})

server.use(restify.queryParser())
server.use(restify.bodyParser())

function fakeController (req, res){
    res.send(200, req.url)
}
var pathTree = {
    subPaths:{
        user: {
            subPaths:{
                ':username': {
                    allowedMethods: {
                        get : fakeController,
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

var router = Router.climbPathTree(pathTree)
router.setServer(server)

//server.listen(3000)

// Test the path tree
function shootFruits(tree, path){
    if(!tree)return;
    var fruitPath = path || '/';
    if(tree.allowedMethods){
        for(var method in tree.allowedMethods){
            if(typeof tree.allowedMethods[method] === 'function') {
                var pathInstance =  fruitPath.replace(/:[a-zA-Z0-9]+/g, Math.random())
                request(server)[method]( pathInstance)
                    .expect(200)
                    .end(function(err, res){
                        if(err) throw err;
                        else console.log('Pass: '+method.toUpperCase(), pathInstance )
                    })
            }
        }
    }
    if(tree.subPaths){
        for(var subPath in tree.subPaths){
            var targetPath = fruitPath + '/' + subPath;
            shootFruits(tree.subPaths[subPath], targetPath.replace(/\/\//g, '/'));
        }
    }
}

shootFruits(pathTree)