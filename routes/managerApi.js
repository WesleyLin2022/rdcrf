var express = require('express');
var router = express.Router();

const DatabaseModel = require('../modules/DBModule.js') //引入module


router.get('/getSubordinatesById', (req, res) => {
    let id = req.query.id;
	
	getUserBySupeID(id, (err, result) => {
        if (err) {
            res.json({"status":1, "msg":"change fail"});
		
        } else {
            //console.log('KPI Data:', result);
		    res.json({status:0, employees:result});
        }
    });

});

/**
 * 遞迴查詢所有下屬 ID（使用 Callback）
 */
function getAllSubordinates(userId, callback) {
    let subordinates = new Set([userId]); // 包含自己
    let queue = [userId];  // BFS 遍歷
    
    function processQueue() {
        if (queue.length === 0) {
			subordinates.delete(userId); // 排除自己
            return callback(null, Array.from(subordinates)); // 完成，返回結果
        }

        let currentId = queue.shift();
        let sql = 'SELECT id FROM users WHERE supervisor_id = ?';
        DatabaseModel.query(
            sql,
            [currentId],
            (err, results) => {
                if (err) return callback(err, null); // 錯誤處理

                results.forEach(row => {
                    if (!subordinates.has(row.id)) {
                        subordinates.add(row.id);
                        queue.push(row.id);
						
                    }
                });

                processQueue(); // 遞迴繼續處理隊列
            }
        );
    }

    processQueue();
}

function getUserBySupeID(userId, callback) {
    getAllSubordinates(userId, (err, subordinateIds) => {
        if (err) {
            console.error('Error fetching subordinates:', err);
            return callback(err, null);
        }

        if (subordinateIds.length === 0) {
            return callback(null, []); // 沒有下屬，直接回傳空數組
        }

        let placeholders = subordinateIds.map(() => '?').join(', ');
        //let query = `SELECT * FROM kpi WHERE user_id IN (${placeholders})`;
		let query = `SELECT * FROM users WHERE id IN (${placeholders})`;

        DatabaseModel.query(query, subordinateIds, (err, results) => {
            if (err) {
                console.error('Error fetching KPI data:', err);
                return callback(err, null);
            }
            callback(null, results);
        });
    });
}

router.post("/UpdateSScorebySN", (req, res) => {
    //input : serial_number, supervisor_socre
	console.log(req.body.supervisor_score);
	console.log(req.body.serial_number);
	try {
		const sql = `UPDATE kpi SET supervisor_score=? WHERE serial_number=?`;
		const params = [req.body.supervisor_score, req.body.serial_number];
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

//---------------------------------------





module.exports = router;