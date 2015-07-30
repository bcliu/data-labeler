var SAMPLING_PERCENTAGE = 0.01;

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
app.set('view engine', 'ejs');

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
        var unionQuery = "";
        clusterCounts.forEach(function (val, index, arr) {
            var limit = Math.floor(val * SAMPLING_PERCENTAGE) - clusterAlreadyLabeledCounts[index];
            if (limit <= 0) {
                return;
            }
            unionQuery += '(select * from data where cluster = "' + index + '" and is_spam is NULL limit ' + limit + ')';
            if (index != arr.length - 1) {
                unionQuery += ' UNION ';
            }
        });
        connection.query(unionQuery, function (err, result) {
           if (err) {
                console.log(err);
            }
            console.log("Loaded " + result.length + " messages for labeling");
            res.render('index', { data: JSON.stringify(result) });
        });
    }, 3000);
});

app.get('/import', function (req, res) {
    res.render('import.html');
});

app.post('/label', function (req, res) {
    var id = req.body.id;
    var isSpam = req.body.isSpam;
    
    console.log("Setting " + id + " is_spam to " + isSpam);
    connection.query('UPDATE data SET is_spam = ' + isSpam + ' WHERE id = "' + id + '"', function (err, result) {
        if (err) {
            console.log(err);
        }
        res.send('success');
    });
});

/* Import file */
app.post('/import', function (req, res) {
    var count = 0;
    fs.createReadStream(req.file.path).pipe(csv()).on('data', function (data) {
        /* Check format here */
        connection.query('INSERT INTO data SET ?', data, function (err, result) {
            if (err) {
                console.log(err);
            }
        });
        count++;
    });
    res.send(count + " messages imported successfully");
});

app.listen(3000);
