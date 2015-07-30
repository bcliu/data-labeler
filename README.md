# Messages manual labeler

### Setup

Install node.js and npm on Mac with Homebrew:
```sh
$ brew install node
```

Install dependencies:
```sh
$ cd data-labeler
$ npm install
```

Import MySQL schema:
```sh
$ mysql -u YOUR_MYSQL_USERNAME -p YOUR_MYSQL_PASSWORD < schema.sql
```

Start server:
```sh
$ node index.js
```

Go to http://localhost:1234/import to import the CSV file, then go to http://localhost:1234 to start manual labeling.
