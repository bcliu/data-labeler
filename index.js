var express = require('express');
var mysql = require('mysql');
var multer  = require('multer');
var bodyParser = require('body-parser');
var fs = require('fs');
var csv = require('csv-parser');

var done = false;

var app = express();
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

app.use(multer({ dest: './uploads/' }).single('file'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
	res.send('hello world');
});

app.get('/import', function (req, res) {
    res.render('import.html');
});

/* Import file */
app.post('/import', function (req, res) {
    var connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'data_labeler'
    });

    fs.createReadStream(req.file.path).pipe(csv()).on('data', function (data) {
        connection.connect();
        var query = connection.query('INSERT INTO data SET ?', data, function (err, result) {
            if (err) {
                console.log(err);
            }
            connection.end();
        });
    });
    res.send("success!");
});

app.listen(3000);