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
    fs.createReadStream(req.file.path).pipe(csv()).on('data', function (data) {
        var connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'data_labeler'
        });
        connection.connect();

        var error;
        var query = connection.query('INSERT INTO data SET ?', data, function (err, result) {
            if (err) {
                error = err;
                return;
            }
        });

        if (error) {
            res.send(error);
        } else {
            res.send('Success!');
        }
        connection.end();
    });
});

// connection.query('SELECT * from unlabeled', function(err, rows, fields) {
//     if (!err)
//         console.log('The solution is: ', rows);
//     else
//         console.log('Error while performing Query.');
// });

app.listen(3000);