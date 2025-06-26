// const nodemailer = require("nodemailer")
import nodemailer from "nodemailer"
import { Request} from 'express';
import jwt from "jsonwebtoken";

// declare module 'express-session' {
//     interface SessionData {
//         user?: string;
//     }
// }
function setCookie(uuid: string) {
    console.log(process.env.COOKIE_SECRET)
    return new Promise(async (resolve) => {
    if (uuid.length>0) {
        const newToken = await jwt.sign({uuid: uuid}, process.env.COOKIE_SECRET, {expiresIn: "7 days"})
        const payload = await jwt.verify(newToken, process.env.COOKIE_SECRET);
        console.log("This is what the payload looks like: ", payload);
        resolve(newToken)
    } else {
        resolve("no uuid provided")
    }
    })
}

function authenticateUser(req: Request) {
    return new Promise(async(resolve) => {
        // let sessionId = req.sessionID;
        console.log(process.env.COOKIE_SECRET)
        const token = req.headers?.authorization
        console.log("this is the token", token);
        // console.log("This is what a token looks like: ", token);
        if (token) {
            try {
                const payload = await jwt.verify(token, process.env.COOKIE_SECRET);
                console.log("This is what the payload looks like: ", payload);
                resolve(payload.uuid)
            } catch(e) {

                console.log("error in verifying the token")
                resolve("No user found");
                console.log(e);
                
            }
        } else {
            resolve("No user found");
        }




        // if (!sessionId) {
        //     resolve("No user found");
        // } else {
        //     req.sessionStore.get(sessionId, (err, session: any) => {
        //         if (err) {
        //             console.log(err);
        //             resolve("No user found");
        //         } else {
        //             if (!session) {
        //                 resolve("No user found");
        //             } else {
        //                 const currentUser = session?.user;
        //                 if (!currentUser) {
        //                     resolve("No user found");
        //                 } else {
        //                     resolve(currentUser);
        //                 }
        //             }
        //         }
        //     });
        // }
    });
}


async function sendEmail(to: string, subject: string, text: string) {
    return new Promise(async (resolve) => {

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
              // TODO: replace `user` and `pass` values from <https://forwardemail.net>
              user: process.env.EMAIL_SENDER,
              pass: process.env.EMAIL_PASSWORD
            }
          });
        if ( (to.length>0) && (subject.length>0) && (text.length>0) ) {
    
            const info = await transporter.sendMail({
                from: process.env.EMAIL_SENDER, // sender address
                to: to, // list of receivers
                subject: subject, // Subject line
                text: text  
            });
    
            resolve(true);
        } else {
            resolve(false);
        }
    })
   
}



async function reportError(err) {
    if (err.length>0&&process.env.EMAIL_PERSONAL) {
        await sendEmail(process.env.EMAIL_PERSONAL, "Report Bug #", err);
        return true;
    } else {
        return false;
    }
}



function isEmail(email: string) {
    
    let passedTests = true;




    if (email.split("@").length !== 2) {
        passedTests = false;
    } else if (
        email.length<4
    ) {
        passedTests = false;
    } else if (
        email.length>40
    ) {
        passedTests = false;
    }


    return passedTests;


}

function isPassword(password: string) {


    let passedTests = true;

    if (password.length<4) {
        passedTests = false;

    } else if (password.length>15) {
        passedTests = false;

    } 

    return passedTests;

}


function isString(s: string, lengthLimit=1000000) {


    const string = String(s);
    for (let i=0; i<string.length; i++) {
        if (!/^[a-zA-Z]$/.test(string[i])) {
            return false;
        }


    }

    if (string.length<lengthLimit) {
        return true
    } else {
        return false;
    }
}


function isNumber(number: string, lengthLimit=100000) {
    

    const string = String(number);
    for (let i=0; i<string.length; i++) {
        if (isNaN(Number(string[i]))) {
            return false;
        }


    }

    if (string.length<lengthLimit) {
        return true
    } else {
        return false;
    }


}



function generateCode(length: number) {
    
    let code = ""; // Initialize code as an empty string
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    for (let i = 0; i < length; i++) {
        code += String(numbers[Math.floor(Math.random() * numbers.length)]); // Fix off-by-one error
    }

    return code;
}



function craftRequest(code: number,body: object) {
    if ((code === 403) || (code === 404) || (code === 400)) {
        return JSON.stringify({
            code: "err",
            message: JSON.stringify(body) ||"invalid request"
        })
        
    } else if (code === 200) {
        return JSON.stringify({
            code: "ok",
            message: JSON.stringify(body)||"success"
        })
    } else if (code === 307) {
        return JSON.stringify({
            code: "ok",
            message: JSON.stringify(body)||"login"
        })
    } 
    else {
        "code not found"
    }
}









module.exports = {authenticateUser,isNumber, reportError, sendEmail, isEmail, isPassword, craftRequest,isString, setCookie, generateCode};