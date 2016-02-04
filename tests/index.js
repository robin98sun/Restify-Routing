'use strict'
const request = require('supertest'),
    Router = require('../index'),
    restify = require('restify'),
    server = restify.createServer({serverName: "Test restify-routing", serverVersion: "0.1.0"})

server.use(restify.queryParser())
server.use(restify.bodyParser())

function preCheckForAllMethods(req, res, next){
    req.count = (req.count)?req.count+1:1;
    return next()
}

function fakeController (req, res){
    req.count = (req.count)?req.count+1:1;
    res.send(200, {count: req.count, path: req.route.path})
}
let pathTree = {
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
                    all : [ preCheckForAllMethods, preCheckForAllMethods ],
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

let router = Router.climbPathTree(pathTree)
router.setServer(server)

//server.listen(3000)

// Test the path tree
function shootFruits(tree, path){
    if(!tree)return;
    let fruitPath = path || '/';

    if(tree.allowedMethods){
        for(let method in tree.allowedMethods){
            if(typeof tree.allowedMethods[method] === 'function') {
                let pathInstance =  fruitPath.replace(/:[a-zA-Z0-9]+/g, Math.random())
                request(server)[method]( pathInstance)
                    .expect(200)
                    .end(function(err, res){
                        if(err) throw err;
                        else {
                            let expectedCount = 1;
                            if(tree.all){
                                if(typeof tree.all === 'function') expectedCount += 1;
                                else expectedCount+=tree.all.length;
                            }
                            if(res.body.count != expectedCount){
                                throw new Error('Routing did NOT go through the *all* method first, ' +
                                    'expected response value is '+ expectedCount +', but actual response is ' +
                                    res.body.count)
                            }
                        }
                    })
            }
        }
    }
    if(tree.subPaths){
        for(let subPath in tree.subPaths){
            let targetPath = fruitPath + '/' + subPath;
            shootFruits(tree.subPaths[subPath], targetPath.replace(/\/\//g, '/'));
        }
    }
}

shootFruits(pathTree)