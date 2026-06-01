var express = require('express');
var router = express.Router();

const DatabaseModel = require('../modules/DBModule.js') //引入module
const DatabaseModelP = require('../modules/DBModuleP.js') //引入module

// 登入處理
router.post('/addkpi2', (req, res) => {
	//input : id, type, item, con1, con2, con3, score, comm1, comm2, comm3, year, month
	try {
        let id = req.body.id;
		let type = req.body.type;
	    let item = req.body.item;
		let con1 = req.body.con1;
		let con2 = req.body.con2;
		let con3 = req.body.con3;
		let score = req.body.score;
		let year = req.body.year;
		let month = req.body.month;
		let comm1 = req.body.comm1;
		let comm2 = req.body.comm2;
		let comm3 = req.body.comm3;
		
		const sql = `INSERT INTO kpi (id, type, item, contribution1, contribution2, contribution3, self_score, comment1, comment2, comment3, supervisor_score, year, month) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
		const params = [id, type, item, con1, con2, con3, score, comm1, comm2, comm3, score, year, month];
	    DatabaseModel.query(sql, params, function (err, rows, fields) {
            if (err){
		        res.json({status:1, message:"新增KPI失敗"});
			}
			else {
				res.json({status:0, message:"新增績效項目成功"});
			}
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.post('/addkpi', (req, res) => {
    try {
        let { id, type, item, con1, con2, con3, score, comm1, comm2, comm3, year, month } = req.body;
        if (!item) {
            return res.json({
                status: 1,
                message: 'item 不得為空'
            });
        }
		
        // 1️先檢查是否已存在 3 筆相同條件
        const checkSql = `SELECT COUNT(*) AS count 
                          FROM kpi 
                          WHERE id = ? AND year = ? AND month = ? AND type = ?`;
        const checkParams = [id, year, month, type];

        DatabaseModel.query(checkSql, checkParams, (err, results) => {
            if (err) {
                console.error("查詢錯誤:", err);
                return res.json({ status: 1, message: "資料庫查詢失敗" });
            }
			
            if (results[0].count >= 3) {
                // 超過3筆 → 不允許新增
                return res.json({
                    status: 1,
                    message: `此類型「${type}」已存在 3 筆，無法再新增`
                });
            }
			
            // 2️未超過 → 執行新增
            const insertSql = `INSERT INTO kpi
                (id, type, item, contribution1, contribution2, contribution3, self_score,
                 comment1, comment2, comment3, supervisor_score, year, month)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const insertParams = [
                id, type, item, con1, con2, con3, score,
                comm1, comm2, comm3, score, year, month
            ];

            DatabaseModel.query(insertSql, insertParams, (err, rows) => {
                if (err) {
                    console.error("新增錯誤:", err);
                    return res.json({ status: 1, message: "新增KPI失敗" });
                }

                return res.json({ status: 0, message: "新增績效項目成功" });
            });
        });

    } catch (error) {
        console.error("例外錯誤:", error);
        return res.status(500).json({ message: "伺服器錯誤" });
    }
});

router.post("/searchKPIbyIDYYMM", (req, res) => {
	//input : id, year, month
	
	try {
		const id = req.body.id;
		const year = req.body.year;
		const month = req.body.month
		
		const sql = `SELECT * FROM kpi WHERE id = ? AND year = ? AND month = ?`;
		const params = [id, year, month];
		DatabaseModel.query(sql, params, (err, results) => {
			if (err) {
				res.json({status:1, message:"查詢KPI失敗"});
			}
			else {
				res.json({status:0, message:"查詢KPI成功", evaluations:results});
			}
			
		});
	}
	catch (error) {
		res.json({status:1, message:"查詢KPI失敗"});
	}
});

router.post("/updateKPIbySN", (req, res) => {
	//input : serial_number, item, con1, con2, con3, com1, com2, com3, score
	
	const sql = `UPDATE kpi SET item=?, contribution1=?, contribution2=?, contribution3=?, self_score=?, supervisor_score=?, comment1=?, comment2=?, comment3=? WHERE serial_number=?`;
	const params = [req.body.item, req.body.con1, req.body.con2, req.body.con3, req.body.score, req.body.score, req.body.com1, req.body.com2, req.body.com3, req.body.serial_number];
    try {
	    DatabaseModel.query(sql, params, function (err, rows, fields) {
            if (err) {
		        res.json({status:1, message:err});
				//console.log(err);
			}
			else {
				res.json({status:0, message:"更新成功"});
			}
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.post("/updateCommentbySN", (req, res) => {
	//input : serial_number, comment1, comment2, comment3, supervisor_score
	
	const sql = `UPDATE kpi SET comment1=?, comment2=?, comment3=?, supervisor_score=? WHERE serial_number=?`;
	const params = [req.body.comment1, req.body.comment2, req.body.comment3, req.body.supervisor_score, req.body.serial_number];
    try {
	    DatabaseModel.query(sql, params, function (err, rows, fields) {
            if (err) {
				//console.log(err);
		        res.json({status:1, message:err});
			}
			else {
				res.json({status:0, message:"更新成功"});
			}
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.post("/deleteKPIbySN", (req, res) => {
    //input: serial_number
	const sql = `DELETE FROM kpi WHERE serial_number=?`;
	const params = [req.body.serial_number];
	
    try {
	    DatabaseModel.query(sql, params, function (err, rows, fields) {
            if (err) {
				res.json({status:1, message:err});
			}
			else {
				res.json({status:0, message:"刪除成功"});
			}
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.post("/deleteKPIbyIdAndTime", (req, res) => {
    //input: id, year, month
	const sql = `DELETE FROM kpi WHERE id=? AND year=? AND month=?`;
	const params = [req.body.id, req.body.year, req.body.month];
	
    try {
	    DatabaseModel.query(sql, params, function (err, rows, fields) {
            if (err) {
				res.json({status:1, message:err});
			}
			else {
				res.json({status:0, message:"刪除成功"});
			}
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.get("/getKPIbyIDYYMM", (req, res) => {
    //console.log(req.query.id);
	//console.log(req.query.year);
	//console.log(req.query.month);
	
	const sql = `SELECT * FROM kpi WHERE id = ? AND year = ? AND month = ?`;
	const params = [req.query.id, req.query.year, req.query.month];
	try {
		DatabaseModel.query(sql, params,  (err, results) => {
			if (err) {
				res.json({status:1, message:err});
			}
			else {
				res.json({status:0, records:results});
			}
		});
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

router.post("/getKPIandComment", async(req, res) => {
	try {
		const { id, year, month } = req.body;
		console.log(id);
		console.log(year);
		console.log(month);
		if (!id  || !year || !month) {
		    return res.status(400).json({ error: "請提供 id, year, month" });
		}
		
		// 1. 查詢年度KPI
	    const sql = `SELECT * FROM kpi WHERE id = ? AND year = ? AND month = ?`;
		const [kpis] = await DatabaseModelP.query(
		    sql,
		    [id, year, month]
		);
		
		// 1. 查詢年度AI評語
	    const sql2 = `SELECT * FROM ai_comment WHERE id = ? AND year = ? AND month = ?`;
		const [comment] = await DatabaseModelP.query(
		    sql2,
		    [id, year, month]
		);

		res.json({ kpis:kpis, comment: comment });
	} catch (err) {
		console.error("查詢錯誤:", err);
		res.status(500).json({ error: "資料庫錯誤" });
	}
});

router.get("/getPeerRecordBySN", (req, res) => {
	const sql = `SELECT colleague_score_record.*, users.name FROM colleague_score_record JOIN users ON colleague_score_record.rater_id = users.id  WHERE kpi_sn=?`;
	const params = [req.query.kpisn];
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

router.get("/getKPIbySN", (req, res) => {
	const sql = `SELECT * FROM kpi WHERE serial_number = ? `;
	const params = [req.query.sn];
	//console.log(req.query.sn);
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

/**
1.先比 KPI 主管總分（高 → 低）
2.若同分，再比 ai_comment.wordCount（高 → 低）
3.ai_comment 以 同一個 id + year + month 對應

因此 summary 查詢必須：
1.LEFT JOIN ai_comment
2.把 wordCount 一起選出
3.排序條件改成 兩層 ORDER BY
**/
router.post("/getEmployeeScores", async (req, res) => {
  try {
    const { ids, year, month } = req.body;

    if (!ids || ids.length === 0 || !year || !month) {
      return res.status(400).json({ error: "請提供 ids, year, month" });
    }

    const placeholders = ids.map(() => "?").join(","); // "?,?,?"

    // === A 類員工 summary ===
	/**
	語法                                                     說明
	LEFT JOIN ai_comment	                                避免沒有 ai_comment 資料的員工被排除
    COALESCE(ac.wordCount, 0)	                            沒資料時當作 0 分
    GROUP BY ... ac.wordCount	                            MySQL 在 ONLY_FULL_GROUP_BY 下必須
    ORDER BY total_supervisor_score DESC, wordCount DESC	同分再比字數
	**/
	const sqlSummaryA = `
	  SELECT 
		k.id,
		u.name,
		SUM(k.supervisor_score) AS total_supervisor_score,
		COALESCE(ac.wordCount, 0) AS wordCount
	  FROM kpi k
	  JOIN users u 
		ON k.id = u.id
	  LEFT JOIN ai_comment ac
		ON ac.id = k.id
	   AND ac.year = k.year
	   AND ac.month = k.month
	  WHERE k.id IN (${placeholders})
		AND k.year = ?
		AND k.month = ?
		AND u.class = 'A'
	  GROUP BY k.id, u.name, ac.wordCount
	  ORDER BY 
		total_supervisor_score DESC,
		wordCount DESC;
	`;

    const [summaryA] = await DatabaseModelP.query(sqlSummaryA, [...ids, year, month]);

    // === B 類員工 summary ===
	const sqlSummaryB = `
	  SELECT 
		k.id,
		u.name,
		SUM(k.supervisor_score) AS total_supervisor_score,
		COALESCE(ac.wordCount, 0) AS wordCount
	  FROM kpi k
	  JOIN users u 
		ON k.id = u.id
	  LEFT JOIN ai_comment ac
		ON ac.id = k.id
	   AND ac.year = k.year
	   AND ac.month = k.month
	  WHERE k.id IN (${placeholders})
		AND k.year = ?
		AND k.month = ?
		AND u.class = 'B'
	  GROUP BY k.id, u.name, ac.wordCount
	  ORDER BY 
		total_supervisor_score DESC,
		wordCount DESC;
	`;

    const [summaryB] = await DatabaseModelP.query(sqlSummaryB, [...ids, year, month]);

    // === A 類員工 details ===
    const sqlDetailsA = `
      SELECT k.id, u.name, u.class, k.type, k.item, 
             k.contribution1, k.contribution2, k.contribution3, 
             k.supervisor_score, k.year, k.month
      FROM kpi k
      JOIN users u ON u.id = k.id
      WHERE k.id IN (${placeholders}) 
        AND k.year = ? 
        AND k.month = ? 
        AND u.class = 'A';
    `;
    const [detailsA] = await DatabaseModelP.query(sqlDetailsA, [...ids, year, month]);

    // === B 類員工 details ===
    const sqlDetailsB = `
      SELECT k.id, u.name, u.class, k.type, k.item, 
             k.contribution1, k.contribution2, k.contribution3, 
             k.supervisor_score, k.year, k.month
      FROM kpi k
      JOIN users u ON u.id = k.id
      WHERE k.id IN (${placeholders}) 
        AND k.year = ? 
        AND k.month = ? 
        AND u.class = 'B';
    `;
    const [detailsB] = await DatabaseModelP.query(sqlDetailsB, [...ids, year, month]);

    //
	const sqlAIComment = `
      SELECT ac.id, u.name, ac.comment, ac.selfEvaluation
      FROM ai_comment ac
      JOIN users u ON u.id = ac.id
      WHERE ac.id IN (${placeholders}) 
        AND ac.year = ? 
        AND ac.month = ? 
    `;
    const [commentAll] = await DatabaseModelP.query(sqlAIComment, [...ids, year, month]);
    
    // === 依 summary 排序 details ===
    const sortedDetailsA = [];
    summaryA.forEach(emp => {
      const empDetails = detailsA.filter(d => d.id === emp.id);
      sortedDetailsA.push(...empDetails);
    });

    const sortedDetailsB = [];
    summaryB.forEach(emp => {
      const empDetails = detailsB.filter(d => d.id === emp.id);
      sortedDetailsB.push(...empDetails);
    });

    // === 回傳結果 ===
    res.json({
      summaryA,
      summaryB,
      detailsA: sortedDetailsA,
      detailsB: sortedDetailsB,
      commentAll
    });
  } catch (err) {
    console.error("查詢錯誤:", err);
    res.status(500).json({ error: "資料庫錯誤" });
  }
});


router.post("/getEmployeeScores__", async (req, res) => {
  try {
    const { ids, year, month } = req.body;

    if (!ids || ids.length === 0 || !year || !month) {
      return res.status(400).json({ error: "請提供 ids, year, month" });
    }

    const placeholders = ids.map(() => "?").join(","); // "?,?,?"

    // === A 類員工 summary ===
    const sqlSummaryA = `
      SELECT k.id, u.name, SUM(k.supervisor_score) AS total_supervisor_score
      FROM kpi k
      JOIN users u ON k.id = u.id
      WHERE k.id IN (${placeholders}) 
        AND k.year = ? 
        AND k.month = ? 
        AND u.class = 'A'
      GROUP BY k.id, u.name
      ORDER BY total_supervisor_score DESC;
    `;
    const [summaryA] = await DatabaseModelP.query(sqlSummaryA, [...ids, year, month]);

    // === B 類員工 summary ===
    const sqlSummaryB = `
      SELECT k.id, u.name, SUM(k.supervisor_score) AS total_supervisor_score
      FROM kpi k
      JOIN users u ON k.id = u.id
      WHERE k.id IN (${placeholders}) 
        AND k.year = ? 
        AND k.month = ? 
        AND u.class = 'B'
      GROUP BY k.id, u.name
      ORDER BY total_supervisor_score DESC;
    `;
    const [summaryB] = await DatabaseModelP.query(sqlSummaryB, [...ids, year, month]);

    // === A 類員工 details ===
    const sqlDetailsA = `
      SELECT k.id, u.name, u.class, k.type, k.item, 
             k.contribution1, k.contribution2, k.contribution3, 
             k.supervisor_score, k.year, k.month
      FROM kpi k
      JOIN users u ON u.id = k.id
      WHERE k.id IN (${placeholders}) 
        AND k.year = ? 
        AND k.month = ? 
        AND u.class = 'A';
    `;
    const [detailsA] = await DatabaseModelP.query(sqlDetailsA, [...ids, year, month]);

    // === B 類員工 details ===
    const sqlDetailsB = `
      SELECT k.id, u.name, u.class, k.type, k.item, 
             k.contribution1, k.contribution2, k.contribution3, 
             k.supervisor_score, k.year, k.month
      FROM kpi k
      JOIN users u ON u.id = k.id
      WHERE k.id IN (${placeholders}) 
        AND k.year = ? 
        AND k.month = ? 
        AND u.class = 'B';
    `;
    const [detailsB] = await DatabaseModelP.query(sqlDetailsB, [...ids, year, month]);

    // === 依 summary 排序 details ===
    const sortedDetailsA = [];
    summaryA.forEach(emp => {
      const empDetails = detailsA.filter(d => d.id === emp.id);
      sortedDetailsA.push(...empDetails);
    });

    const sortedDetailsB = [];
    summaryB.forEach(emp => {
      const empDetails = detailsB.filter(d => d.id === emp.id);
      sortedDetailsB.push(...empDetails);
    });

    // === 回傳結果 ===
    res.json({
      summaryA,
      summaryB,
      detailsA: sortedDetailsA,
      detailsB: sortedDetailsB
    });
  } catch (err) {
    console.error("查詢錯誤:", err);
    res.status(500).json({ error: "資料庫錯誤" });
  }
});


//----------------------------------------------------------



module.exports = router;
