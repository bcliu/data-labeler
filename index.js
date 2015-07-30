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

    var finishedQueries = 0;

    var finalFun = function () {
        var unionQuery = "";
        clusterCounts.forEach(function (val, index, arr) {
            console.log("Cluster " + index + ": already labeled " + clusterAlreadyLabeledCounts[index]);
            var limit = Math.floor(val * SAMPLING_PERCENTAGE) - clusterAlreadyLabeledCounts[index];
            if (limit <= 0) {
                return;
            }
            unionQuery += '(SELECT * FROM data WHERE cluster = "' + index + '" AND is_spam IS NULL limit ' + limit + ')';
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
    };

    /* Note that this query gets executed before the one above */
    connection.query('SELECT DISTINCT(cluster) FROM data', function(err, rows, fields) {
        if (err) {
            console.log(err);
            return;
        }

        var expectedQueries = rows.length * 2;

        rows.forEach(function (val, index, arr) {
            connection.query('SELECT COUNT(*) FROM data WHERE cluster = "' + val.cluster + '"', function (err, result) {
                if (err) {
                    console.log(err);
                    return;
                }
                clusterCounts[val.cluster] = result[0]['COUNT(*)'];

                finishedQueries++;
                if (finishedQueries == expectedQueries) finalFun();
            });
        });

        rows.forEach(function (val, index, arr) {
            connection.query('SELECT COUNT(*) FROM data WHERE cluster = "' + val.cluster + '" AND is_spam IS NOT NULL', function (err, result) {
                if (err) {
                    console.log(err);
                    return;
                }
                clusterAlreadyLabeledCounts[val.cluster] = result[0]['COUNT(*)'];

                finishedQueries++;
                if (finishedQueries == expectedQueries) finalFun();
            });
        });
    });
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
    fs.createReadStream(req.file.path).pipe(csv()).on('data', function (data) {
        if (!('id' in data) || !('account_sid') in data || !('body' in data) || !('cluster' in data)) {
            /* This can't be caught as it's async. Still trying to figure out a way... */
            throw "CSV file must contain all the columns: id, account_sid, body, cluster.";
        }
        /* Check format here */
        connection.query('INSERT INTO data SET ?', data, function (err, result) {
            if (err) {
                throw err;
            }
        });
    });
    res.send("Imported successfully");
});

app.listen(1234);