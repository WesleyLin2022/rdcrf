var express = require('express');
var router = express.Router();

const DatabaseModel = require('../modules/DBModule.js') //引入module


router.post("/getPeerRecordCurrent", (req, res) => {
	const sql = `SELECT colleague_score_record.*, kpi.* FROM colleague_score_record JOIN kpi ON colleague_score_record.kpi_sn = kpi.serial_number 
	                    WHERE colleague_score_record.rater_id = ? AND kpi.year = ? AND kpi.month = ?`;
	const params = [req.body.id, req.body.year, req.body.month];
	try {
	    DatabaseModel.query(sql, params, function (err, results, fields) {
            if (err) {
				res.json({status:1, message:err});
			}
			else {
				res.json({status:0, results:results});
			}
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.get("/getUserById", (req, res) => {
	const sql = `SELECT * FROM users WHERE id = ?`;
	const params = [req.query.id];
	try {
	    DatabaseModel.query(sql, params, function (err, results, fields) {
            if (err) {
				res.json({status:1, message:err});
			}
			else {
				res.json({status:0, results:results});
			}
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.post("/UpdateColleagueScorebySN", (req, res) => {
    
	//console.log(req.body.colleague_score);
	//console.log(req.body.serial_number);
	//console.log(req.body.rater_id);
	try {
		const sql = `UPDATE colleague_score_record SET score=? WHERE rater_id=? AND kpi_sn=?`;
		const params = [req.body.colleague_score, req.body.rater_id, req.body.serial_number];
	    DatabaseModel.query(sql, params, function (err, rows, fields) {
            if (err){
		        res.json({"status":1, message:err});
			}
			else {
				res.json({"status":0, message:"更新分數成功"});
			}
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});


//------------------------

router.post("/addPeerEvaluation", (req, res) => {
	let kpi_sn = req.body.kpi_sn;
	let raterId = req.body.rater_id;
	//console.log(kpi_sn);
	//console.log(raterId);

	const sql = `SELECT * FROM colleague_score_record WHERE kpi_sn=? AND rater_id=?`;
	const params = [kpi_sn, raterId];

	DatabaseModel.query(sql, params, function (err, rows, fields) {
		if (err) {
			console.error("查詢錯誤:", err);
			return res.status(500).json({ message: '伺服器錯誤：查詢失敗' });
		}

		if (rows.length === 0) {
			// 呼叫建立新紀錄
			const insertSql = `INSERT INTO colleague_score_record (kpi_sn, rater_id, score) VALUES (?, ?, ?)`;
			const insertParams = [kpi_sn, raterId, 0];

			DatabaseModel.query(insertSql, insertParams, function (insertErr, insertResult) {
				if (insertErr) {
					console.error("插入錯誤:", insertErr);
					return res.json({ status: 2, message: "互評建立失敗" });
				} else {
					return res.json({ status: 0, message: "互評建立成功" });
				}
			});
		} else {
			return res.json({ status: 1, message: "此KPI互評對象已建立" });
		}
	});
});

router.post("/deletePeerEvaluation", (req, res) => {
	let kpi_sn = req.body.kpi_sn;
	let raterId = req.body.rater_id;
	
	
	const sql = `SELECT * FROM colleague_score_record WHERE kpi_sn=? AND rater_id=?`;
	const params = [kpi_sn, raterId];

	DatabaseModel.query(sql, params, function (err, rows, fields) {
		if (err) {
			console.error("查詢錯誤:", err);
			return res.status(500).json({ message: '伺服器錯誤：查詢失敗' });
		}

		if (rows.length === 1) {
			// 呼叫建立新紀錄
			const deleteSql = `DELETE FROM colleague_score_record WHERE kpi_sn=? AND rater_id=?`;
			const deleteParams = [kpi_sn, raterId];

			DatabaseModel.query(deleteSql, deleteParams, function (deleteErr, deleteResult) {
				if (deleteErr) {
					console.error("互評刪除錯誤:", deleteErr);
					return res.json({ status: 2, message: "互評刪除失敗" });
				} else {
					return res.json({ status: 0, message: "互評刪除成功" });
				}
			});
		} else {
			return res.json({ status: 1, message: "刪除對象不存在" });
		}
	});
	
});

//----------------------------------------------------------



module.exports = router;