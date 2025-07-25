require('dotenv').config()
// npm i express https cors fs body-parser express-session uuid memorystore @aws-sdk/lib-dynamodb @aws-sdk/client-dynamodb md5 cryptr

const {authenticateUser, isEmail, isPassword, isString, isNumber, reportError, craftRequest, setCookie, sendEmail, generateCode} = require('./functions.js');

const express = require("express");
// const https = require("https");
import https from "https";
import http from "http"
import cors from "cors"
import { v4 } from "uuid";


import fs from "fs"
import { Request, Response, NextFunction } from 'express';
// const md5 = require('md5');
import md5 from "md5"

import bodyParser from "body-parser"
// const bodyParser = require("body-parser")
const app = express();
const region: string = "us-east-1"
// const session = require("express-session");
// @ts-ignore
// import session from "express-session"

import {locateEntry, addEntry, updateEntry} from "./databaseFunctions.js"
// ...existing code...
// Use require for memorystore if import fails

// const MemoryStore = require("memorystore")(session);
// ...existing code...

// const bcrypt = require("bcrypt");
import bcrypt from "bcryptjs"

// const Cryptr = require('cryptr');
import Cryptr from "cryptr"

const saltRounds = 10;
import type { Options, RegisterBody, User, LoginBody, CodeBody, LocateEntryEntry } from "./types.ts";
if (!process.env.ENCRYPTION_KEY) {
    throw new Error("Encryption key isn't set. Add it now.");
}
const cmod = new Cryptr(process.env.ENCRYPTION_KEY);

// Things to do

const SCHEMA = ['name','email','password']

// Basic web server configurations
let options: Options;
// if (process.env.NODE_ENV === "DEV") {
//     process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

//     // development certificate
//     options = {
//         key: fs.readFileSync('C:\\Users\\marac\\code\\hackathon-quhacks\\key.pem'),
//         cert: fs.readFileSync('C:\\Users\\marac\\code\\hackathon-quhacks\\cert.pem'),
//         // Remove this line once done with production
//         rejectUnauthorized: false
//     };    
//     // Local host
//     app.use(cors({
//         origin: "http://localhost:5173",
//         methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//         credentials: true
//     }));
    
// } else {

//     // STEP 1: This will be where the certificates are stored.

//     options = {
//         key: fs.readFileSync('C:\\Program Files\\Git\\usr\\bin\\key.pem'),
//         cert: fs.readFileSync('C:\\Program Files\\Git\\usr\\bin\\certificate.pem'),
//         // Remove this line once done with production
//         rejectUnauthorized: false
//     };    

//     app.use(cors({
//         origin: process.env.PROD_URL,
//         methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//         credentials: true
//     }));
//     // prod credentials


// }


// Setting up cookies
// app.use(session({
//     secret: process.env.COOKIE_SECRET as string,
//     cookie: {
//         path: "/",
//         maxAge: 2628000000,
//         httpOnly: true,     
//         sameSite: "none",
//         secure: true,
//     },
//     resave: false,
//     saveUninitialized: true,
//     store: new MemoryStore({
//         checkPeriod: 86400000 
//     }) as any, 
// }));

// Setting up body parser
app.use(bodyParser.json({limit: "10mb"}))


// Middleware to process tokens

// app.use(function(req: Request, res: Response, next: NextFunction) {






// })




const server = http.createServer(app)








app.get("/", (req: Request, res: Response) => {
    res.send("new year new me")
})





app.post('/register', async (req: Request, res: Response) => {
    // These are where the checks are. 
    


    // You need to add a variable name for every single thing you are trying to do.
    try {
        const {name, email, password} : RegisterBody = req.body;



        if (password && email && name) {

            console.log("we got here?", isEmail(email))
            console.log("this is here", isPassword(password));
            console.log("this happened as well", typeof name === "string");
            if (isEmail(email) && isPassword(password) && typeof name === "string") {
                console.log("got here")
                // then we should check if the user exists or not
                
                await locateEntry("emailHash", md5(email.toLowerCase())).then((users: "" | User | User[]) => {
                    console.log("this is users", users)
                    if (Array.isArray(users) && users.length > 0) {
                        // This would only occur when this user already exists
                        res.status(307).send(craftRequest(307))
                    } else {
                        const user = Array.isArray(users) ? users[0] : users;

                        if (user) {
                            res.status(307).send(craftRequest(307));
                        } else {
                            let newUser = {};
                            const allKeys = Object.keys(req.body);
                            allKeys.forEach((key) => {

                                if (SCHEMA.includes(key)) {
                                    if (key.toLowerCase() !== "password") {
                                        newUser = {[key]: cmod?.encrypt(req.body[key].trim().toLowerCase())}
                                    }
                                }
                            })

                            const uuid = v4();
                            // We should encrypt the password here
                            // We should maybe add some type safety here
                            bcrypt.hash(password, saltRounds, async(err,hash) => {

                                if (err) {
                                    reportError(err);
                                    console.log(err)
                                    res.status(404).send(craftRequest(404));

                                } else {

                                    if (hash) 
                                    addEntry({ 
                                        uuid: uuid,
                                        name: name,
                                        emailHash: md5(email.trim()),
                                        email: cmod?.encrypt(email.trim()),
                                        password: hash,
                                        ...newUser,
                                    })
                                    else {
                                        res.status(400).send(craftRequest);
                                        return;
                                    }
                                    
                                    const token = await setCookie(uuid);
                                    console.log("token", token)
                                    res.status(200).send(craftRequest(200,{token: token}));
                                }

                            })
                            // addEntry(newUser);
                        }
                    }
                })
    
    
    
            } else {
                res.status(400).send(craftRequest(400));
            }

        } else {
            console.log("we didnt get here")
            res.status(400).send(await craftRequest(400));
        }
    } catch(e) {
        console.log(e);
    }
})

app.post("/login", async (req: Request, res: Response) => {
    try {
        const { email, password }: LoginBody = req.body;

        if (!isEmail(email) || !isPassword(password)) {
            return res.status(403).send(craftRequest(403));
        }

        // emailHash lookup returns an array
        const users = await locateEntry("emailHash", md5(email)) as User[];

        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).send(craftRequest(400));
        }

        // uuid lookup returns a single User
        const user = await locateEntry("uuid", users[0].uuid) as User;

        
        if (!user || typeof user !== "object" || !user.password) {
            return res.status(400).send(craftRequest(400));
        }

        bcrypt.compare(password, user.password, async (err, result) => {
            if (err || !result) {
                return res.status(400).send(craftRequest(400));
            }
            console.log(user)
            console.log('this is the uuid', user.uuid)
            const token = await setCookie(user.uuid);
            return res.status(200).send(craftRequest(200, { token }));
        });

    } catch (e) {
        reportError(e);
        res.status(400).send(craftRequest(400));
    }
});


app.get("/getUser", (req: Request,res: Response) => {

    authenticateUser(req).then((user: string) => {
        if (user === "No user found") {
            res.status(403).send(craftRequest(403));
        } else {
            
            locateEntry("uuid", user).then((user) => {
                // console.error(users);

                if (user) {
                    res.status(200).send(craftRequest(200,user))
                } else {
                    res.status(400).send(craftRequest(400));
                }
                // if (users.length>0) {
                //     const user = users[0];

                //     console.log(user);
                //     res.status(200).send(craftRequest(200,user));

                // } else {
                //     console.log("log",users)
                //     res.status(200).send(craftRequest(200,user))
                // }
            })



        }
    })


})






app.post("/reportError", (req: Request,res: Response) => {
    try {   
        const {latitude, longitude, type} = req.body;
        authenticateUser(req).then((id: string) => {
            console.log("id", id)
            if (id === "No user found") {
                res.status(403).send(craftRequest(403))
            } else {
                console.log("got here")
               locateEntry("uuid", id).then((thing: LocateEntryEntry) => {

                console.log(thing)
                console.log("too much aura.")
                const email = `New Error... \n\nLatitude: ${latitude} \n\nLongitude: ${longitude} \n\nType: ${type}`

                sendEmail(process.env.EMAIL_PERSONAL, "Error Message for parking app", email)
                res.status(200).send(craftRequest(200))


               })
            }
        })




    } catch(e) {
        console.log(e);
    }




})




// app.post("/changeSettings", (req,res) => {

//     try {

//         // const {...x} = req.body;
//         // console.log("req",req.body);
//         authenticateUser(req).then((id: string) => {

//             if (id === "No user found") {
    
//                 res.status(403).send(craftRequest(403))
//             } else {
                
//                 locateEntry("uuid", id).then((user: LocateEntryEntry) => {
//                     if (user !== ""&&!Array.isArray(user)) {
                        

//                         const changedUser: any = {}
//                         console.log(Object.keys(user))

//                         Object.keys(user).map((key) => {
//                             console.log("ajdsf", key)
//                             if ((key !== "email") && (key !== "emailHash") && (key !== "password")) {
//                                 if (Object.keys(req.body).includes(key.toLowerCase())) {
//                                     changedUser[key] = req.body[key];
//                                 }
//                             }
//                         })  


//                         console.log("changed user", changedUser)
//                         updateEntry("uuid", user?.uuid, changedUser).then((a) => {
//                             console.log("a", a);
//                             res.status(200).send(craftRequest(200));
//                         })
//                         return;
//                         // do something here
//                     } else {
//                         res.status(400).send(craftRequest(400));
//                     }
    
                    
//                 })
    
    
    
    
    
//             }
    
    
    
//         })


//     } catch(e) {


//         console.log(e)
//         reportError(e);
//         res.status(400).send(craftRequest(400));
//         return;

//     }
   


// })



// This won't work
// app.post("/sendCode", (req,res) => {
//     try {

//         const {email}: CodeBody = req.body;
        

//         if (isEmail(email)) {
//             locateEntry("emailHash", md5(email.trim())).then((users: LocateEntryEntry) => {
//                 // console.log("this is the",user)
//                 if (users !== ""&&Array.isArray(users)) {
//                     // console.log(user);
//                     const user = users[0]
//                     const code = generateCode(6)

//                     const text = `Hello,

// You have asked to reset your password. If this wasn't you, ignore this email.

// Your code is: ${code}`

//                     // bookmark
//                     console.log(user)
//                     updateEntry("uuid", user.uuid, {passwordCode: code}).then((response: boolean) => {
//                         if (response) {
//                             sendEmail(email.trim(), `Reset Password - ${process.env.COMPANY_NAME}`,text).then((alert: boolean) => {
//                                 if (alert) {
//                                     res.status(200).send(craftRequest(200));
//                                 } else {
//                                     res.status(400).send(craftRequest(400));
//                                 }
                            
//                             })
//                         } else {
//                             res.status(400).send(craftRequest(400));
//                         }
//                     })
                    


//                 } else {
//                     res.status(400).send(craftRequest(400));
//                 }
//             })


//         } else {
//             res.status(400).send(craftRequest(400));
//         }




//     } catch(e) {
//         console.log(e);
//         reportError(e);
//         res.status(400).send(craftRequest(400));
//     }
// })




// app.post("/changePassword", (req,res) => {
//     try {
//         const {code, password, email} = req.body;

//         console.log(isPassword(password))
//         console.log(isNumber(code))

//         if (isPassword(password) && isNumber(code)) {


//             const emailHash = md5(email);

            

//             locateEntry("emailHash", emailHash).then((users: LocateEntryEntry) => {
//                 if (Array.isArray(users)&&users.length>0) {
//                     const user = users[0];

//                     locateEntry("uuid", user.uuid).then((user: LocateEntryEntry) => {
//                         if (!Array.isArray(user)&&user !== "") {

//                             if (String(user.passwordCode) === String(code)) {


//                                 if (isPassword(password)) {
                                    
                                    
//                                     bcrypt.hash(password, saltRounds, function(err: any, hash: string) {
//                                     // Store hash in your password DB.

//                                         if (err) {
//                                             reportError(err);
//                                             res.status(400).send(craftRequest(400))
                                            
//                                         } else {
                                            
//                                             updateEntry("uuid",user.uuid,{password: hash}).then((x) => {
//                                                 res.status(200).send(craftRequest(200));
//                                             })
//                                         }
//                                     });
                                    


//                                 } else {
//                                     res.status(400).send(craftRequest(400, {status: "invalid password"}))
//                                 }



                            


//                             } else {
//                                 res.status(400).send(craftRequest(400, {status: "invalid code"}))
//                             }

//                         } else {

//                             res.status(400).send(craftRequest(400));


//                         }

//                     })




//                 } else {



//                     res.status(403).send(craftRequest(403));
//                 }
//             })

            





//         } else {
//             console.log(code);
//             console.log(password);
//             console.log(email);
//             res.status(400).send(craftRequest(400));
//         }

//     } catch(e) {
//         console.log(e);
//         reportError(e);
//         res.status(400).send(craftRequest(400));
//     }
// })











export default app;

// server.listen(process.env.PORT, () => {
//     console.log("Listening on port:", process.env.PORT)
// })






