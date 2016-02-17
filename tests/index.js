'use strict'
const request = require('supertest'),
    should = require('should'),
    restify = require('restify'),
    Router = require('../index'),
    server = restify.createServer({serverName: "Test restify-routing", serverVersion: "0.1.0"})

server.use(restify.queryParser())
server.use(restify.bodyParser())

function middleware(req, res, next){
    req.count = (req.count)?req.count+1:1;
    return next()
}

function fakeController (req, res){
    req.count = (req.count)?req.count+1:1;
    res.send(200, {count: req.count, path: req.route.path})
}
let pathTree = {
    middlewares:[
        {
            pattern: '*',
            callbacks: [
                middleware,
                middleware
            ]
        }
    ],
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
                    //middlewares:[
                    //    {
                    //        pattern: '*',
                    //        callbacks: [
                    //            middleware
                    //        ]
                    //    }
                    //],
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
router.applyRoutes(server)

// Test the logic of function 'isPathCompatibleWithPattern'
describe('function isPathCompatibleWithPattern', function(){
    let testCases = [
        { path: '/service/orderMeal', pattern: '/*/order*', expect: true} ,
        { path: '/service/orderMeal', pattern: '*', expect: true} ,
        { path: '/service/orderMeal', pattern: '/*', expect: true} ,
        { path: '/service/orderMeal', pattern: '/service/*', expect: true} ,
        { path: '/service/orderMeal', pattern: '/service*', expect: true} ,
        { path: '/service/orderMeal', pattern: '/service/ordermeal', expect: false} ,
        { path: '/service/orderMeal', pattern: '/*/', expect: false} ,
        { path: '/service/orderMeal', pattern: '*/', expect: false} ,
        { path: '/service/orderMeal', pattern: '*service*', expect: true}
    ];
    for(let test of testCases) {
        let exp = test.expect?'be':'NOT be';
        it("path '"+ test.path + "' should "+ exp + " compatible with pattern '" +test.pattern +"'", function () {
            router.isPathCompatibleWithPattern(test.path, test.pattern).should.be.exactly(test.expect);
        });
    }
});

// Test the path tree
function shootFruits(tree, path){
    if(!tree)return;
    let fruitPath = path || '/';

    describe('Route: '+path, function(){
        if(tree.allowedMethods){
            for(let method in tree.allowedMethods){
                if(typeof tree.allowedMethods[method] === 'function') {
                    let pathInstance =  fruitPath.replace(/:[a-zA-Z0-9]+/g, Math.random());
                   it("response to ["+method.toUpperCase() +"] path '" + pathInstance + "' should be 200", function(done){
                       request(server)[method]( pathInstance)
                           .expect(200)
                           .expect(function(res){
                               res.body.count.should.be.exactly(3);
                           })
                           .end(function(err){
                               if(err) return done(err);
                               else done();
                           })
                   })
                }
            }
        }
    });

    if(tree.subPaths){
        for(let subPath in tree.subPaths){
            let targetPath = fruitPath + '/' + subPath;
            shootFruits(tree.subPaths[subPath], targetPath.replace(/\/\//g, '/'));
        }
    }
}

shootFruits(pathTree)