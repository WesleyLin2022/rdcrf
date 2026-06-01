var express = require('express');
var jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
var router = express.Router();

const DatabaseModel = require('../modules/DBModule.js') //引入module

// 郵件發送配置

/*
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: `miqaiantenna@gmail.com`,
        pass: `grokxvhzkhtdovlk` // 使用應用程式密碼，不要用 Gmail 原本密碼
    }
});
*/



const secretKey = 'I_am_the_secret_key'; //JWT key


// 登入處理
router.post('/login', (req, res) => {
	try {
        var id = req.body.id;
	    var pwd = req.body.password;
	
	    DatabaseModel.query('SELECT * FROM users where id=? and password=?',[id, pwd], function (err, rows, fields) {
            if (err) {
		        throw err;
		    }
            if (rows.length == 1){
			    const token = jwt.sign({ "id": rows[0].id, "email": rows[0].email }, secretKey, { expiresIn: 600 });
			    res.json({ token });
			
		    }//end of if (rows.length == 1)
		    else {
                res.json({"status":1, "msg":"login fail"});
            } //end of rows.length !=1
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
});

// 登入者判斷
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: '未提供 Token' });

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Token 無效' });
        req.user = decoded;
        next();
    });
};

router.get('/checkId', verifyToken, (req, res) => {
    res.json({ message: '這是受保護的 API', user: req.user });
});

// 驗證 token（給 AI everyOne Web 呼叫）
router.post('/verify', (req, res) => {
    const token = req.body.token;
    
    if (!token) {
        return res.json({ valid: false, message: '未提供 token' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.json({ valid: false, message: 'token 無效' });
        }
        res.json({
            valid: true,
            user: decoded
        });
    });
});

// 修改密碼處理
router.post('/changePassword', function(req, res, next) {
	const id = req.body.id;
	const Opwd = req.body.oldPassword;
	const NPwd = req.body.newPassword;
	try {
	    DatabaseModel.query('SELECT * FROM users where id=? and password=?',[id, Opwd], function (err, rows, fields) {
            if (err)
		        throw err;
            if (rows.length == 1){
			    change();
		    }//end of if (rows.length == 1)
		    else {
                res.json({"status":1, "msg":"change fail"});
            } //end of rows.length != 1
        });
	}
	catch (error) {
		res.status(500).json({ message: '伺服器錯誤' });
	}
	
	function change() {
		DatabaseModel.query('UPDATE users SET password=? where id=? ',[NPwd, id], function (err, rows, fields) {
            if (err) {
                res.json({"status":2, "msg":"change fail"});
            }
	        else {
		        res.json({"status":0, "msg":"change success"});
		    }
        });
	}//end of change()
});

// 忘記密碼處理
router.post('/forgot-password', function(req, res, next) {
    try {
        const id = req.body.id;
        DatabaseModel.query('SELECT * FROM users where id=? ',[id], function (err, rows, fields) {
            if (err)
		        throw err;
            if (rows.length == 1){
			    sendemail(rows[0]);
		    }//end of if (rows.length == 1)
		    else {
                res.json({"status":1, "msg":"query fail"});
            } //end of rows.length != 1
        });
        
        
    } catch (error) {
        res.status(500).json({ message: '伺服器錯誤' });
    }
	function sendemail(data) {
        // 建立一個 transporter 物件來發送郵件
        // 這裡的服務器設定可以根據你的郵件服務提供商做調整
        const transporter = nodemailer.createTransport({
            host: 'relay.quanta.corp', // 例如 'smtp.gmail.com'
            port: 587,
            secure: false, // 因為 port 587 通常使用 STARTTLS，所以這裡設為 false
            auth: {
                user: 'wesley.lin@quantatw.com', // 你的電子郵件地址
                pass: 'Cvbnmghjkl098765' // 你的電子郵件密碼
            },
            tls: {
                // 忽略 SSL 憑證驗證，在測試環境中可能會用到
               // 在正式環境中，建議不要使用這個選項
                rejectUnauthorized: false
            }
        });
		const mailOptions = {
            from: `"RDCRF Web Administrator"`,
            to: `${data.email}`,
            subject: `忘記"RDCRF-Web"密碼，系統發送信件"`,
            text: `您的密碼是: ${data.password} \n(此為系統自動發出，請勿直接回信)`
        };
		transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                res.json({"status":2, "msg":"send fail"});
            } else {
                res.json({"status":0, "msg":"send success"});
            }
        });
	}
});

// 🟢 取得當前使用者的 KPI
router.get("/kpi", (req, res) => {
    const user_id = req.query.id;
	console.log(req.query);
    DatabaseModel.query("SELECT * FROM kpi WHERE user_id = ?", [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 🟢 新增 KPI
router.post("/addkpi", (req, res) => {
    const { user_id, description, self_score } = req.body;
    const sql = "INSERT INTO kpi (user_id, description, self_score) VALUES (?, ?, ?)";
    DatabaseModel.query(sql, [user_id, description, self_score], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "KPI 已新增" });
    });
});




router.post('/testsearch', (req, res) => {
    var id = req.body.id;
	
	
	getKpiByUser(id, (err, result) => {
        if (err) {
            res.json({"status":1, "msg":"change fail"});
		
        } else {
            console.log('KPI Data:', result);
		    res.json(result);
        }
    });

});

router.get('/get-keys', (req, res) => {
	
	res.json(["F7F", "abcdefg", "brhexh", "eeeeggg"]);

});

/**
 * 遞迴查詢所有下屬 ID（使用 Callback）
 */
function getAllSubordinates(userId, callback) {
    let subordinates = new Set([userId]); // 包含自己
    let queue = [userId];  // BFS 遍歷
    
    function processQueue() {
        if (queue.length === 0) {
            return callback(null, Array.from(subordinates)); // 完成，返回結果
        }

        let currentId = queue.shift();
        
        DatabaseModel.query(
            'SELECT id FROM users WHERE supervisor_id = ?',
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

/**
 * 查詢 KPI，根據 `owner_id IN (...)` 查找
 */
function getKpiByUser(userId, callback) {
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
		let query = `SELECT kpi.*, users.username FROM kpi JOIN users ON kpi.user_id = users.id WHERE user_id IN (${placeholders})`;

        DatabaseModel.query(query, subordinateIds, (err, results) => {
            if (err) {
                console.error('Error fetching KPI data:', err);
                return callback(err, null);
            }
            callback(null, results);
        });
    });
}

//excel 處理
const multer = require('multer');
const XLSX = require('xlsx');
const upload = multer({ dest: 'uploads/' });
router.post('/read-excel', upload.single('file'), (req, res) => {
    try {
        const workbook = XLSX.readFile(req.file.path);
        
        // 讀取 Import_ANT sheet
        const antSheet = workbook.Sheets['Import_ANT'];
        const antData = processANTSheet(antSheet);
        
        // 讀取 Import_NRE sheet
        const nreSheet = workbook.Sheets['Import_NRE'];
        const nreData = processNRESheet(nreSheet);
        
        res.json({
            antData,
            nreData
        });
    } catch (error) {
        console.error('Excel處理錯誤:', error);
        res.status(500).json({ error: '檔案處理失敗' });
    }
});

function processANTSheet(sheet) {
    // 獲取工作表範圍
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const merges = sheet['!merges'] || [];
    
    // 處理表頭（第一、二列）
    const headers = [];
    const subHeaders = [];
    
    // 處理合併儲存格的表頭
    for (let C = 0; C <= range.e.c; C++) {
        const cellAddress1 = XLSX.utils.encode_cell({r: 0, c: C});
        const cellAddress2 = XLSX.utils.encode_cell({r: 1, c: C});
        
        const cell1 = sheet[cellAddress1];
        const cell2 = sheet[cellAddress2];
        
        // 檢查是否為合併儲存格
        const merge = merges.find(m => 
            m.s.r === 0 && m.s.c === C
        );
        
        if (merge) {
            headers.push({
                text: cell1 ? cell1.v : '',
                merged: true,
                colspan: merge.e.c - merge.s.c + 1
            });
            C = merge.e.c; // 跳過合併的欄位
        } else {
            headers.push({
                text: cell1 ? cell1.v : '',
                merged: false,
                colspan: 1
            });
        }
        
        subHeaders.push(cell2 ? cell2.v : '');
    }
    
    // 處理資料列
    const rows = [];
    for (let R = 2; R <= range.e.r; R++) {
        const row = [];
        for (let C = 0; C <= range.e.c; C++) {
            const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
            const cell = sheet[cellAddress];
            
            // 檢查是否為合併儲存格
            const merge = merges.find(m => 
                m.s.r === R && m.s.c === C
            );
            
            if (merge) {
                row.push({
                    text: cell ? cell.v : '',
                    rowspan: merge.e.r - merge.s.r + 1,
                    colspan: merge.e.c - merge.s.c + 1
                });
                C = merge.e.c; // 跳過合併的欄位
            } else {
                // 檢查是否為超連結
                if (C === range.e.c) { // 最後一欄
                    row.push({
                        text: cell ? cell.v : '',
                        isLink: true,
                        filePath: cell ? cell.l?.Target : ''
                    });
                } else {
                    row.push(cell ? cell.v : '');
                }
            }
        }
        rows.push(row);
    }
    
    return { headers, subHeaders, rows };
}

function processNRESheet(sheet) {
    // 類似 processANTSheet 的實現，但根據 NRE 表格的特定結構
    // ... NRE sheet 處理邏輯 ...
}

module.exports = router;
