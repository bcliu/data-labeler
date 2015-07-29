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

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'data_labeler'
});

app.get('/', function (req, res) {
    /* Pick 10% of messages out of each category */
    var clusterCounts = [];
    var clusterAlreadyLabeledCounts = [];

    connection.query('SELECT distinct(cluster) from data', function(err, rows, fields) {
        if (err) {
            console.log(err);
            return;
        }

        rows.forEach(function (val, index, arr) {
            connection.query('select count(*) from data where cluster = "' + val.cluster + '"', function (err, result) {
                if (err) {
                    console.log(err);
                    return;
                }
                clusterCounts[val.cluster] = result[0]['count(*)'];
            });
        });

        rows.forEach(function (val, index, arr) {
            connection.query('select count(*) from data where cluster = "' + val.cluster + '" and is_spam != NULL', function (err, result) {
                if (err) {
                    console.log(err);
                    return;
                }
                clusterAlreadyLabeledCounts[val.cluster] = result[0]['count(*)'];
            });
        });
    });

    /* This is bad */
    setTimeout(function () {
        clusterCounts.forEach(function (val, index, arr) {
            var limit = Math.floor(val * 0.01) - clusterAlreadyLabeledCounts[index];
            if (limit <= 0) {
                return;
            }
            connection.query('select * from data where cluster = "' + index + '" and is_spam is NULL limit ' + limit, function (err, result) {
                res.send(result);
            });
        });
    }, 3000);
});

app.get('/import', function (req, res) {
    res.render('import.html');
});

/* Import file */
app.post('/import', function (req, res) {
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