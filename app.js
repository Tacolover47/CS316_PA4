//Michael White CS316 04/14/2020

const express = require('express');
const path = require('path');
const conf = require('conf');
const handlebars = require('express-handlebars');
const uuid = require('uuid')

// create our express app
const app = express();

// create our data store for user information
const data = new conf();

// clear the data store for debugging 
//data.clear();

// prints out what is currently being stored
console.log(data.store);

//setup handlebars templating engine
const handlebars_instance = handlebars.create({
    extname: '.handlebars',
    compilerOptions: {
        preventIndent: true
    },
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'views', 'partials')
});
app.engine('handlebars', handlebars_instance.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views', 'pages'))

app.use(express.json());

app.use(express.urlencoded({
    extended: false
}));

// setup static location for styling 
app.use('/assets', express.static(path.resolve(__dirname, 'assets')));

let current_user;

// login router
app.route('/user/login')
    .get((req, res) => {
        // render the login page
        res.status(200).render('login');
    })
    .post((req, res) => {
        // information sent in the post request
        console.log(req.body);

        //try to get user from data store    
        const user = data.get(req.body.username);

        //Check if the user exists
        if (user === undefined || user.password !== req.body.password) {
            res.status(401).render('login', {
                alert: {
                    level: 'warning',
                    title: '401 Authentication error',
                    message: 'username/password pair not found'
                }
            });
        } else {
            current_user = user.username;
            res.status(200).redirect("/user/" + user.user_id);
        }
    });
// new user router
app.route('/user/new')
    .get((req, res) => {
        // render sign up page
        res.status(200).render('new');
    })
    .post((req, res) => {
        // check if the email is already in the system
        let email_registered = false;
        for (const element of data) {
            let count = 0;
            for (const x of element) {
                if (count == 0) {
                    console.log(x);
                    const tempUser = data.get(x);
                    if (tempUser.email == req.body.email) {
                        email_registered = true;
                    }
                }
                count++;
            }
        }

        const user = data.get(req.body.username);
        //console.log(user);
        if (req.body.password !== req.body.verified_password) {
            res.status(401).render('new', {
                alert: {
                    level: 'warning',
                    title: 'Error',
                    message: 'passwords do not match'
                }
            });
        }
        else if (user !== undefined) {
            res.status(401).render('new', {
                alert: {
                    level: 'warning',
                    title: 'user',
                    message: 'username is already taken'
                }
            });
        }
        else if (email_registered) {
            res.status(401).render('new', {
                alert: {
                    level: 'warning',
                    title: 'user',
                    message: 'email is already taken'
                }
            });
        }
        else {
            data.set(req.body.username, {
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
                verified_password: req.body.verified_password,
                phone: req.body.phone,
                user_id: uuid.v4()
            });

            // successfully render the login page
            res.status(200).redirect('login');
        }
    });

app.route("/user/:user_id")
    .get((req, res) => {
        // check if the user is defined
        let findKey;
        for (const element of data) {
            let count = 0;
            for (const x of element) {
                if (count == 0) {
                    console.log('x: ' + x);
                    const tempUser = data.get(x);
                    console.log(tempUser.user_id);
                    console.log(req.params.user_id);
                    if (tempUser.user_id == req.params.user_id) {
                        findKey = tempUser.username;
                    }
                }
                count++;
            }
        }
        const user = data.get(findKey);
        console.log(user);
        if (!findKey) {
            res.status(404).render('404');
        }
        else {
            //if the user exists, render sign up page filled in with user's information
            res.status(200).render('account', {
                account: {
                    username: user.username,
                    email: user.email,
                    phone: user.phone
                }
            });
        }
        // is there another user if when updating the info is never valid
    })
    .post((req, res) => {
        // find user from their user_id
        let findKey;
        for (const element of data) {
            let count = 0;
            for (const x of element) {
                if (count == 0) {
                    //console.log('x: ' + x);
                    const tempUser = data.get(x);
                    //console.log(tempUser.user_id);
                    //console.log(req.params.user_id);
                    if (tempUser.user_id == req.params.user_id) {
                        findKey = tempUser.username;
                    }
                }
                count++;
            }
        }
        const user = data.get(findKey);
        const updated_user = data.get(req.body.username);
        // if username is updated verify it is not already in the data store
        // or the username did not change
        if (updated_user === undefined || updated_user.username === user.username) {
            console.log("While updating account username, username is not already taken");

            // find if the email is already registered
            let email_valid = true;
            for (const element of data) {
                let count = 0;
                for (const x of element) {
                    if (count == 0) {
                        console.log('x: ' + x);
                        const tempUser = data.get(x);
                        console.log(tempUser.user_id);
                        console.log(req.params.user_id);
                        // email is in the system and the email is not the same as previously
                        if (tempUser.email === req.body.email && tempUser.username !== user.username) {
                            email_valid = false;
                        }
                    }
                    count++;
                }
            }

            //check to see if email is already in the data store
            if (email_valid) {
                // update account information
                data.set(req.body.username, {
                    username: req.body.username,
                    email: req.body.email,
                    password: user.password,
                    verified_password: user.verified_password,
                    phone: req.body.phone,
                    user_id: user.user_id
                });
                // remove the 'old' user for the updated one
                if (user.username !== req.body.username) {
                    console.log("User to be replaced: ");
                    console.log(user);
                    data.delete(user.username);
                }
                // render account page with updated information
                res.render('account', {
                    account: {
                        username: req.body.username,
                        email: req.body.email,
                        phone: req.body.phone
                    },
                    alert: {
                        level: 'success',
                        title: '200',
                        message: 'Successfully updated your account information'
                    }
                });
            }
            else {
                console.log("The email entered is already taken")
                res.render('account', {
                    account: {
                        username: req.body.username,
                        email: req.body.email,
                        phone: req.body.phone
                    },
                    alert: {
                        level: 'warning',
                        title: 'Invailed email',
                        message: 'email is already in use'
                    }
                });
            }
        } else {
            console.log("While updating account username, username is already taken");
            res.render('account', {
                account: {
                    username: req.body.username,
                    email: req.body.email,
                    phone: req.body.phone
                },
                alert: {
                    level: 'warning',
                    title: 'Invailed username',
                    message: 'username is already in use'
                }
            });
        }
    });

app.listen(3000, () => {
    console.log('express app running at http://localhost:3000/user/')
});