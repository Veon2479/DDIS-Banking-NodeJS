import express from 'express';
import hbs from 'express-handlebars';
import http from 'http';
import path from 'path';
import {fileURLToPath} from 'url';
import * as helpers from '../helpers/helpers.js'

//import {Controller} from "./entities/controller.js";
import db from 'mariadb';

function padTo2Digits(num: number) {
    return num.toString().padStart(2, '0');
}
function format(date: Date) {
    return [
        padTo2Digits(date.getDate()),
        padTo2Digits(date.getMonth() + 1),
        date.getFullYear(),
    ].join('.');
}

// get current filename and directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// setup our server data
const PORT = 8000;
const HOST = 'localhost';

let date = new Date();

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

function convertMariadbTimestamp(mariadbTimestamp: string): string {
    // Преобразование временной метки Mariadb в объект Date
    const date: Date = new Date(mariadbTimestamp);

    // Получение дня, месяца и года из объекта Date
    const day: number = date.getDate();
    const month: number = date.getMonth() + 1; // Месяцы в JavaScript начинаются с 0
    const year: number = date.getFullYear();

    // Форматирование дня, месяца и года с добавлением ведущих нулей, если нужно
    const formattedDay: string = (day < 10) ? `0${day}` : day.toString();
    const formattedMonth: string = (month < 10) ? `0${month}` : month.toString();

    // Получение временной метки в формате dd/mm/yyyy
    const formattedTimestamp: string = `${year}-${formattedMonth}-${formattedDay}`;

    return formattedTimestamp;
}

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
        "placeOfBirth": "1",
        "residenceCity": "1",
        "residenceAddress": "ул. Пушкина, д. 10, кв. 5",
        "homePhone": "+7 (123) 456-78-90",
        "mobilePhone": "+7 (987) 654-32-10",
        "email": "ivanov@example.com",
        "registrationCity": "1",
        "maritalStatus": "single",
        "citizenship": "1",
        "disability": "n",
        "pensioner": "n",
        "monthlyIncome": "1500",
        "militaryService": "y"
    }
]

app.get('/', (req,res) => {
    res.render('main.hbs', {layout : 'index'});
});
app.get('/time_machine',(req,res) => {
    // @ts-ignore
    res.render('time_machine.hbs', {layout : 'index', date: format(date)});
});
app.post('/time_machine',(req,res) => {
    const {time} = req.body
    const dt = parseInt(time)
    //
    // TODO call DB to process each month of payments
    //
    date = new Date(date.getFullYear(), date.getMonth() + dt, date.getDate());
    // @ts-ignore
    res.render('time_machine.hbs', {layout : 'index', date: format(date)});
});
app.get('/add_client',async (req,res) => {
    const cities = await pool.query('select * from Cities');
    const countries = await pool.query('select * from Countries');
    res.render('add_client.hbs', {layout : 'index', cities: cities, countries:countries});
});
app.post('/add_client', async (req, res) => {
    // Retrieve form data from request body
    const formData = Object.assign({}, req.body);
    // console.log(req.body);

    var cls = await pool.query('select * from Accounts;');
    const index = cls.findIndex((client: { passportSeries: any; passportNumber: any; identificationNumber: any; }) =>
        (client.passportSeries === formData.passportSeries && client.passportNumber === formData.passportNumber) ||
        client.identificationNumber === formData.identificationNumber
    );
    if (index !== -1) {
        return res.render('add_client.hbs', {layout : 'index', error: true, client: formData});
    }

    await pool.query('insert into Accounts(surname, name, patronymic, birthdate, passportSeries, passportNumber, issuedBy, issueDate, identificationNumber, placeOfBirth, residenceCity, residenceAddress, homePhone, mobilePhone, email, maritalStatus, citizenship, disability, pensioner, monthlyIncome, mil_status, place_of_work, work_role) values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [formData.surname, formData.name, formData.patronymic, formData.birthdate, formData.passportSeries, formData.passportNumber, formData.issuedBy, formData.issueDate, formData.identificationNumber, formData.placeOfBirth, formData.residenceCity, formData.residenceAddress, formData.homePhone, formData.mobilePhone, formData.email, formData.maritalStatus, formData.citizenship, formData.disability, formData.pensioner, formData.monthlyIncome, formData.mil_status, formData.place_of_work, formData.work_role]);

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
                "surname": "",
                "name": "СФРБ",
                "patronymic": "Банка",
                "debit": "-0",
                "credit": "+0",
                "balance": "0",
                "type": "Passive",
                "balanceNo": "BBBB",
                "clientNo": "00000",
                "accountNo": "000",
                "controlNo": "B"
            },
            {
                "surname": "",
                "name": "Касса",
                "patronymic": "Банка",
                "debit": "+0",
                "credit": "-0",
                "balance": "0",
                "type": "Active",
                "balanceNo": "BBBB",
                "clientNo": "00000",
                "accountNo": "001",
                "controlNo": "B"
            }
        ]
    });
});
app.get('/clients', async (req,res) => {
    var sql = await pool.query('select Accounts.*, res.name_city as res, ctzn.name_country as ctzn from Accounts join Cities as res on Accounts.residenceCity = res.id_city join Countries as ctzn on Accounts.citizenship = ctzn.id_country;');
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
app.delete('/clients/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    console.log(`client delete request ${id}`)

    var ids = await pool.query('select id from Accounts where id = ?;', id);

    if (ids.length > 0) {
        await pool.query('delete from Accounts where id = ?', id);
        res.render('clients.hbs', {
            layout : 'index',
            clients: clients,
            error: false
        });
    } else {
        res.status(404).json({ error: `Client with ID ${id} not found` });
    }
});
app.get('/edit_client/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    console.log(`client edit request ${id}`)
    // get client data by id
    // const client = clients[id - 1]
    var client = await pool.query('select * from Accounts where id = ?;', id);

    if (client.length == 0) {
        return res.status(404).render('404.hbs', {layout : 'index'});
    }

    const cities = await pool.query('select * from Cities;');
    const countries = await pool.query('select * from Countries;');

    client[0].birthdate = convertMariadbTimestamp(client[0].birthdate);
    client[0].issueDate = convertMariadbTimestamp(client[0].issueDate);

    console.log(client[0]);
    console.log("entering edit mode");
    res.render('add_client.hbs', {
        layout : 'index',
        client: client[0],
        cities: cities,
        countries: countries
    });
});
app.post('/edit_client/:id', async (req, res) => {
        const id = parseInt(req.params.id);
        console.log(`client fuck request ${id}`)
        // get client data by id
        const formData = Object.assign({}, req.body);
        var data:any = await pool.query('select id from Accounts where id = ?;', id)
        const cities = await pool.query('select * from Cities;');
        const countries = await pool.query('select * from Countries;');
        if (data.length > 0)
        {
            await pool.query('update Accounts SET surname = ?, name = ?, patronymic = ?, birthdate = ?, passportSeries = ?, passportNumber = ?, issuedBy = ?, issueDate = ?, identificationNumber = ?, placeOfBirth = ?, residenceCity = ?, residenceAddress = ?, homePhone = ?, mobilePhone = ?, email = ?, maritalStatus = ?, citizenship = ?, disability = ?, pensioner = ?, monthlyIncome = ?, mil_status = ?, place_of_work = ?, work_role = ? WHERE id = ?', [formData.surname, formData.name, formData.patronymic, formData.birthdate, formData.passportSeries, formData.passportNumber, formData.issuedBy, formData.issueDate, formData.identificationNumber, formData.placeOfBirth, formData.residenceCity, formData.residenceAddress, formData.homePhone, formData.mobilePhone, formData.email, formData.maritalStatus, formData.citizenship, formData.disability, formData.pensioner, formData.monthlyIncome, formData.mil_status, formData.place_of_work, formData.work_role, id]);

            res.render('add_client.hbs', {layout : 'index', error: false, client: formData, cities:cities, countries:countries});
        }
        else
        {
            res.render('add_client.hbs', {layout : 'index', error: true, client: formData, cities:cities, countries:countries});
        }
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