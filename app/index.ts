import express from 'express';
import hbs from 'express-handlebars';
import http from 'http';
import path from 'path';
import {fileURLToPath} from 'url';
import * as helpers from '../helpers/helpers.js'
//import {Controller} from "./entities/controller.js";
import db from 'mariadb';

// get current filename and directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// setup our server data
const PORT = 8000;
const HOST = 'localhost';

// setup express
const server_root = path.resolve(__dirname, '../public');
const server_views = path.resolve(__dirname, '../views');
const server_attachments = path.resolve(__dirname, '../uploads');
const app = express();
const handlebars = hbs.create({
    layoutsDir: server_views + '/layouts',
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: helpers
});
// handlebars setup
app.engine('.hbs', handlebars.engine);
app.set('view engine', '.hbs');
app.set('views', server_views);
app.use(express.urlencoded({extended: false}));
app.use(express.json())
app.use(express.static(server_root));
app.use('/attachments', express.static(server_attachments))

//create db connection
const pool = db.createPool({
    host: "192.168.56.103",
    user: "andmin",
    password: "1234567890",
    database: "db_bank"
});

(async () => {
    var res = await pool.query('show tables;');
    console.log("DB tables:");
    console.log(res);
})();

// create server
const server = http.createServer(app);

const clients: any[] = [
    {
        "id": "1",
        "surname": "Иванов",
        "name": "Иван",
        "patronymic": "Иванович",
        "birthdate": "1990-01-01",
        "gender": "Мужской",
        "passportSeries": "AB",
        "passportNumber": "123456",
        "issuedBy": "Отделом УФМС России",
        "issueDate": "2015-10-05",
        "identificationNumber": "12345678901234567890",
        "placeOfBirth": "Москва",
        "residenceCity": "Москва",
        "residenceAddress": "ул. Пушкина, д. 10, кв. 5",
        "homePhone": "+7 (123) 456-78-90",
        "mobilePhone": "+7 (987) 654-32-10",
        "email": "ivanov@example.com",
        "registrationCity": "Москва",
        "maritalStatus": "single",
        "citizenship": "Россия",
        "disability": "n",
        "pensioner": "n",
        "monthlyIncome": "1500",
        "militaryService": "y"
    }
]

app.get('/', (req,res) => {
    res.render('main.hbs', {layout : 'index'});
});
app.get('/add_client',(req,res) => {
    res.render('add_client.hbs', {layout : 'index'});
});
app.post('/add_client', (req, res) => {
    // Retrieve form data from request body
    const formData = Object.assign({}, req.body);
    console.log(req.body);

    const index = clients.findIndex(client =>
        (client.passportSeries === formData.passportSeries && client.passportNumber === formData.passportNumber) ||
        client.identificationNumber === formData.identificationNumber
    );
    if (index !== -1) {
        return res.render('add_client.hbs', {layout : 'index', error: true});
    }

    formData.id = parseInt(clients[clients.length - 1]?.id) + 1 ?? 1;
    clients.push(formData);

    // Process the form data as needed
    // For example, you can access formData.mobilePhone, formData.surname, etc.

    // Send a response back to the client
    //res.status(200).send('Form submitted successfully!');
    res.render('add_client.hbs', {layout : 'index', error: false, client: formData});
});

app.get('/deposit',(req,res) => {
    res.render('deposit.hbs', {layout : 'index'});
});
app.post('/deposit',(req,res) => {
    const formData = req.body;
    console.log(formData);
    res.render('deposit.hbs', {layout : 'index', error: false});
});
app.get('/credit',(req,res) => {
    res.render('credit.hbs', {layout : 'index'});
});
app.post('/credit',(req,res) => {
    const formData = req.body;
    console.log(req.body);
    res.render('credit.hbs', {layout : 'index', error: false});
});

app.get('/accounts', async (req,res) => {

    res.render('accounts.hbs', {
        layout : 'index',
        accounts: [
            {
                "surname": "Иванов",
                "name": "Иван",
                "patronymic": "Иванович",
                "debit": "1000",
                "credit": "500",
                "balance": "500",
                "type": "Active",
                "balanceNo": "XXXX",
                "clientNo": "00001",
                "accountNo": "001",
                "controlNo": "X"
            }
        ]
    });
});
app.get('/clients', async (req,res) => {
    var sql = await pool.query('select Accounts.*, pob.name_city as pob, res.name_city as res, reg.name_city as reg, ctzn.name_country as ctzn from Accounts join Cities as pob on Accounts.placeOfBirth = pob.id_city join Cities as res on Accounts.residenceCity = res.id_city join Cities as reg on Accounts.registrationCity = reg.id_city join Countries as ctzn on Accounts.citizenship = ctzn.id_country;');
    sql.forEach((entry:any) => {
        var d:Date = new Date(entry.birthdate);
        entry.birthdate = d.toLocaleDateString();

        d = new Date(entry.issueDate);
        entry.issueDate = d.toLocaleDateString();

        entry.disability = (entry.disability == 'y') ? "да" : "нет";
        entry.pensioner = (entry.pensioner == 'y') ? "да" : "нет";
        entry.mil_status = (entry.mil_status == 'y') ? "да" : "нет";

    });
    res.render('clients.hbs', {
        layout : 'index',
        clients: sql
    });
});
app.delete('/clients/:id', (req, res) => {
    const id = parseInt(req.params.id);

    console.log(`client delete request ${id}`)

    // Find the index of the client with the specified ID
    // const index = -1; // TODO db request clients.findIndex(client => client.id === id);
    const index = clients.findIndex(client => parseInt(client.id) === id);
    console.log(`index ${index}`)

    // If client with the specified ID is found, delete it
    if (index !== -1) {
        clients.splice(index, 1);
        res.render('clients.hbs', {
            layout : 'index',
            clients: clients,
            error: false
        });
    } else {
        // If client with the specified ID is not found, return 404 Not Found
        res.status(404).json({ error: `Client with ID ${id} not found` });
    }
});
app.get('/edit_client/:id', (req, res) => {
    const id = parseInt(req.params.id);
    console.log(`client edit request ${id}`)
    // get client data by id
    const client = clients[id - 1]

    if (!client) {
        return res.status(404).render('404.hbs', {layout : 'index'});
    }

    res.render('add_client.hbs', {
        layout : 'index',
        client: client
    });
});
app.post('/edit_client/:id', (req, res) => {
        const id = parseInt(req.params.id);
        console.log(`client fuck request ${id}`)
        // get client data by id
        const client = Object.assign({}, req.body);
        client.id = id // >??????
        // if success
        clients[id-1] = client
        //res.redirect(`/clients`);
        res.render('add_client.hbs', {layout : 'index', error: false, client: client});
    }
);

// 404
app.all('*', function(req, res){
    res.status(404).render('404.hbs', {layout : 'index'});
});

// enable
server.listen(PORT, HOST, () => {
    console.log(`Server is running on ${HOST}:${PORT}`);
});