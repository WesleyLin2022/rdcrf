var express = require('express');
var router = express.Router();

router.get('/hello', function(req, res, next) {
  res.send("Hello myRoute");
});

router.post('/sum', function(req, res, next) {
	var n1 = parseInt(req.body.num1);
	var n2 = parseInt(req.body.num2);
	var sum = n1 + n2;
    res.json({mySum : sum});
});

router.get('/sum2', function(req, res, next) {
	var n1 = parseInt(req.query.n1);
	var n2 = parseInt(req.query.n2);
	var sum = n1 + n2;
	res.json({Total:sum});
});

module.exports=router;